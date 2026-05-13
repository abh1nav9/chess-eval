"""Classifier threshold boundaries (analysis.md §1.7 / §6.5)."""

from unittest.mock import MagicMock

import chess

from app.analysis.classifier import Classification, MoveClassifier


def _mock_settings(**overrides):
    m = MagicMock()
    m.CLASSIFIER_CP_EXCELLENT = 10
    m.CLASSIFIER_CP_GOOD = 25
    m.CLASSIFIER_CP_INACCURACY = 50
    m.CLASSIFIER_CP_MISTAKE = 150
    m.CLASSIFIER_MISS_MIN_ADVANTAGE_PAWNS = 2.0
    m.CLASSIFIER_BRILLIANT_SWING_PAWNS = 1.0
    m.CLASSIFIER_BRILLIANT_SACRIFICE_CP = 80
    for k, v in overrides.items():
        setattr(m, k, v)
    return m


def test_non_best_excellent_boundary_white():
    c = MoveClassifier(settings=_mock_settings())
    cls = c.classify(
        eval_before=0.0,
        eval_after=0.11,
        best_move_eval=0.2,
        played_move="a2a3",
        best_move="e2e4",
        color="white",
        board_before=chess.Board(),
    )
    assert cls == Classification.EXCELLENT


def test_non_best_good_when_above_excellent_white():
    c = MoveClassifier(settings=_mock_settings())
    cls = c.classify(
        eval_before=0.0,
        eval_after=0.05,
        best_move_eval=0.2,
        played_move="a2a3",
        best_move="e2e4",
        color="white",
        board_before=chess.Board(),
    )
    assert cls == Classification.GOOD


def test_book_short_circuit():
    c = MoveClassifier(settings=_mock_settings())
    cls = c.classify(
        eval_before=0.0,
        eval_after=-5.0,
        best_move_eval=0.0,
        played_move="e2e4",
        best_move="d2d4",
        color="white",
        is_book_move=True,
        board_before=chess.Board(),
    )
    assert cls == Classification.BOOK
