"""
Move classification system.
Classifies moves based on centipawn loss, mate transitions, and tactical context.
"""

from __future__ import annotations

from enum import Enum
from typing import TYPE_CHECKING, Optional

import chess

from app.core.config import Settings, get_settings

if TYPE_CHECKING:
    pass


class Classification(str, Enum):
    BRILLIANT = "brilliant"
    GREAT = "great"
    BEST = "best"
    EXCELLENT = "excellent"
    GOOD = "good"
    INACCURACY = "inaccuracy"
    MISTAKE = "mistake"
    MISS = "miss"
    BLUNDER = "blunder"
    BOOK = "book"


# Weights for legacy compute_accuracy (still used if referenced)
ACCURACY_WEIGHTS = {
    Classification.BRILLIANT: 0,
    Classification.GREAT: 0,
    Classification.BEST: 0,
    Classification.EXCELLENT: 2,
    Classification.GOOD: 5,
    Classification.INACCURACY: 15,
    Classification.MISTAKE: 40,
    Classification.MISS: 60,
    Classification.BLUNDER: 80,
    Classification.BOOK: 0,
}

_PIECE_CP = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 0,
}


def _side_material_cp(board: chess.Board, color: chess.Color) -> int:
    total = 0
    for pt in _PIECE_CP:
        total += len(board.pieces(pt, color)) * _PIECE_CP[pt]
    return total


def material_lost_by_mover_cp(board_before: chess.Board, move: chess.Move) -> int:
    """Approximate centipawns lost by the side to move on this single ply (piece given up)."""
    mover = board_before.turn
    before = _side_material_cp(board_before, mover)
    b2 = board_before.copy()
    b2.push(move)
    after = _side_material_cp(b2, mover)
    return max(0, before - after)


class MoveClassifier:
    """Classifies move quality based on engine evaluations."""

    def __init__(self, settings: Optional[Settings] = None):
        self._settings = settings or get_settings()

    def classify(
        self,
        eval_before: float,
        eval_after: float,
        best_move_eval: float,
        played_move: str,
        best_move: str,
        color: str,
        mate_before: Optional[int] = None,
        mate_after: Optional[int] = None,
        mate_best: Optional[int] = None,
        is_book_move: bool = False,
        board_before: Optional[chess.Board] = None,
        multipv_alt_root_pawns: Optional[list[float]] = None,
    ) -> Classification:
        if is_book_move:
            return Classification.BOOK

        if played_move == best_move:
            return self._classify_best_move(
                eval_before,
                best_move_eval,
                color,
                mate_before,
                mate_best,
                board_before,
                played_move,
                multipv_alt_root_pawns,
            )

        cp_loss = self._compute_cp_loss(eval_before, eval_after, best_move_eval, color)

        mate_class = self._check_mate_transitions(
            mate_before, mate_after, mate_best, color
        )
        if mate_class is not None:
            return mate_class

        s = self._settings
        mult = 1.0 if color == "white" else -1.0
        player_advantage_before = best_move_eval * mult
        player_advantage_after = eval_after * mult
        if (
            player_advantage_before >= s.CLASSIFIER_MISS_MIN_ADVANTAGE_PAWNS
            and cp_loss > s.CLASSIFIER_CP_MISTAKE
            and player_advantage_after < 0.5
        ):
            return Classification.MISS

        if cp_loss <= s.CLASSIFIER_CP_EXCELLENT:
            return Classification.EXCELLENT
        if cp_loss <= s.CLASSIFIER_CP_GOOD:
            return Classification.GOOD
        if cp_loss <= s.CLASSIFIER_CP_INACCURACY:
            return Classification.INACCURACY
        if cp_loss <= s.CLASSIFIER_CP_MISTAKE:
            return Classification.MISTAKE
        return Classification.BLUNDER

    def _classify_best_move(
        self,
        eval_before: float,
        best_eval: float,
        color: str,
        mate_before: Optional[int],
        mate_best: Optional[int],
        board_before: Optional[chess.Board],
        played_uci: str,
        multipv_alt_root_pawns: Optional[list[float]] = None,
    ) -> Classification:
        if mate_best is not None and mate_before is None:
            return Classification.BRILLIANT

        mult = 1.0 if color == "white" else -1.0
        swing = (best_eval - eval_before) * mult

        s = self._settings
        if swing > 2.0:
            return Classification.BRILLIANT
        if swing > s.CLASSIFIER_BRILLIANT_SWING_PAWNS:
            base = Classification.GREAT
            if board_before is not None:
                try:
                    mv = board_before.parse_uci(played_uci)
                    lost = material_lost_by_mover_cp(board_before, mv)
                    if lost >= s.CLASSIFIER_BRILLIANT_SACRIFICE_CP and swing >= 1.25:
                        return Classification.BRILLIANT
                except ValueError:
                    pass
            return base
        if swing > 1.0:
            return Classification.GREAT

        if multipv_alt_root_pawns and board_before is not None and len(multipv_alt_root_pawns) > 0:
            try:
                max_alt = max(multipv_alt_root_pawns)
                gap_pawns = best_eval - max_alt
                if gap_pawns >= 0.5:
                    mv = board_before.parse_uci(played_uci)
                    lost = material_lost_by_mover_cp(board_before, mv)
                    if lost >= s.CLASSIFIER_BRILLIANT_SACRIFICE_CP:
                        return Classification.BRILLIANT
            except (ValueError, TypeError):
                pass

        return Classification.BEST

    @staticmethod
    def _compute_cp_loss(
        eval_before: float,
        eval_after: float,
        best_move_eval: float,
        color: str,
    ) -> float:
        if color == "white":
            loss = (best_move_eval - eval_after) * 100
        else:
            loss = (eval_after - best_move_eval) * 100
        return max(0.0, loss)

    @staticmethod
    def _check_mate_transitions(
        mate_before: Optional[int],
        mate_after: Optional[int],
        mate_best: Optional[int],
        color: str,
    ) -> Optional[Classification]:
        is_white = color == "white"

        if mate_best is not None:
            winning_mate = (mate_best > 0 and is_white) or (mate_best < 0 and not is_white)
            if winning_mate and mate_after is None:
                return Classification.MISS
            if winning_mate and mate_after is not None:
                if is_white and mate_after > 0 and mate_after > mate_best:
                    return Classification.INACCURACY
                if not is_white and mate_after < 0 and abs(mate_after) > abs(mate_best):
                    return Classification.INACCURACY

        if mate_before is None and mate_after is not None:
            losing_mate = (mate_after < 0 and is_white) or (mate_after > 0 and not is_white)
            if losing_mate:
                return Classification.BLUNDER

        return None

    @staticmethod
    def compute_accuracy(classifications: list[Classification]) -> float:
        if not classifications:
            return 0.0

        total_weight = 0.0
        max_weight = len(classifications) * ACCURACY_WEIGHTS[Classification.BLUNDER]

        for cls in classifications:
            total_weight += ACCURACY_WEIGHTS.get(cls, 0)

        if max_weight == 0:
            return 100.0

        accuracy = max(0.0, min(100.0, (1.0 - total_weight / max_weight) * 100.0))
        return round(accuracy, 1)
