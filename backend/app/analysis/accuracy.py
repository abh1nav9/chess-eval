"""Lichess-style accuracy (see repo accuracy.md).

Per-move: Win% after best vs after played child (mover POV), mate-aware, then the
published exponential curve.

Game: sliding-window volatility on Win%, volatility-weighted mean of move accuracies,
harmonic mean of move accuracies, then the mean of those two (full Lichess Step 3).
Optional ``downweight`` mode reduces volatility weights when |played child cp| is past
a decisive threshold (Chess.com-style experiment); default ``lichess`` matches
“include decisive positions” from the doc.
"""

from __future__ import annotations

import math
import statistics
from typing import List, Optional

from app.engine.types import EngineResult


def cp_to_win_pct(cp: float) -> float:
    """Centipawns (white POV) to win probability 0–100 (Lichess sigmoid)."""
    return 100.0 / (1.0 + math.exp(-0.00368208 * cp))


def mate_to_win_pct(mate_in: int) -> float:
    """Mate distance from side-to-move / score sign convention: winning mate -> 100."""
    return 100.0 if mate_in > 0 else 0.0


def mover_win_pct_from_child_result(child: EngineResult, mover_is_white: bool) -> float:
    """Win% (0–100) for the side that just moved, from a child FEN (white-POV engine score)."""
    sc = child.score
    if sc.is_mate:
        if mover_is_white:
            return mate_to_win_pct(sc.value)
        return mate_to_win_pct(-sc.value)
    cp = float(sc.value)
    w = cp_to_win_pct(cp)
    return w if mover_is_white else (100.0 - w)


def move_accuracy_from_win_pct(win_pct_best: float, win_pct_played: float) -> float:
    """Per-move accuracy from Win% before (best child) and after (played child)."""
    loss = max(0.0, win_pct_best - win_pct_played)
    acc = 103.1668 * math.exp(-0.04354 * loss) - 3.1669
    return round(max(0.0, min(100.0, acc)), 2)


def move_accuracy_from_child_results(
    best_child: EngineResult,
    played_child: EngineResult,
    mover_is_white: bool,
) -> float:
    """Lichess-style move accuracy using engine results at FEN after best vs after played."""
    wb = mover_win_pct_from_child_result(best_child, mover_is_white)
    wa = mover_win_pct_from_child_result(played_child, mover_is_white)
    return move_accuracy_from_win_pct(wb, wa)


def harmonic_mean(values: List[float]) -> float:
    """Harmonic mean over strictly positive values (matches accuracy.md snippet)."""
    positives = [v for v in values if v > 0]
    if not positives:
        return 0.0
    return len(positives) / sum(1.0 / v for v in positives)


def _half_window_for_game_length(n: int, cap: int) -> int:
    """Sliding half-window size from game length (accuracy.md Step 3)."""
    if n <= 0:
        return 0
    return max(1, min(cap, max(1, n // 4)))


def _sliding_volatility_weights(win_pcts: List[float], half_window: int) -> List[float]:
    """Per-move volatility ~ stdev(Win%) in a centered window; small floor for weighting."""
    n = len(win_pcts)
    weights: List[float] = []
    for i in range(n):
        lo = max(0, i - half_window)
        hi = min(n, i + half_window + 1)
        seg = win_pcts[lo:hi]
        if len(seg) < 2:
            weights.append(0.05)
        else:
            weights.append(statistics.pstdev(seg) + 0.05)
    return weights


def _decisive_weight_scale(
    cp_white_pov: Optional[float],
    *,
    mode: str,
    threshold_cp: int,
) -> float:
    if mode != "downweight":
        return 1.0
    if cp_white_pov is None:
        return 1.0
    if abs(cp_white_pov) < threshold_cp:
        return 1.0
    return 0.35


def volatility_weighted_mean(
    move_accuracies: List[float],
    win_pcts: List[float],
    *,
    played_child_cp_white_pov: Optional[List[Optional[float]]] = None,
    decisive_mode: str = "lichess",
    decisive_cp_threshold: int = 1000,
    volatility_half_window_cap: int = 6,
) -> float:
    """Step 3: volatility per sliding window, then weighted mean of move accuracies."""
    n = len(move_accuracies)
    if n == 0:
        return 0.0
    if len(win_pcts) != n:
        raise ValueError("win_pcts must align with move_accuracies")
    h = _half_window_for_game_length(n, volatility_half_window_cap)
    vol_w = _sliding_volatility_weights(win_pcts, h)
    cps = played_child_cp_white_pov or [None] * n
    if len(cps) != n:
        raise ValueError("played_child_cp_white_pov must align with move_accuracies")
    combined = [
        vol_w[i]
        * _decisive_weight_scale(
            cps[i],
            mode=decisive_mode,
            threshold_cp=decisive_cp_threshold,
        )
        for i in range(n)
    ]
    s_w = sum(combined)
    if s_w <= 0:
        return sum(move_accuracies) / n
    return sum(move_accuracies[i] * combined[i] for i in range(n)) / s_w


def game_accuracy(
    move_accuracies: List[float],
    win_pcts: List[float],
    *,
    played_child_cp_white_pov: Optional[List[Optional[float]]] = None,
    decisive_mode: str = "lichess",
    decisive_cp_threshold: int = 1000,
    volatility_half_window_cap: int = 6,
) -> float:
    """Full Lichess game aggregation: mean(volatility_weighted_mean, harmonic_mean).

    Empty list => 100 (all book / nothing scored).
    """
    if not move_accuracies:
        return 100.0
    mode = decisive_mode if decisive_mode in ("lichess", "downweight") else "lichess"
    vwm = volatility_weighted_mean(
        move_accuracies,
        win_pcts,
        played_child_cp_white_pov=played_child_cp_white_pov,
        decisive_mode=mode,
        decisive_cp_threshold=decisive_cp_threshold,
        volatility_half_window_cap=volatility_half_window_cap,
    )
    harm = harmonic_mean(move_accuracies)
    if harm <= 0.0:
        return round(vwm, 1)
    return round((vwm + harm) / 2.0, 1)
