# app/analysis/coach_templates.py

from __future__ import annotations

from typing import Callable

from app.analysis.coach_signals import MoveSignals

CondFn = Callable[[MoveSignals], bool]
Template = tuple[CondFn, str]


def interpolate(template: str, s: MoveSignals) -> str:
    return template.format(
        piece=s.piece,
        Piece=s.piece.capitalize(),
        san=s.san,
        square=s.to_square,
        from_sq=s.from_square,
        best=s.best_move_san or "the engine's suggestion",
        mate_before=s.mate_in_before or "?",
        mate_after=s.mate_in_after or "?",
        captured=s.captured_piece or "piece",
        Captured=(s.captured_piece or "piece").capitalize(),
        eval_before=f"{abs(s.eval_before):.1f}",
        eval_after=f"{abs(s.eval_after):.1f}",
        swing=f"{s.eval_swing:.1f}",
    )


def t(cond: CondFn, text: str) -> Template:
    return (cond, text)


BLUNDER_TEMPLATES: list[Template] = [
    t(
        lambda s: s.had_mate_before and s.opponent_has_mate,
        "You had forced checkmate in {mate_before} and handed it straight back. "
        "Now your opponent mates in {mate_after}. "
        "{best} was the continuation.",
    ),
    t(
        lambda s: s.had_mate_before and not s.opponent_has_mate,
        "Mate in {mate_before} was right there — {best} ends the game. "
        "The win is still there but it's no longer forced.",
    ),
    t(
        lambda s: s.opponent_has_mate and s.ctx_before == "winning",
        "From a winning position to a forced mate against you in {mate_after}. "
        "{best} keeps the win.",
    ),
    t(
        lambda s: s.opponent_has_mate and s.ctx_before == "equal",
        "A balanced position and now you're getting mated in {mate_after}. "
        "{best} holds the draw.",
    ),
    t(
        lambda s: s.opponent_has_mate,
        "Your opponent now has forced checkmate in {mate_after}. "
        "{best} was the defensive resource.",
    ),
    t(
        lambda s: s.piece == "queen"
        and not s.is_capture
        and s.swing_size in ("large", "catastrophic"),
        "The queen is gone and nothing was taken in return. "
        "{best} keeps her safe.",
    ),
    t(
        lambda s: s.captured_piece == "queen" and s.swing_size in ("large", "catastrophic"),
        "Allowing the queen to be captured swings the game completely. "
        "{best} avoids the exchange.",
    ),
    t(
        lambda s: s.ctx_before == "winning" and s.ctx_after == "losing",
        "A {eval_before}-pawn advantage completely thrown away. "
        "{best} maintains the win.",
    ),
    t(
        lambda s: s.ctx_before == "winning" and s.ctx_after == "equal",
        "You were winning by {eval_before} pawns — that edge is gone. "
        "{best} was the converting move.",
    ),
    t(
        lambda s: s.ctx_before == "equal" and s.ctx_after == "losing",
        "One move and a balanced game becomes a losing one. "
        "{best} keeps the equilibrium.",
    ),
    t(
        lambda s: not s.is_capture and s.swing_size in ("large", "catastrophic"),
        "The {piece} on {square} is now hanging — undefended with nothing gained. "
        "{best} avoids the tactic.",
    ),
    t(
        lambda s: s.is_capture and s.swing_size in ("large", "catastrophic"),
        "Taking the {captured} on {square} costs more material than it wins. "
        "{best} is the correct recapture.",
    ),
    t(
        lambda s: s.phase == "endgame" and s.piece == "king",
        "In the endgame the king must be active but safe. "
        "This step walked into danger — {best} is the right route.",
    ),
    t(
        lambda s: s.phase == "endgame",
        "Endgames punish the slightest imprecision. "
        "{best} was the required technique.",
    ),
    t(
        lambda s: s.phase == "opening",
        "A serious mistake this early puts you on the back foot immediately. "
        "{best} is the principled reply.",
    ),
    t(
        lambda s: s.swing_size == "catastrophic",
        "A {swing}-pawn collapse in a single move. "
        "{best} was the correct choice.",
    ),
    t(
        lambda _: True,
        "A significant mistake that shifts the balance. "
        "{best} was the stronger option.",
    ),
]

