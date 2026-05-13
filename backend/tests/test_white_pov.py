"""White POV normalizer (analysis.md §6.5)."""

import chess

from app.engine.types import EngineResult, EngineScore, ScoreType
from app.engine.white_pov import WhitePovEngineNormalizer


def test_white_to_move_unchanged_cp():
    fen = chess.Board().fen()
    r = EngineResult(
        score=EngineScore(ScoreType.CENTIPAWN, 42),
        best_move="e2e4",
        pv=["e2e4"],
        depth=10,
    )
    out = WhitePovEngineNormalizer.engine_result(fen, r)
    assert out.score.value == 42


def test_black_to_move_flips_cp_sign():
    b = chess.Board()
    b.push_uci("e2e4")
    fen = b.fen()
    r = EngineResult(
        score=EngineScore(ScoreType.CENTIPAWN, 30),
        best_move="e7e5",
        pv=["e7e5"],
        depth=10,
    )
    out = WhitePovEngineNormalizer.engine_result(fen, r)
    assert out.score.value == -30
