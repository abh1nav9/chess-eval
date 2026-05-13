"""
Analysis pipeline orchestrator.
Coordinates PGN parsing, engine evaluation, move classification, and result assembly.
"""

import logging
from datetime import datetime
from typing import List, Optional

import chess

from app.analysis.accuracy import game_accuracy, move_accuracy
from app.analysis.classifier import Classification, MoveClassifier
from app.analysis.game_phase import detect_game_phase
from app.analysis.missed_wins import find_missed_wins
from app.analysis.opening import detect_opening, opening_book_depth
from app.analysis.depth_strategy import resolve_depth_from_swing
from app.analysis.polyglot_book import PolyglotBookProbe
from app.analysis.pgn_parser import ParsedGame, ParsedMove, parse_pgn
from app.analysis.pipeline_helpers import (
    build_book_move_doc,
    cached_to_engine_result,
    extract_game_metadata,
    uci_to_san,
    uci_to_san_list,
)
from app.db.repositories import PositionCacheRepository
from app.engine.stockfish import StockfishEngine
from app.engine.types import EngineConfig, EngineResult, EngineScore
from app.models.analysis import (
    AnalysisDocument,
    AnalysisSummaryDocument,
    MoveDocument,
    PositionCacheDocument,
)
from app.utils.fen import fen_to_hash, validate_fen
from app.core.config import get_settings
from app.core.websocket import manager

logger = logging.getLogger(__name__)


GAME_ANALYSIS_DEPTH = 26


