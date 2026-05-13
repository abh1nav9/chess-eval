"""
Analysis service — business logic orchestrator.
Sits between API routes and the analysis pipeline/repository layers.
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from app.analysis.pipeline import AnalysisPipeline, GAME_ANALYSIS_DEPTH
from app.analysis.pgn_parser import validate_pgn_playthrough
from app.core.config import get_settings
from app.core.exceptions import (
    AnalysisNotFoundError,
    EngineError,
    InvalidFENError,
    InvalidPGNError,
)
from app.db.repositories import AnalysisRepository, PositionCacheRepository, PgnContentRepository
from app.db.move_index_repository import MoveIndexRepository
from app.analysis.move_index_builder import MoveIndexBuilder
from app.engine.types import EngineConfig
from app.engine.stockfish import StockfishEngine
from app.models.analysis import AnalysisDocument, PositionCacheDocument
from app.utils.fen import validate_fen, fen_to_hash
from app.utils.pgn_hash import pgn_sha256
from app.core.websocket import manager
from app.schemas.ws_events import CompletedEvent, FailedEvent

logger = logging.getLogger(__name__)


class AnalysisService:
    """High-level service for managing chess analyses."""

    _shared_engine: Optional[StockfishEngine] = None
    _shared_engine_lock: asyncio.Lock = asyncio.Lock()
    _job_semaphore: Optional[asyncio.Semaphore] = None

    @classmethod
    def configure_shared_engine(cls, engine: Optional[StockfishEngine]) -> None:
        """Called from FastAPI lifespan: reuse one Stockfish process for PGN/FEN when set."""
        cls._shared_engine = engine
        n = get_settings().MAX_CONCURRENT_ANALYSES
        cls._job_semaphore = asyncio.Semaphore(max(1, n))

    def __init__(self):
        settings = get_settings()
        eff_depth = min(settings.STOCKFISH_DEPTH, settings.MAX_ANALYSIS_DEPTH)
        mt = settings.STOCKFISH_MOVETIME
        self.engine_config = EngineConfig(
            path=settings.STOCKFISH_PATH,
            depth=eff_depth,
            movetime=mt if mt > 0 else None,
            max_movetime_ms=settings.STOCKFISH_MAX_MOVETIME_MS if settings.STOCKFISH_MAX_MOVETIME_MS > 0 else None,
            threads=settings.STOCKFISH_THREADS,
            hash_mb=settings.STOCKFISH_HASH_MB,
            multi_pv=settings.STOCKFISH_MULTIPV,
        )
        self.pipeline = AnalysisPipeline(self.engine_config)

    def _sem(self) -> asyncio.Semaphore:
        if AnalysisService._job_semaphore is None:
            AnalysisService._job_semaphore = asyncio.Semaphore(
                max(1, get_settings().MAX_CONCURRENT_ANALYSES)
            )
        return AnalysisService._job_semaphore

    async def create_pgn_analysis(
        self,
        pgn: str,
        depth: int | None = None,
        background_tasks: Any = None,
    ) -> Dict[str, Any]:
        """Analyze a full PGN game asynchronously."""
        import uuid

        settings = get_settings()
        if len(pgn.encode("utf-8")) > settings.MAX_PGN_SIZE_KB * 1024:
            raise InvalidPGNError("PGN exceeds maximum size", status_code=400)

        ok, err = validate_pgn_playthrough(pgn)
        if not ok:
            raise InvalidPGNError(err or "Invalid PGN", status_code=422)

        pgn_h = pgn_sha256(pgn)
        try:
            await PgnContentRepository.upsert(pgn_h, pgn)
        except Exception:
            pass

        analysis_id = str(uuid.uuid4())
        analysis_depth = depth or GAME_ANALYSIS_DEPTH

        initial_doc = AnalysisDocument(
            analysis_id=analysis_id,
            pgn_hash=pgn_h,
            pgn=pgn,
            depth=analysis_depth,
            status="processing",
        )

        await AnalysisRepository.create(initial_doc)

        if background_tasks:
            background_tasks.add_task(self._run_background_analysis, pgn, analysis_id, depth)
        else:
            asyncio.create_task(self._run_background_analysis(pgn, analysis_id, depth))

        async def initial_broadcast() -> None:
            await asyncio.sleep(0.5)
            await manager.broadcast_progress(
                analysis_id,
                {
                    "type": "progress",
                    "move_index": 0,
                    "total_moves": 0,
                    "percentage": 0,
                    "status": "Initializing engine...",
                },
            )

        asyncio.create_task(initial_broadcast())

        return initial_doc.model_dump()

    async def _run_background_analysis(
        self,
        pgn: str,
        analysis_id: str,
        depth: int | None = None,
    ) -> None:
        settings = get_settings()
        structlog_bound = False
        if settings.STRUCTLOG_JSON:
            try:
                import structlog

                structlog.contextvars.bind_contextvars(analysis_id=analysis_id)
                structlog_bound = True
            except Exception:
                pass
        try:
            async with self._sem():
                shared = self._shared_engine
                try:
                    if shared is not None:
                        async with self._shared_engine_lock:
                            doc = await self.pipeline.analyze_pgn(
                                pgn, analysis_id, depth=depth, shared_engine=shared
                            )
                    else:
                        doc = await self.pipeline.analyze_pgn(
                            pgn, analysis_id, depth=depth, shared_engine=None
                        )

                    await AnalysisRepository.update(analysis_id, doc.model_dump())
                    try:
                        rows = MoveIndexBuilder.build_rows(doc)
                        await MoveIndexRepository.replace_for_analysis(analysis_id, rows)
                    except Exception as idx_err:
                        logger.warning("Move index write failed for %s: %s", analysis_id, idx_err)
                    await manager.broadcast(
                        analysis_id,
                        CompletedEvent(
                            analysis_id=analysis_id,
                            result=doc.model_dump(mode="json"),
                        ),
                    )
                    logger.info("Background analysis completed: %s", analysis_id)
                    if settings.STRUCTLOG_JSON:
                        try:
                            import structlog

                            structlog.get_logger().info(
                                "analysis_completed",
                                analysis_id=analysis_id,
                                moves=len(doc.moves),
                            )
                        except Exception:
                            pass
                except Exception as e:
                    logger.error("Error in background analysis %s: %s", analysis_id, e, exc_info=True)
                    await AnalysisRepository.update_status(
                        analysis_id, "failed", error=str(e)[:4000]
                    )
                    await manager.broadcast(
                        analysis_id,
                        FailedEvent(analysis_id=analysis_id, error=str(e)[:2000]),
                    )
        finally:
            if structlog_bound:
                try:
                    import structlog

                    structlog.contextvars.unbind_contextvars("analysis_id")
                except Exception:
                    pass

    async def create_fen_analysis(
        self,
        fen: str,
        num_lines: int = 3,
    ) -> Dict[str, Any]:
        """Analyze a single FEN position."""
        if not validate_fen(fen):
            raise InvalidFENError(
                "Invalid FEN string. Please provide a valid chess position."
            )

        fen_hash = fen_to_hash(fen)
        target_depth = self.engine_config.depth

        cached = await PositionCacheRepository.get_cached(fen_hash, min_depth=target_depth)
        if cached:
            logger.info("Cache hit for FEN: %s", fen_hash)

        try:
            shared = self._shared_engine
            if shared is not None:
                async with self._shared_engine_lock:
                    result = await self.pipeline.analyze_fen(
                        fen, depth=None, num_lines=num_lines, shared_engine=shared
                    )
            else:
                result = await self.pipeline.analyze_fen(
                    fen, depth=None, num_lines=num_lines, shared_engine=None
                )

            try:
                top_eval = result.get("eval", 0)
                cache_doc = PositionCacheDocument(
                    fen_hash=fen_hash,
                    fen=fen,
                    depth=result.get("depth", target_depth),
                    eval_cp=int(top_eval * 100),
                    eval_type="mate" if result.get("mate_in") else "cp",
                    best_move=result.get("best_move_uci", ""),
                    pv=result.get("pv", []),
                    mate_in=result.get("mate_in"),
                )
                await PositionCacheRepository.cache_position(cache_doc)
            except Exception as exc:
                logger.warning("Failed to cache position: %s", exc)

            return result

        except ValueError as e:
            raise InvalidFENError(str(e))
        except RuntimeError as e:
            raise EngineError(str(e))

    async def get_analysis(self, analysis_id: str) -> Dict[str, Any]:
        doc = await AnalysisRepository.get_by_id(analysis_id)
        if doc is None:
            raise AnalysisNotFoundError(analysis_id)
        return doc

    async def delete_analysis(self, analysis_id: str) -> bool:
        try:
            await MoveIndexRepository.delete_for_analysis(analysis_id)
        except Exception:
            pass
        return await AnalysisRepository.delete(analysis_id)

    async def reanalyze_from_stored(self, analysis_id: str, background_tasks: Any) -> Dict[str, Any]:
        doc = await AnalysisRepository.get_by_id(analysis_id)
        if doc is None:
            raise AnalysisNotFoundError(analysis_id)
        pgn = doc.get("pgn") or ""
        if not pgn.strip():
            raise InvalidPGNError("Stored analysis has no PGN")
        return await self.create_pgn_analysis(pgn=pgn, depth=doc.get("depth"), background_tasks=background_tasks)

    async def create_bulk_pgn_jobs(
        self,
        raw: bytes,
        background_tasks: Any,
    ) -> Dict[str, Any]:
        import io

        import chess.pgn

        text = raw.decode("utf-8", errors="replace")
        buf = io.StringIO(text)
        pgns: list[str] = []
        while True:
            g = chess.pgn.read_game(buf)
            if g is None:
                break
            exp = chess.pgn.StringExporter(headers=True, variations=False)
            pgns.append(str(g.accept(exp)))
        if not pgns:
            raise InvalidPGNError("No games found in PGN file", status_code=422)
        ids: list[str] = []
        for pgn in pgns[:25]:
            ok, err = validate_pgn_playthrough(pgn)
            if not ok:
                continue
            try:
                r = await self.create_pgn_analysis(
                    pgn=pgn,
                    background_tasks=background_tasks,
                )
                ids.append(r["analysis_id"])
            except InvalidPGNError:
                continue
        if not ids:
            raise InvalidPGNError("No valid games could be queued", status_code=422)
        return {"analysis_ids": ids, "count": len(ids)}

    async def list_analyses(
        self,
        limit: int = 20,
        skip: int = 0,
        before: Optional[str] = None,
    ) -> Dict[str, Any]:
        anchor: Optional[datetime] = None
        if before:
            anchor = await AnalysisRepository.get_created_at_for_analysis(before)
            if anchor is None:
                total = await AnalysisRepository.count()
                return {
                    "items": [],
                    "total": total,
                    "page": 1,
                    "page_size": limit,
                    "has_more": False,
                    "next_cursor": None,
                }
        analyses = await AnalysisRepository.list_recent(
            limit=limit,
            skip=0 if before else skip,
            before_created_at=anchor,
        )
        total = await AnalysisRepository.count()
        using_cursor = bool(before and anchor is not None)
        if using_cursor:
            has_more = len(analyses) == limit
        else:
            has_more = skip + len(analyses) < total
        next_cursor = analyses[-1].get("analysis_id") if analyses and has_more else None
        return {
            "items": analyses,
            "total": total,
            "page": skip // limit + 1 if limit > 0 else 1,
            "page_size": limit,
            "has_more": has_more,
            "next_cursor": next_cursor,
        }
