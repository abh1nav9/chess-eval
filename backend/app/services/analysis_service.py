"""
Analysis service — business logic orchestrator.
Sits between API routes and the analysis pipeline/repository layers.
"""

import logging
from typing import Any, Dict

from app.analysis.pipeline import AnalysisPipeline, GAME_ANALYSIS_DEPTH
from app.core.config import get_settings
from app.core.exceptions import (
    AnalysisNotFoundError,
    EngineError,
    InvalidFENError,
    InvalidPGNError,
)
from app.db.repositories import AnalysisRepository, PositionCacheRepository
from app.engine.types import EngineConfig
from app.models.analysis import AnalysisDocument, PositionCacheDocument
from app.analysis.pgn_parser import validate_pgn
from app.utils.fen import validate_fen, fen_to_hash
from app.core.websocket import manager

logger = logging.getLogger(__name__)


class AnalysisService:
    """High-level service for managing chess analyses."""

    def __init__(self):
        settings = get_settings()
        eff_depth = min(settings.STOCKFISH_DEPTH, settings.MAX_ANALYSIS_DEPTH)
        mt = settings.STOCKFISH_MOVETIME
        self.engine_config = EngineConfig(
            path=settings.STOCKFISH_PATH,
            depth=eff_depth,
            movetime=mt if mt > 0 else None,
            threads=settings.STOCKFISH_THREADS,
            hash_mb=settings.STOCKFISH_HASH_MB,
            multi_pv=settings.STOCKFISH_MULTIPV,
        )
        self.pipeline = AnalysisPipeline(self.engine_config)

    async def create_pgn_analysis(
        self,
        pgn: str,
        depth: int | None = None,
        background_tasks: Any = None,
    ) -> Dict[str, Any]:
        """Analyze a full PGN game asynchronously.

        Args:
            depth: Optional custom depth (user override). None = default tiered (GAME_ANALYSIS_DEPTH).
        """
        import uuid
        from app.models.analysis import AnalysisDocument

        if not validate_pgn(pgn):
            raise InvalidPGNError("Could not parse the provided PGN. Please check the format.")

        analysis_id = str(uuid.uuid4())
        analysis_depth = depth or GAME_ANALYSIS_DEPTH

        # Create initial pending document
        initial_doc = AnalysisDocument(
            analysis_id=analysis_id,
            pgn=pgn,
            depth=analysis_depth,
            status="processing",
        )
        
        # Save initial doc to DB
        await AnalysisRepository.create(initial_doc)

        # Start background analysis
        if background_tasks:
            background_tasks.add_task(self._run_background_analysis, pgn, analysis_id, depth)
        else:
            import asyncio
            asyncio.create_task(self._run_background_analysis(pgn, analysis_id, depth))
            
        # Send initial broadcast to acknowledge connection
        import asyncio
        async def initial_broadcast():
            await asyncio.sleep(0.5)  # Give WS a moment to connect
            await manager.broadcast_progress(analysis_id, {
                "type": "progress",
                "move_index": 0,
                "total_moves": 0,
                "percentage": 0,
                "status": "Initializing engine..."
            })
        asyncio.create_task(initial_broadcast())

        return initial_doc.model_dump()

    async def _run_background_analysis(
        self,
        pgn: str,
        analysis_id: str,
        depth: int | None = None,
    ):
        """Worker function for background analysis."""
        try:
            doc = await self.pipeline.analyze_pgn(pgn, analysis_id, depth=depth)

            # Update in database
            await AnalysisRepository.update(analysis_id, doc.model_dump())
            
            # Broadcast completion
            await manager.broadcast_progress(analysis_id, {
                "type": "completed",
                "analysis_id": analysis_id,
                "result": doc.model_dump()
            })
            
            logger.info(f"Background analysis completed: {analysis_id}")

        except Exception as e:
            logger.error(f"Error in background analysis {analysis_id}: {e}", exc_info=True)
            # Update status to failed
            await AnalysisRepository.update_status(analysis_id, "failed")
            await manager.broadcast_progress(analysis_id, {
                "type": "failed",
                "analysis_id": analysis_id,
                "error": str(e)
            })

    async def create_fen_analysis(
        self,
        fen: str,
        num_lines: int = 3,
    ) -> Dict[str, Any]:
        """Analyze a single FEN position.

        Returns evaluation, best move, PV, and engine lines.
        Uses server ``STOCKFISH_DEPTH``.
        """
        if not validate_fen(fen):
            raise InvalidFENError(
                "Invalid FEN string. Please provide a valid chess position."
            )

        # Check cache first
        fen_hash = fen_to_hash(fen)
        target_depth = self.engine_config.depth

        cached = await PositionCacheRepository.get_cached(fen_hash, min_depth=target_depth)
        if cached:
            logger.info(f"Cache hit for FEN: {fen_hash}")
            # Still need to run multi-PV for full response
            # Cache only stores single best line

        try:
            result = await self.pipeline.analyze_fen(fen, depth=None, num_lines=num_lines)

            # Cache the result
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
            except Exception as e:
                logger.warning(f"Failed to cache position: {e}")

            return result

        except ValueError as e:
            raise InvalidFENError(str(e))
        except RuntimeError as e:
            raise EngineError(str(e))

    async def get_analysis(self, analysis_id: str) -> Dict[str, Any]:
        """Retrieve a stored analysis by ID."""
        doc = await AnalysisRepository.get_by_id(analysis_id)
        if doc is None:
            raise AnalysisNotFoundError(analysis_id)
        return doc

    async def list_analyses(self, limit: int = 20, skip: int = 0) -> Dict[str, Any]:
        """List recent analyses with pagination."""
        analyses = await AnalysisRepository.list_recent(limit=limit, skip=skip)
        total = await AnalysisRepository.count()
        return {
            "items": analyses,
            "total": total,
            "page": skip // limit + 1 if limit > 0 else 1,
            "page_size": limit,
            "has_more": skip + limit < total,
        }
