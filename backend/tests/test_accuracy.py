"""Lichess-style accuracy (accuracy.md)."""

import pytest

from app.analysis.accuracy import (
    cp_to_win_pct,
    game_accuracy,
    harmonic_mean,
    move_accuracy_from_child_results,
    move_accuracy_from_win_pct,
    mover_win_pct_from_child_result,
    volatility_weighted_mean,
)
from app.engine.types import EngineResult, EngineScore, ScoreType


def test_cp_to_win_pct_table_anchors():
    assert cp_to_win_pct(0.0) == pytest.approx(50.0, abs=0.05)
    assert cp_to_win_pct(100.0) == pytest.approx(59.1, abs=0.2)
    assert cp_to_win_pct(-100.0) == pytest.approx(40.9, abs=0.2)
    assert cp_to_win_pct(1000.0) == pytest.approx(97.8, abs=0.3)


def test_move_accuracy_from_win_pct_zero_loss_near_perfect():
    a = move_accuracy_from_win_pct(50.0, 50.0)
    assert a == pytest.approx(100.0, abs=0.05)


def test_move_accuracy_from_win_pct_large_loss_lower():
    low = move_accuracy_from_win_pct(50.0, 30.0)
    mid = move_accuracy_from_win_pct(50.0, 40.0)
    assert low < mid < 100.0


def test_harmonic_mean_doc_snippet():
    assert harmonic_mean([2.0, 4.0]) == pytest.approx(8.0 / 3.0)
    assert harmonic_mean([]) == 0.0
    assert harmonic_mean([0.0, 80.0]) == 80.0


def test_game_accuracy_empty_all_book():
    assert game_accuracy([], []) == 100.0


def test_game_accuracy_flat_winpct_matches_mean_of_vwm_and_harmonic():
    accs = [80.0, 80.0]
    wps = [50.0, 50.0]
    harm = harmonic_mean(accs)
    vwm = volatility_weighted_mean(accs, wps, volatility_half_window_cap=6)
    assert game_accuracy(accs, wps) == pytest.approx((vwm + harm) / 2.0, abs=0.05)


def test_game_accuracy_harmonic_penalizes_outliers():
    accs = [50.0, 10.0]
    wps = [50.0, 48.0]
    harm = harmonic_mean(accs)
    vwm = volatility_weighted_mean(accs, wps, volatility_half_window_cap=6)
    assert game_accuracy(accs, wps) == pytest.approx((vwm + harm) / 2.0, abs=0.05)


def test_volatility_weighted_mean_downweight_vs_lichess():
    accs = [40.0, 95.0, 40.0]
    wps = [48.0, 52.0, 48.0]
    cps = [0.0, 1500.0, 0.0]
    v_lichess = volatility_weighted_mean(
        accs, wps, played_child_cp_white_pov=cps, decisive_mode="lichess"
    )
    v_down = volatility_weighted_mean(
        accs,
        wps,
        played_child_cp_white_pov=cps,
        decisive_mode="downweight",
        decisive_cp_threshold=1000,
    )
    assert v_down < v_lichess


def test_mover_win_pct_white_cp():
    r = EngineResult(score=EngineScore(ScoreType.CENTIPAWN, 100), best_move="", pv=[])
    assert mover_win_pct_from_child_result(r, True) == pytest.approx(cp_to_win_pct(100.0), abs=0.01)
    assert mover_win_pct_from_child_result(r, False) == pytest.approx(100.0 - cp_to_win_pct(100.0), abs=0.01)


def test_mover_win_pct_mate_white_mover():
    r = EngineResult(score=EngineScore(ScoreType.MATE, 2), best_move="", pv=[])
    assert mover_win_pct_from_child_result(r, True) == 100.0


def test_mover_win_pct_mate_black_mover_white_delivers():
    r = EngineResult(score=EngineScore(ScoreType.MATE, 3), best_move="", pv=[])
    assert mover_win_pct_from_child_result(r, False) == 0.0


def test_mover_win_pct_mate_black_mover_black_delivers():
    r = EngineResult(score=EngineScore(ScoreType.MATE, -2), best_move="", pv=[])
    assert mover_win_pct_from_child_result(r, False) == 100.0


def test_move_accuracy_from_child_identical_positions():
    r = EngineResult(score=EngineScore(ScoreType.CENTIPAWN, 50), best_move="", pv=[])
    a = move_accuracy_from_child_results(r, r, True)
    assert a == pytest.approx(100.0, abs=0.1)


def test_game_accuracy_all_zeros_harmonic_zero_uses_vwm_only():
    assert game_accuracy([0.0, 0.0], [50.0, 50.0]) == 0.0
