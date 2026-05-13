"""Terminal FEN positions must not require Stockfish MultiPV info lines."""

import chess

from app.analysis.pipeline import AnalysisPipeline


def test_checkmate_fen_returns_synthetic_eval():
    fen = "r2qkbnr/1pp2Q1p/p2p1pp1/8/P1B1P3/8/1Pn2PPP/RNB2RK1 b kq - 3 12"
    board = chess.Board(fen)
    out = AnalysisPipeline._fen_terminal_response(fen, board)
    assert out is not None
    assert out["is_checkmate"] is True
    assert out["eval"] == 100.0
    assert out["mate_in"] == 0
    assert out["best_move_uci"] == ""


def test_stalemate_fen_returns_draw():
    fen = "k7/2Q5/1K6/8/8/8/8/8 b - - 0 1"
    board = chess.Board(fen)
    assert board.is_stalemate()
    out = AnalysisPipeline._fen_terminal_response(fen, board)
    assert out is not None
    assert out["is_stalemate"] is True
    assert out["eval"] == 0.0
    assert out["mate_in"] is None


def test_opening_fen_returns_none():
    fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    board = chess.Board(fen)
    assert AnalysisPipeline._fen_terminal_response(fen, board) is None