class AnalysisPipeline:
    """Orchestrates the full analysis flow: parse -> evaluate -> classify -> assemble."""

    def __init__(self, engine_config: EngineConfig):
        self.engine_config = engine_config
        self.classifier = MoveClassifier(get_settings())

    async def analyze_pgn(
        self,
        pgn_string: str,
        analysis_id: str,
        depth: Optional[int] = None,
        shared_engine: Optional[StockfishEngine] = None,
    ) -> AnalysisDocument:
        """Run full analysis on a PGN game."""
        parsed_game = parse_pgn(pgn_string)
        logger.info(
            f"Parsed PGN: {parsed_game.white} vs {parsed_game.black}, "
            f"{len(parsed_game.moves)} moves"
        )

        # Game analysis uses tiered depth (18-28) — full config depth is for FEN only
        analysis_depth = depth or GAME_ANALYSIS_DEPTH

        doc = AnalysisDocument(
            analysis_id=analysis_id,
            pgn=pgn_string,
            depth=analysis_depth,
            status="processing",
            metadata=extract_game_metadata(parsed_game),
        )

        poly_probe = PolyglotBookProbe.try_open(get_settings().OPENING_POLYGLOT_PATH or "")
        try:
            if shared_engine is not None:
                await shared_engine.new_game()
                move_documents = await self._evaluate_moves(
                    shared_engine, parsed_game.moves, analysis_depth, analysis_id, poly_probe
                )
            else:
                async with StockfishEngine(self.engine_config) as engine:
                    await engine.new_game()
                    move_documents = await self._evaluate_moves(
                        engine, parsed_game.moves, analysis_depth, analysis_id, poly_probe
                    )
        finally:
            if poly_probe is not None:
                poly_probe.close()

        doc.moves = move_documents
        doc.summary = self._compute_summary(move_documents)

        # Enrich metadata with detected opening
        fens = [m.fen_before for m in parsed_game.moves]
        eco, name = detect_opening(fens)
        if eco:
            doc.metadata.eco = eco
        if name:
            doc.metadata.opening = name

        doc.status = "completed"
        doc.completed_at = datetime.utcnow()
        return doc

    async def analyze_fen(
        self,
        fen: str,
        depth: Optional[int] = None,
        num_lines: int = 3,
        shared_engine: Optional[StockfishEngine] = None,
    ) -> dict:
        """Analyze a single FEN position with multi-PV."""
        if not validate_fen(fen):
            raise ValueError(f"Invalid FEN: {fen}")

        analysis_depth = depth or self.engine_config.depth
        board = chess.Board(fen)
        terminal = self._fen_terminal_response(fen, board)
        if terminal is not None:
            return terminal

        settings = get_settings()
        mv_ms = min(5000, settings.STOCKFISH_MAX_MOVETIME_MS) if settings.STOCKFISH_MAX_MOVETIME_MS else 5000

        if shared_engine is not None:
            results = await shared_engine.analyze_position_multi_pv(
                fen, num_lines=num_lines, depth=analysis_depth, movetime=mv_ms
            )
        else:
            async with StockfishEngine(self.engine_config) as engine:
                results = await engine.analyze_position_multi_pv(
                    fen, num_lines=num_lines, depth=analysis_depth, movetime=mv_ms
                )

        if not results:
            raise RuntimeError("Engine returned no results")

        top = results[0]
        pv_san = uci_to_san_list(board, top.pv)
        best_move_san = uci_to_san(board, top.best_move)

        lines = []
        for i, r in enumerate(results):
            line_san = uci_to_san_list(board, r.pv)
            move_san = uci_to_san(board, r.best_move)
            lines.append({
                "rank": i + 1,
                "eval": r.score.to_pawn_value(),
                "move": move_san,
                "move_uci": r.best_move,
                "pv": line_san,
                "mate_in": r.mate_in,
                "depth": r.depth,
            })

        return {
            "fen": fen,
            "eval": top.score.to_pawn_value(),
            "best_move": best_move_san,
            "best_move_uci": top.best_move,
            "pv": pv_san,
            "mate_in": top.mate_in,
            "depth": top.depth,
            "is_check": board.is_check(),
            "is_checkmate": board.is_checkmate(),
            "is_stalemate": board.is_stalemate(),
            "turn": "white" if board.turn == chess.WHITE else "black",
            "top_lines": lines,
        }

    @staticmethod
    def _fen_terminal_response(fen: str, board: chess.Board) -> Optional[dict]:
        """Checkmate / stalemate: Stockfish often emits ``bestmove`` with no MultiPV ``info`` lines."""
        turn_label = "white" if board.turn == chess.WHITE else "black"
        base = {
            "fen": fen,
            "best_move": "",
            "best_move_uci": "",
            "pv": [],
            "depth": 0,
            "turn": turn_label,
            "top_lines": [],
        }
        if board.is_checkmate():
            white_won = board.turn == chess.BLACK
            ev = 100.0 if white_won else -100.0
            return {
                **base,
                "eval": ev,
                "mate_in": 0,
                "is_check": True,
                "is_checkmate": True,
                "is_stalemate": False,
            }
        if board.is_stalemate():
            return {
                **base,
                "eval": 0.0,
                "mate_in": None,
                "is_check": False,
                "is_checkmate": False,
                "is_stalemate": True,
            }
        return None

    @staticmethod
    def _cp_swing_from_score(sc: EngineScore) -> int:
        if sc.is_mate:
            v = sc.value
            return 10000 if v > 0 else -10000 if v < 0 else 0
        return int(sc.value)

    async def _evaluate_moves(
        self,
        engine: StockfishEngine,
        moves: List[ParsedMove],
        depth: int,
        analysis_id: str,
        poly_probe: Optional[PolyglotBookProbe] = None,
    ) -> List[MoveDocument]:
        """Evaluate each position with optional Polyglot book, two-pass depth, MultiPV."""
        if not moves:
            return []

        fens_before = [m.fen_before for m in moves]
        last_book_ply = opening_book_depth(fens_before)
        settings = get_settings()
        mv_ms = min(2000, settings.STOCKFISH_MAX_MOVETIME_MS) if settings.STOCKFISH_MAX_MOVETIME_MS else 2000
        nlines = settings.STOCKFISH_PGN_MULTIPV_LINES
        cheap_depth = min(settings.ANALYSIS_CHEAP_PASS_DEPTH, depth or GAME_ANALYSIS_DEPTH)
        mt_cheap = min(400, mv_ms)

        move_documents: List[MoveDocument] = []
        prev_eval = 0.0
        prev_mate: Optional[int] = None
        carried_result: Optional[EngineResult] = None

        use_tiered_depth = depth == GAME_ANALYSIS_DEPTH

        for i, parsed_move in enumerate(moves):
            if i <= last_book_ply:
                move_documents.append(build_book_move_doc(parsed_move))
                await self._broadcast_progress(analysis_id, i, len(moves), move_documents[-1])
                carried_result = None
                continue

            if poly_probe is not None and i > last_book_ply and i < settings.OPENING_POLYGLOT_MAX_PLY:
                try:
                    bb = chess.Board(parsed_move.fen_before)
                    mv = chess.Move.from_uci(parsed_move.uci)
                    if poly_probe.is_played_move_in_book(bb, mv):
                        move_documents.append(build_book_move_doc(parsed_move))
                        await self._broadcast_progress(analysis_id, i, len(moves), move_documents[-1])
                        carried_result = None
                        continue
                except ValueError:
                    pass

            if use_tiered_depth and settings.ANALYSIS_TWO_PASS_ENABLED:
                cr_b = await engine.analyze_position(
                    parsed_move.fen_before, depth=cheap_depth, movetime=mt_cheap
                )
                cr_a = await engine.analyze_position(
                    parsed_move.fen_after, depth=cheap_depth, movetime=mt_cheap
                )
                swing_cp = abs(
                    self._cp_swing_from_score(cr_b.score) - self._cp_swing_from_score(cr_a.score)
                )
                cur_depth = resolve_depth_from_swing(
                    i, swing_cp, GAME_ANALYSIS_DEPTH, settings.MAX_ANALYSIS_DEPTH
                )
            elif use_tiered_depth:
                cur_depth = self._get_depth_for_position(i, prev_eval * 100, 0.0)
            else:
                cur_depth = depth

            multipv_alt: Optional[list[float]] = None

            if carried_result is not None:
                before_result = carried_result
                best_move_uci = before_result.best_move
                best_move_eval = before_result.score.to_pawn_value()
                eval_before = best_move_eval
                after_result = await self._get_eval_with_cache(
                    engine, parsed_move.fen_after, cur_depth
                )
            else:
                lines = await engine.analyze_position_multi_pv(
                    parsed_move.fen_before,
                    num_lines=nlines,
                    depth=cur_depth,
                    movetime=mv_ms,
                )
                before_result = lines[0]
                best_move_uci = before_result.best_move
                best_move_eval = before_result.score.to_pawn_value()
                eval_before = best_move_eval
                played_line = next((r for r in lines if r.best_move == parsed_move.uci), None)
                if played_line is not None:
                    after_result = played_line
                else:
                    after_result = await self._get_eval_with_cache(
                        engine, parsed_move.fen_after, cur_depth
                    )
                if len(lines) > 1:
                    multipv_alt = [r.score.to_pawn_value() for r in lines[1:]]

            eval_after = after_result.score.to_pawn_value()
            mate_after = after_result.mate_in
            carried_result = after_result

            board_before = chess.Board(parsed_move.fen_before)
            best_move_san = uci_to_san(board_before, best_move_uci)
            phase = detect_game_phase(board_before)

            classification = self.classifier.classify(
                eval_before=eval_before,
                eval_after=eval_after,
                best_move_eval=best_move_eval,
                played_move=parsed_move.uci,
                best_move=best_move_uci,
                color=parsed_move.color,
                mate_before=prev_mate,
                mate_after=mate_after,
                mate_best=before_result.mate_in,
                board_before=board_before,
                multipv_alt_root_pawns=multipv_alt
                if (multipv_alt and parsed_move.uci == best_move_uci)
                else None,
            )

            if parsed_move.color == "white":
                cp_loss = max(0.0, (best_move_eval - eval_after) * 100)
            else:
                cp_loss = max(0.0, (eval_after - best_move_eval) * 100)

            pv_san = uci_to_san_list(board_before, before_result.pv[:5])

            move_doc = MoveDocument(
                move_number=parsed_move.move_number,
                move=parsed_move.san,
                move_uci=parsed_move.uci,
                color=parsed_move.color,
                fen_before=parsed_move.fen_before,
                fen_after=parsed_move.fen_after,
                eval_before=round(eval_before, 2),
                eval_after=round(eval_after, 2),
                centipawn_loss=round(cp_loss, 1),
                classification=classification.value,
                best_move=best_move_san,
                best_move_uci=best_move_uci,
                best_move_eval=round(best_move_eval, 2),
                pv=pv_san,
                is_check=parsed_move.is_check,
                is_capture=parsed_move.is_capture,
                is_castle=parsed_move.is_castle,
                mate_in=mate_after,
                phase=phase,
                comment=(parsed_move.comment or None) or None,
            )

            move_documents.append(move_doc)
            prev_eval = eval_after
            prev_mate = mate_after

            await self._broadcast_progress(analysis_id, i, len(moves), move_doc)

            if (i + 1) % 10 == 0:
                logger.info(f"Analyzed {i + 1}/{len(moves)} moves")

        return move_documents

    def _compute_summary(self, moves: List[MoveDocument]) -> AnalysisSummaryDocument:
        """Compute summary statistics with win-probability accuracy and missed wins."""
        white_moves = [m for m in moves if m.color == "white"]
        black_moves = [m for m in moves if m.color == "black"]

        white_cls = [Classification(m.classification) for m in white_moves]
        black_cls = [Classification(m.classification) for m in black_moves]

        white_class_counts = {}
        for c in white_cls:
            white_class_counts[c.value] = white_class_counts.get(c.value, 0) + 1
        black_class_counts = {}
        for c in black_cls:
            black_class_counts[c.value] = black_class_counts.get(c.value, 0) + 1

        # Win-probability based accuracy (excludes book moves)
        white_accuracies = [
            move_accuracy(m.eval_before, m.eval_after, True)
            for m in white_moves if m.classification != "book"
        ]
        black_accuracies = [
            move_accuracy(m.eval_before, m.eval_after, False)
            for m in black_moves if m.classification != "book"
        ]

        avg_cpl_white = (
            sum(m.centipawn_loss for m in white_moves) / len(white_moves)
            if white_moves else 0.0
        )
        avg_cpl_black = (
            sum(m.centipawn_loss for m in black_moves) / len(black_moves)
            if black_moves else 0.0
        )

        # Missed wins detection
        missed = find_missed_wins(moves)
        missed_white = [i for i in missed if moves[i].color == "white"]
        missed_black = [i for i in missed if moves[i].color == "black"]

        return AnalysisSummaryDocument(
            total_moves=len(moves),
            white_accuracy=round(game_accuracy(white_accuracies), 1),
            black_accuracy=round(game_accuracy(black_accuracies), 1),
            white_classifications=white_class_counts,
            black_classifications=black_class_counts,
            avg_centipawn_loss_white=round(avg_cpl_white, 1),
            avg_centipawn_loss_black=round(avg_cpl_black, 1),
            missed_wins_white=missed_white,
            missed_wins_black=missed_black,
        )

    def _get_depth_for_position(
        self, ply: int, prev_eval_cp: float, cur_eval_cp: float
    ) -> int:
        """Tiered depth strategy matching chess.com: 18-28 depending on position."""
        swing = abs(cur_eval_cp - prev_eval_cp)
        if swing >= 300:
            return 28
        if swing >= 150:
            return 24
        if ply < 10:
            return 18
        return GAME_ANALYSIS_DEPTH

    async def _get_eval_with_cache(
        self,
        engine: StockfishEngine,
        fen: str,
        depth: int,
    ) -> EngineResult:
        """Check position cache, then call engine with movetime cap.

        Uses 2s per position — reliably reaches depth 17-18, sufficient for classification.
        """
        fen_hash = fen_to_hash(fen)

        cached = await PositionCacheRepository.get_cached(fen_hash, min_depth=depth)
        if cached:
            return cached_to_engine_result(cached)

        settings = get_settings()
        mt = min(2000, settings.STOCKFISH_MAX_MOVETIME_MS) if settings.STOCKFISH_MAX_MOVETIME_MS else 2000
        result = await engine.analyze_position(fen, depth=depth, movetime=mt)

        await self._try_cache_result(fen, fen_hash, result)
        return result

    async def _try_cache_result(
        self, fen: str, fen_hash: str, result: EngineResult
    ) -> None:
        """Write engine result to cache. Silently ignores failures."""
        try:
            cache_doc = PositionCacheDocument(
                fen_hash=fen_hash,
                fen=fen,
                depth=result.depth,
                eval_cp=int(result.score.centipawn_value),
                eval_type="mate" if result.score.is_mate else "cp",
                best_move=result.best_move,
                pv=result.pv[:5],
                mate_in=result.mate_in,
            )
            await PositionCacheRepository.cache_position(cache_doc)
        except Exception:
            pass

    async def _broadcast_progress(
        self, analysis_id: str, index: int, total: int, move_doc: MoveDocument
    ) -> None:
        """Send progress update over websocket."""
        progress = {
            "type": "progress",
            "move_index": index,
            "total_moves": total,
            "percentage": round(((index + 1) / total) * 100, 1),
            "current_san": move_doc.move,
            "last_move": move_doc.model_dump(),
        }
        await manager.broadcast_progress(analysis_id, progress)