MISTAKE_TEMPLATES: list[Template] = [
    t(
        lambda s: s.had_mate_before,
        "Forced mate in {mate_before} was on the board — "
        "{best} would have clinched it.",
    ),
    t(
        lambda s: s.ctx_before == "winning" and s.ctx_after == "equal",
        "A winning position drifted back to equal. "
        "{best} keeps the pressure on.",
    ),
    t(
        lambda s: s.ctx_before == "equal" and s.ctx_after == "losing",
        "One tempo and equality becomes a struggle. "
        "{best} maintains the balance.",
    ),
    t(
        lambda s: s.piece == "knight" and s.phase == "opening",
        "Knights belong on strong central outposts — {square} isn't ideal. "
        "{best} develops with better coordination.",
    ),
    t(
        lambda s: s.piece == "bishop" and s.is_capture,
        "Trading the bishop here gives up too much for the {captured}. "
        "{best} keeps the bishop pair.",
    ),
    t(
        lambda s: s.piece == "rook" and s.phase == "middlegame",
        "The rook is better on an open file or seventh rank. "
        "{best} improves its scope.",
    ),
    t(
        lambda s: s.phase == "opening",
        "This loses a tempo and makes development harder. "
        "{best} moves with purpose.",
    ),
    t(
        lambda s: s.phase == "endgame",
        "Precision is everything in the endgame — "
        "{best} was the accurate continuation.",
    ),
    t(
        lambda s: s.swing_size == "medium",
        "A {swing}-pawn slip — the position is still manageable "
        "but {best} was more accurate.",
    ),
    t(
        lambda _: True,
        "A slight inaccuracy that gave away some of the advantage. "
        "{best} was the better move.",
    ),
]

INACCURACY_TEMPLATES: list[Template] = [
    t(
        lambda s: s.phase == "opening",
        "A minor opening imprecision. "
        "{best} maintains better development and central control.",
    ),
    t(
        lambda s: s.is_capture and s.phase == "middlegame",
        "The capture on {square} isn't wrong, but {best} keeps more tension. "
        "Releasing tension early often helps the defender.",
    ),
    t(
        lambda s: s.ctx_before == "winning",
        "Still winning, but small imprecisions accumulate. "
        "{best} was the more precise try.",
    ),
    t(
        lambda s: s.piece in ("knight", "bishop"),
        "The {piece} is slightly misplaced on {square}. "
        "{best} finds a more active square.",
    ),
    t(
        lambda s: s.piece == "pawn" and s.phase == "endgame",
        "Pawn moves in the endgame are permanent — {square} weakens the structure slightly. "
        "{best} is more flexible.",
    ),
    t(
        lambda _: True,
        "A minor imprecision — the position is still fine, "
        "but {best} was a touch more accurate.",
    ),
]

GOOD_TEMPLATES: list[Template] = [
    t(
        lambda s: s.is_check,
        "Keeping pressure with a check — your opponent is forced to react.",
    ),
    t(
        lambda s: s.is_castle,
        "Good decision to castle — king safety first, "
        "now the rook joins the game.",
    ),
    t(lambda s: s.is_promotion, "Pawn promoted — the long journey pays off."),
    t(
        lambda s: s.is_capture and s.ctx_after == "winning",
        "Solid capture on {square}. Material up and the position is consolidating.",
    ),
    t(
        lambda s: s.phase == "endgame" and s.piece == "king",
        "Good king activation — in the endgame the king is a fighting piece.",
    ),
    t(
        lambda s: s.phase == "opening",
        "A good developing move. Active pieces and central control.",
    ),
    t(
        lambda s: s.ctx_before == "losing" and s.ctx_after == "equal",
        "Fighting back from a losing position to equality — "
        "finding that resource is half the battle.",
    ),
    t(
        lambda _: True,
        "A solid choice — keeps the position healthy "
        "even if the engine had something slightly sharper.",
    ),
]

EXCELLENT_TEMPLATES: list[Template] = [
    t(
        lambda s: s.has_mate_after,
        "Excellent — {san} sets up forced mate in {mate_after}. "
        "Keep calculating and finish it off.",
    ),
    t(
        lambda s: s.is_capture and s.ctx_before == "equal" and s.ctx_after == "winning",
        "That {captured} was yours for the taking. "
        "Clean conversion from equality to a real advantage.",
    ),
    t(
        lambda s: s.is_check and s.ctx_after == "winning",
        "Check with purpose — this tempo tips the balance firmly in your favour.",
    ),
    t(
        lambda s: s.is_castle and s.phase == "opening",
        "Excellent timing to castle — king safe, rook active, "
        "development nearly complete.",
    ),
    t(
        lambda s: s.phase == "endgame" and s.swing_size in ("small", "medium"),
        "Precise endgame technique. Small edges compound fast — this one matters.",
    ),
    t(
        lambda s: s.ctx_before == "losing" and s.ctx_after == "equal",
        "Saving a lost position back to equality — "
        "this is exactly how difficult games are rescued.",
    ),
    t(
        lambda s: s.piece == "knight" and s.phase == "middlegame",
        "The knight finds an excellent outpost on {square}. "
        "Strong squares for knights are worth a lot.",
    ),
    t(
        lambda _: True,
        "Excellent move — very close to the engine's top choice. "
        "The position is looking good.",
    ),
]

