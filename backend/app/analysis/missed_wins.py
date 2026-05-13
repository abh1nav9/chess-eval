"""Post-processing pass: detect positions where a forced win or mate was missed."""

from typing import List, Optional
from app.models.analysis import MoveDocument


def find_missed_wins(moves: List[MoveDocument], threshold_cp: float = 3.0) -> List[int]:
    """Return ply indices where the side to move had a winning position and threw it away.

    A missed win is when:
    - The side had mate or eval >= threshold_cp (in pawn units) BEFORE the move
    - After the move, the advantage dropped significantly or mate was lost

    Args:
        moves: List of analyzed move documents.
        threshold_cp: Minimum eval advantage (pawns) to count as "winning".

    Returns:
        List of 0-based move indices where wins were missed.
    """
    missed: List[int] = []
    for i, move in enumerate(moves):
        is_white = move.color == "white"

        if i > 0:
            prev_mate = moves[i - 1].mate_in
        else:
            prev_mate = None

        eval_before_for_player = move.eval_before if is_white else -move.eval_before
        eval_after_for_player = move.eval_after if is_white else -move.eval_after

        had_winning_eval = eval_before_for_player >= threshold_cp
        had_mate = (prev_mate is not None and
                    ((prev_mate > 0 and is_white) or (prev_mate < 0 and not is_white)))

        if not (had_winning_eval or had_mate):
            continue

        lost_mate = had_mate and (move.mate_in is None or
                                  (move.mate_in > 0 and not is_white) or
                                  (move.mate_in < 0 and is_white))
        eval_dropped = eval_after_for_player < threshold_cp and had_winning_eval

        if lost_mate or eval_dropped:
            missed.append(i)

    return missed


def find_missed_mates(moves: List[MoveDocument]) -> List[int]:
    """Return ply indices where the side had a forced mate and lost it."""
    missed: List[int] = []
    for i, move in enumerate(moves):
        is_white = move.color == "white"

        if i > 0 and moves[i - 1].mate_in is not None:
            prev_mate = moves[i - 1].mate_in
            had_our_mate = (prev_mate > 0 and is_white) or (prev_mate < 0 and not is_white)
            lost_it = move.mate_in is None or (
                (move.mate_in < 0 and is_white) or (move.mate_in > 0 and not is_white)
            )
            if had_our_mate and lost_it:
                missed.append(i)

    return missed
