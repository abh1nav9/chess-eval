"""
PGN parsing utilities using python-chess.
Converts PGN strings into structured move data for the analysis pipeline.
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import chess
import chess.pgn
import io

logger = logging.getLogger(__name__)


@dataclass
class ParsedMove:
    """A single parsed move with board context."""
    move_number: int
    san: str  # Standard Algebraic Notation (e.g., "Nf3")
    uci: str  # UCI notation (e.g., "g1f3")
    color: str  # "white" or "black"
    fen_before: str
    fen_after: str
    is_check: bool = False
    is_capture: bool = False
    is_castle: bool = False
    comment: str = ""


@dataclass
class ParsedGame:
    """A fully parsed PGN game."""
    headers: Dict[str, str] = field(default_factory=dict)
    moves: List[ParsedMove] = field(default_factory=list)
    initial_fen: str = chess.STARTING_FEN
    result: str = "*"

    @property
    def white(self) -> str:
        return self.headers.get("White", "Unknown")

    @property
    def black(self) -> str:
        return self.headers.get("Black", "Unknown")


def parse_pgn(pgn_string: str) -> ParsedGame:
    """Parse a PGN string into a structured ParsedGame.

    Args:
        pgn_string: Complete PGN text of one game.

    Returns:
        ParsedGame with headers, moves, and FEN history.

    Raises:
        ValueError: If the PGN cannot be parsed.
    """
    pgn_io = io.StringIO(pgn_string.strip())
    game = chess.pgn.read_game(pgn_io)

    if game is None:
        raise ValueError("Failed to parse PGN: no game found")

    # Extract headers
    headers = dict(game.headers)

    # Set up the board (handle games starting from a specific FEN)
    initial_fen = headers.get("FEN", chess.STARTING_FEN)
    board = chess.Board(initial_fen)

    parsed_moves: List[ParsedMove] = []
    move_number = 1

    node = game
    while node.variations:
        node = node.variation(0)
        move = node.move
        comment = (node.comment or "").strip()

        fen_before = board.fen()

        san = board.san(move)
        uci = move.uci()
        is_capture = board.is_capture(move)
        is_castle = board.is_castling(move)
        color = "white" if board.turn == chess.WHITE else "black"

        board.push(move)

        fen_after = board.fen()
        is_check = board.is_check()

        parsed_moves.append(
            ParsedMove(
                move_number=move_number,
                san=san,
                uci=uci,
                color=color,
                fen_before=fen_before,
                fen_after=fen_after,
                is_check=is_check,
                is_capture=is_capture,
                is_castle=is_castle,
                comment=comment,
            )
        )

        if color == "black":
            move_number += 1

    result = headers.get("Result", "*")

    return ParsedGame(
        headers=headers,
        moves=parsed_moves,
        initial_fen=initial_fen,
        result=result,
    )


def validate_pgn(pgn_string: str) -> bool:
    """Check if a PGN string is valid and parseable."""
    ok, _ = validate_pgn_playthrough(pgn_string)
    return ok


def validate_pgn_playthrough(pgn_string: str) -> tuple[bool, str | None]:
    """Parse PGN and replay all mainline moves; return (ok, error_message)."""
    try:
        pg = parse_pgn(pgn_string)
        if len(pg.moves) == 0:
            return False, "PGN contains no moves"
        return True, None
    except ValueError as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)
