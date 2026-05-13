"""Heuristic game phase from a chess.Board (analysis roadmap §1.10)."""

import chess


def detect_game_phase(board: chess.Board) -> str:
    """Return opening | middlegame | endgame for the current position."""
    if board.fullmove_number <= 10:
        return "opening"
    material = sum(
        len(board.pieces(pt, c))
        for pt in (chess.QUEEN, chess.ROOK, chess.BISHOP, chess.KNIGHT)
        for c in (chess.WHITE, chess.BLACK)
    )
    if material <= 6:
        return "endgame"
    return "middlegame"