GREAT_TEMPLATES: list[Template] = [
    t(
        lambda s: s.has_mate_after,
        "Great — {san} keeps the mating attack on track in {mate_after}.",
    ),
    t(
        lambda s: s.is_check and s.ctx_after == "winning",
        "A strong check that keeps the initiative — one of the engine's top choices.",
    ),
    t(
        lambda s: s.is_capture and s.ctx_after == "winning",
        "A well-timed capture on {square} — nearly as strong as the very best line.",
    ),
    t(
        lambda s: s.ctx_before == "losing" and s.ctx_after == "equal",
        "A great resource in a tough position — you found a strong defensive try.",
    ),
    t(
        lambda _: True,
        "A great move — very close to the engine's best, with only a tiny eval cost.",
    ),
]

BEST_TEMPLATES: list[Template] = [
    t(lambda s: s.has_mate_after and s.mate_in_after == 1, "Checkmate. Nothing more to say."),
    t(
        lambda s: s.has_mate_after,
        "Engine's best move — forced checkmate in {mate_after}. "
        "Now execute cleanly.",
    ),
    t(
        lambda s: s.ctx_before == "losing" and s.ctx_after in ("equal", "winning"),
        "The only move to hold and you found it. "
        "That kind of defensive resource separates good players.",
    ),
    t(
        lambda s: s.is_sacrifice,
        "Best move — a sacrifice that only works because the position demands it. "
        "The engine agrees.",
    ),
    t(
        lambda s: s.phase == "endgame",
        "Exact. Best moves in the endgame are often the hardest to find "
        "and you found it.",
    ),
    t(
        lambda s: s.ctx_before == "equal",
        "Best move in a balanced position — these are the ones that count.",
    ),
    t(
        lambda _: True,
        "Engine's top choice. Precise play in a position that required it.",
    ),
]

BRILLIANT_TEMPLATES: list[Template] = [
    t(
        lambda s: s.is_sacrifice and s.has_mate_after,
        "A piece sacrifice that forces checkmate in {mate_after}. "
        "You calculated what the engine sees.",
    ),
    t(
        lambda s: s.is_sacrifice and s.ctx_after == "winning",
        "Giving up the {piece} to seize a winning initiative — "
        "that's not a capture, that's a statement.",
    ),
    t(
        lambda s: s.is_sacrifice,
        "A brilliant sacrifice on {square}. "
        "The material is irrelevant — the initiative is everything.",
    ),
    t(
        lambda s: s.ctx_before == "losing" and s.ctx_after == "winning",
        "Turning a lost position into a winning one in a single move. "
        "That's what brilliance looks like.",
    ),
    t(
        lambda s: s.ctx_before == "equal" and s.has_mate_after,
        "From equality to a forced mate with one move. "
        "The engine gives it a !! for a reason.",
    ),
    t(
        lambda _: True,
        "Brilliant — the best move, hard to find, and you played it. !!",
    ),
]

MISS_TEMPLATES: list[Template] = [
    t(
        lambda s: s.mate_in_before == 1,
        "Checkmate in one was on the board. "
        "{best} ends the game immediately.",
    ),
    t(
        lambda s: s.mate_in_before is not None and s.mate_in_before <= 3,
        "Forced mate in {mate_before} — {best} starts the mating sequence. "
        "These short combinations are worth training.",
    ),
    t(
        lambda s: s.mate_in_before is not None and s.mate_in_before <= 7,
        "Mate in {mate_before} was available. "
        "{best} is the start. Long combinations are hard to see at the board.",
    ),
    t(
        lambda s: s.mate_in_before is not None,
        "A forced mate in {mate_before} went unplayed. "
        "{best} begins the sequence.",
    ),
    t(
        lambda s: s.ctx_before == "winning" and s.swing_size in ("large", "catastrophic"),
        "The sharpest continuation was {best} — "
        "the winning advantage slipped through.",
    ),
    t(
        lambda _: True,
        "A stronger option was available — "
        "{best} keeps or increases the advantage.",
    ),
]

BOOK_TEMPLATES: list[Template] = [
    t(lambda s: s.move_number <= 3, "Classic opening theory. You're in well-trodden territory."),
    t(
        lambda s: s.move_number <= 8,
        "Still within opening theory. "
        "Knowing these lines gives a solid foundation.",
    ),
    t(lambda s: s.move_number <= 15, "A deep book move — good opening preparation."),
    t(
        lambda _: True,
        "Booed theork move — establishy. "
        "The position is exactly where preparation takes you.",
    ),
]

TEMPLATE_MAP: dict[str, list[Template]] = {
    "blunder": BLUNDER_TEMPLATES,
    "mistake": MISTAKE_TEMPLATES,
    "inaccuracy": INACCURACY_TEMPLATES,
    "good": GOOD_TEMPLATES,
    "excellent": EXCELLENT_TEMPLATES,
    "great": GREAT_TEMPLATES,
    "best": BEST_TEMPLATES,
    "brilliant": BRILLIANT_TEMPLATES,
    "miss": MISS_TEMPLATES,
    "book": BOOK_TEMPLATES,
}
