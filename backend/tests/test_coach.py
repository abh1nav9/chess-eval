"""Tests for template-based coach messages."""

from __future__ import annotations

import chess
import pytest

from app.analysis.coach import COACHED_CLASSIFICATIONS, get_coach_message
from app.analysis.coach_signals import extract_signals
from app.models.analysis import MoveDocument


def _doc(**kwargs) -> MoveDocument:
    defaults = dict(
        move_number=1,
        move="e4",
        move_uci="e2e4",
        color="white",
        fen_before=chess.STARTING_FEN,
        fen_after="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        eval_before=0.0,
        eval_after=0.2,
        centipawn_loss=0.0,
        classification="good",
        best_move="e4",
        phase="opening",
    )
    defaults.update(kwargs)
    return MoveDocument(**defaults)


def test_color_detection():
    doc = _doc(color="black", move="e5", move_uci="e7e5")
    board = chess.Board()
    board.push(chess.Move.from_uci("e7e5"))
    # fen_before for black's e5 is after white e4
    doc_black = _doc(
        color="black",
        move="e5",
        move_uci="e7e5",
        fen_before="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    )
    s = extract_signals(
        doc_black,
        mate_in_before=None,
        board_before=chess.Board(doc_black.fen_before),
    )
    assert s.color == "black"


def test_winning_context():
    doc = _doc(eval_before=1.5, color="white")
    s = extract_signals(doc, mate_in_before=None, board_before=chess.Board(doc.fen_before))
    assert s.ctx_before == "winning"


def test_losing_context_black():
    doc = _doc(eval_before=2.0, color="black", move="e5", move_uci="e7e5",
               fen_before="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1")
    s = extract_signals(
        doc, mate_in_before=None, board_before=chess.Board(doc.fen_before)
    )
    assert s.ctx_before == "losing"


def test_mate_flags_white():
    doc = _doc(mate_in=None, eval_before=0.0, eval_after=0.5)
    s = extract_signals(doc, mate_in_before=3, board_before=chess.Board(doc.fen_before))
    assert s.had_mate_before is True
    assert s.mate_in_before == 3
    assert s.has_mate_after is False


def test_opponent_has_mate():
    doc = _doc(mate_in=-2, color="white")
    s = extract_signals(doc, mate_in_before=None, board_before=chess.Board(doc.fen_before))
    assert s.opponent_has_mate is True
    assert s.mate_in_after == 2


def test_catastrophic_swing():
    doc = _doc(eval_before=0.0, eval_after=-6.0, color="white", classification="blunder")
    s = extract_signals(doc, mate_in_before=None, board_before=chess.Board(doc.fen_before))
    assert s.swing_size == "catastrophic"
    assert s.eval_swing == pytest.approx(6.0)


def test_blunder_had_mate_opponent_now_has_mate():
    doc = _doc(
        classification="blunder",
        color="white",
        eval_before=0.0,
        eval_after=-10.0,
        best_move="Qh5",
        move="Qf7",
        move_uci="d1f7",
    )
    msg = get_coach_message(
        doc, mate_in_before=3, board_before=chess.Board(doc.fen_before)
    )
    assert msg is not None
    assert "mate" in msg.lower() or "checkmate" in msg.lower()


def test_blunder_queen_lost():
    fen = "rnb1kbnr/pppp1ppp/8/4p3/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3"
    doc = _doc(
        classification="blunder",
        eval_before=0.0,
        eval_after=-9.0,
        best_move="Qd1",
        move="Qxf7",
        move_uci="d1f7",
        fen_before=fen,
    )
    msg = get_coach_message(
        doc, mate_in_before=None, board_before=chess.Board(fen)
    )
    assert msg is not None


def test_brilliant_classification():
    doc = _doc(classification="brilliant", eval_before=-0.5, eval_after=3.0, is_capture=True)
    msg = get_coach_message(
        doc, mate_in_before=None, board_before=chess.Board(doc.fen_before)
    )
    assert msg is not None


def test_book_early():
    doc = _doc(classification="book", move_number=2)
    msg = get_coach_message(
        doc, mate_in_before=None, board_before=chess.Board(doc.fen_before)
    )
    assert msg is not None
    assert "theory" in msg.lower() or "book" in msg.lower()


def test_no_message_for_unknown_classification():
    doc = _doc(classification="unknown_type")
    msg = get_coach_message(
        doc, mate_in_before=None, board_before=chess.Board(doc.fen_before)
    )
    assert msg is None


def test_all_coached_classifications_have_fallback():
    for clf in sorted(COACHED_CLASSIFICATIONS):
        doc = _doc(classification=clf)
        msg = get_coach_message(
            doc, mate_in_before=None, board_before=chess.Board(doc.fen_before)
        )
        assert msg is not None, f"No fallback message for classification: {clf}"


def test_best_move_interpolated():
    doc = _doc(
        classification="mistake",
        best_move="Nf3",
        eval_before=0.0,
        eval_after=-0.6,
        move="h3",
        move_uci="h2h3",
    )
    msg = get_coach_message(
        doc, mate_in_before=None, board_before=chess.Board(doc.fen_before)
    )
    assert msg is not None
    assert "Nf3" in msg
