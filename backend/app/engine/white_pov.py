"""Normalize UCI engine scores to White's perspective (classifier + API assume White POV)."""

import chess

from app.engine.types import EngineResult, EngineScore, ScoreType


class WhitePovEngineNormalizer:
    """UCI `cp` / `mate` are relative to the side to move; we store White POV everywhere."""

    @staticmethod
    def engine_result(fen: str, result: EngineResult) -> EngineResult:
        board = chess.Board(fen)
        if board.turn == chess.WHITE:
            return result
        flipped = WhitePovEngineNormalizer._flip_score(result.score)
        mpv = [
            WhitePovEngineNormalizer.engine_result(fen, r)
            for r in (result.multi_pv_results or [])
        ]
        return EngineResult(
            score=flipped,
            best_move=result.best_move,
            pv=result.pv,
            depth=result.depth,
            nodes=result.nodes,
            time_ms=result.time_ms,
            nps=result.nps,
            multi_pv_results=mpv,
        )

    @staticmethod
    def _flip_score(score: EngineScore) -> EngineScore:
        if score.is_mate:
            return EngineScore(ScoreType.MATE, -score.value)
        return EngineScore(ScoreType.CENTIPAWN, -int(score.value))
