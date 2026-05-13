"""Win-probability based accuracy scoring (matches Chess.com methodology)."""

import math
from typing import List


def cp_to_win_percent(cp: float) -> float:
    """Convert centipawn eval to win probability (0-1)."""
    return 1 / (1 + math.exp(-0.00368208 * cp))


def move_accuracy(cp_before: float, cp_after: float, is_white: bool) -> float:
    """Per-move accuracy from eval deltas (both from white's POV).
    Returns 0-100.
    """
    if not is_white:
        cp_before, cp_after = -cp_before, -cp_after
    win_before = cp_to_win_percent(cp_before * 100)
    win_after = cp_to_win_percent(cp_after * 100)
    raw_loss = max(0.0, win_before - win_after)
    accuracy = 103.1668 * math.exp(-0.04354 * (raw_loss * 100)) - 3.1669
    return max(0.0, min(100.0, accuracy))


def game_accuracy(accuracies: List[float]) -> float:
    """Mean accuracy for a list of per-move accuracies."""
    return sum(accuracies) / len(accuracies) if accuracies else 0.0
