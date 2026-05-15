from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import chess

from app.models.analysis import MoveDocument

PieceType = Literal["pawn", "knight", "bishop", "rook", "queen", "king"]
Phase = Literal["opening", "middlegame", "endgame"]
EvalCtx = Literal["winning", "equal", "losing"]
SwingSize = Literal["tiny", "small", "medium", "large", "catastrophic"]

PIECE_NAMES: dict[int, PieceType] = {
    chess.PAWN: "pawn",
    chess.KNIGHT: "knight",
    chess.BISHOP: "bishop",
    chess.ROOK: "rook",
    chess.QUEEN: "queen",
    chess.KING: "king",
}


@dataclass(frozen=True)
class MoveSignals:
    classification: str
    piece: PieceType
    captured_piece: PieceType | None
    is_capture: bool
    is_check: bool
    is_castle: bool
    is_promotion: bool
    is_en_passant: bool
    is_sacrifice: bool
    eval_before: float
    eval_after: float
    ctx_before: EvalCtx
    ctx_after: EvalCtx
    had_mate_before: bool
    has_mate_after: bool
    opponent_has_mate: bool
    mate_in_before: int | None
    mate_in_after: int | None
    eval_swing: float
    swing_size: SwingSize
    phase: Phase
    move_number: int
    color: Literal["white", "black"]
    san: str
    from_square: str
    to_square: str
    best_move_san: str | None
    best_move_same: bool


def _piece_name(piece_type: int | None) -> PieceType | None:
    if piece_type is None:
        return None
    return PIECE_NAMES.get(piece_type)


def _eval_ctx(eval_pawns: float, color: str) -> EvalCtx:
    sided = eval_pawns if color == "white" else -eval_pawns
    if sided > 0.8:
        return "winning"
    if sided < -0.8:
        return "losing"
    return "equal"


def _swing_size(abs_swing: float) -> SwingSize:
    if abs_swing < 0.30:
        return "tiny"
    if abs_swing < 0.80:
        return "small"
    if abs_swing < 2.00:
        return "medium"
    if abs_swing < 5.00:
        return "large"
    return "catastrophic"


def _sided_swing(eval_before: float, eval_after: float, color: str) -> float:
    if color == "white":
        return eval_before - eval_after
    return eval_after - eval_before


def _parse_move_geometry(
    board_before: chess.Board, move_uci: str
) -> tuple[str, str, int, int | None, bool, bool, bool]:
    """Return from_sq, to_sq, piece_type, captured_type, promotion, en_passant."""
    try:
        mv = chess.Move.from_uci(move_uci)
    except ValueError:
        return "", "", chess.PAWN, None, False, False

    from_sq = chess.square_name(mv.from_square)
    to_sq = chess.square_name(mv.to_square)
    piece = board_before.piece_at(mv.from_square)
    piece_type = piece.piece_type if piece else chess.PAWN

    captured = board_before.piece_at(mv.to_square)
    captured_type = captured.piece_type if captured else None
    is_promotion = mv.promotion is not None
    is_en_passant = board_before.is_en_passant(mv)

    if is_en_passant:
        cap_sq = mv.to_square + (-8 if board_before.turn == chess.WHITE else 8)
        cap_piece = board_before.piece_at(cap_sq)
        captured_type = cap_piece.piece_type if cap_piece else chess.PAWN

    return from_sq, to_sq, piece_type, captured_type, is_promotion, is_en_passant


def _normalize_phase(phase: str | None) -> Phase:
    if phase in ("opening", "middlegame", "endgame"):
        return phase  # type: ignore[return-value]
    return "middlegame"


def extract_signals(
    doc: MoveDocument,
    *,
    mate_in_before: int | None,
    board_before: chess.Board,
) -> MoveSignals:
    color: Literal["white", "black"] = "white" if doc.color == "white" else "black"

    from_sq, to_sq, piece_type, captured_type, is_promotion, is_en_passant = (
        _parse_move_geometry(board_before, doc.move_uci)
    )
    is_capture = doc.is_capture or captured_type is not None

    swing = _sided_swing(doc.eval_before, doc.eval_after, color)
    abs_swing = abs(swing)

    mb = mate_in_before
    ma = doc.mate_in

    if color == "white":
        had_mate_before = mb is not None and mb > 0
        has_mate_after = ma is not None and ma > 0
        opponent_has_mate = ma is not None and ma < 0
        mate_before_val = abs(mb) if had_mate_before and mb is not None else None
        mate_after_val = (
            abs(ma)
            if ma is not None and (has_mate_after or opponent_has_mate)
            else None
        )
    else:
        had_mate_before = mb is not None and mb < 0
        has_mate_after = ma is not None and ma < 0
        opponent_has_mate = ma is not None and ma > 0
        mate_before_val = abs(mb) if had_mate_before and mb is not None else None
        mate_after_val = (
            abs(ma)
            if ma is not None and (has_mate_after or opponent_has_mate)
            else None
        )

    is_sacrifice = swing < -0.5 and is_capture

    phase = _normalize_phase(doc.phase)
    best_san = doc.best_move

    return MoveSignals(
        classification=doc.classification,
        piece=_piece_name(piece_type) or "pawn",
        captured_piece=_piece_name(captured_type),
        is_capture=is_capture,
        is_check=doc.is_check,
        is_castle=doc.is_castle,
        is_promotion=is_promotion,
        is_en_passant=is_en_passant,
        is_sacrifice=is_sacrifice,
        eval_before=doc.eval_before,
        eval_after=doc.eval_after,
        ctx_before=_eval_ctx(doc.eval_before, color),
        ctx_after=_eval_ctx(doc.eval_after, color),
        had_mate_before=had_mate_before,
        has_mate_after=has_mate_after,
        opponent_has_mate=opponent_has_mate,
        mate_in_before=mate_before_val,
        mate_in_after=mate_after_val,
        eval_swing=abs_swing,
        swing_size=_swing_size(abs_swing),
        phase=phase,
        move_number=doc.move_number,
        color=color,
        san=doc.move,
        from_square=from_sq,
        to_square=to_sq,
        best_move_san=best_san,
        best_move_same=best_san == doc.move if best_san else False,
    )
