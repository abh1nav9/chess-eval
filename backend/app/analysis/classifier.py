"""
Move classification system.
Classifies moves based on centipawn loss, mate transitions, and tactical context.
"""

from enum import Enum
from typing import Optional


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


# Centipawn loss thresholds (from the player's perspective)
THRESHOLDS = {
    "excellent": 10,    # cp loss <= 10
    "good": 30,         # cp loss <= 30
    "inaccuracy": 100,  # cp loss <= 100
    "mistake": 300,     # cp loss <= 300
    # anything above 300 = blunder
}

# Weights for accuracy calculation (higher = worse)
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


class MoveClassifier:
    """Classifies move quality based on engine evaluations."""

    @staticmethod
    def classify(
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
    ) -> Classification:
        """Classify a move based on evaluation deltas.

        All evals are from WHITE's perspective (positive = white advantage).

        Args:
            eval_before: Eval before the move (pawns, white's POV).
            eval_after: Eval after the move (pawns, white's POV).
            best_move_eval: Eval of the engine's best move (pawns, white's POV).
            played_move: The move actually played (UCI).
            best_move: Engine's best move (UCI).
            color: "white" or "black".
            mate_before: Mate-in-N before the move (None if not mate).
            mate_after: Mate-in-N after the move (None if not mate).
            mate_best: Mate-in-N for the best move (None if not mate).
            is_book_move: Whether this is a known book/opening move.

        Returns:
            Classification enum value.
        """
        if is_book_move:
            return Classification.BOOK

        # If the played move IS the best move
        if played_move == best_move:
            return MoveClassifier._classify_best_move(
                eval_before, best_move_eval, color, mate_before, mate_best
            )

        # Calculate centipawn loss from the player's perspective
        cp_loss = MoveClassifier._compute_cp_loss(
            eval_before, eval_after, best_move_eval, color
        )

        # Check for mate-related transitions
        mate_class = MoveClassifier._check_mate_transitions(
            mate_before, mate_after, mate_best, color
        )
        if mate_class is not None:
            return mate_class

        # "Miss" — had a winning position (>=2.0 advantage) and threw it away significantly
        multiplier = 1.0 if color == "white" else -1.0
        player_advantage_before = best_move_eval * multiplier
        player_advantage_after = eval_after * multiplier
        if player_advantage_before >= 2.0 and cp_loss > THRESHOLDS["mistake"]:
            if player_advantage_after < 0.5:
                return Classification.MISS

        # Standard classification by centipawn loss
        if cp_loss <= THRESHOLDS["excellent"]:
            return Classification.EXCELLENT
        elif cp_loss <= THRESHOLDS["good"]:
            return Classification.GOOD
        elif cp_loss <= THRESHOLDS["inaccuracy"]:
            return Classification.INACCURACY
        elif cp_loss <= THRESHOLDS["mistake"]:
            return Classification.MISTAKE
        else:
            return Classification.BLUNDER

    @staticmethod
    def _classify_best_move(
        eval_before: float,
        best_eval: float,
        color: str,
        mate_before: Optional[int],
        mate_best: Optional[int],
    ) -> Classification:
        """Classify when the player found the engine's top move."""
        # Finding a forced mate = brilliant
        if mate_best is not None and mate_before is None:
            return Classification.BRILLIANT

        # Swing from the player's perspective
        multiplier = 1.0 if color == "white" else -1.0
        swing = (best_eval - eval_before) * multiplier

        if swing > 2.0:
            return Classification.BRILLIANT
        if swing > 1.0:
            return Classification.GREAT

        return Classification.BEST

    @staticmethod
    def _compute_cp_loss(
        eval_before: float,
        eval_after: float,
        best_move_eval: float,
        color: str,
    ) -> float:
        """Compute centipawn loss from the player's perspective.

        Returns a non-negative value in centipawns.
        """
        # From white's perspective, white wants eval to go UP, black wants it DOWN
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
        """Check for mate-related transitions that override cp-based classification."""
        is_white = color == "white"

        # Had a forced mate, lost it → miss (threw away a win)
        if mate_best is not None:
            winning_mate = (mate_best > 0 and is_white) or (mate_best < 0 and not is_white)
            if winning_mate and mate_after is None:
                return Classification.MISS
            # Had mate, still have mate but slower → inaccuracy
            if winning_mate and mate_after is not None:
                if is_white and mate_after > 0 and mate_after > mate_best:
                    return Classification.INACCURACY
                if not is_white and mate_after < 0 and abs(mate_after) > abs(mate_best):
                    return Classification.INACCURACY

        # Opponent had no mate, now they do → blunder
        if mate_before is None and mate_after is not None:
            losing_mate = (mate_after < 0 and is_white) or (mate_after > 0 and not is_white)
            if losing_mate:
                return Classification.BLUNDER

        return None

    @staticmethod
    def compute_accuracy(classifications: list[Classification]) -> float:
        """Compute accuracy percentage from a list of classifications.

        Uses a weighted formula inspired by Chess.com's accuracy model.
        100% = all best/brilliant moves, 0% = all blunders.
        """
        if not classifications:
            return 0.0

        total_weight = 0.0
        max_weight = len(classifications) * ACCURACY_WEIGHTS[Classification.BLUNDER]

        for cls in classifications:
            total_weight += ACCURACY_WEIGHTS.get(cls, 0)

        if max_weight == 0:
            return 100.0

        # Invert: lower weight = higher accuracy
        accuracy = max(0.0, min(100.0, (1.0 - total_weight / max_weight) * 100.0))
        return round(accuracy, 1)
