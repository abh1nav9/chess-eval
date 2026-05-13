"""
FEN validation and hashing utilities.
"""

import hashlib

import chess


def validate_fen(fen: str) -> bool:
    """Validate a FEN string using python-chess."""
    try:
        board = chess.Board(fen)
        # Check if the position is valid
        if not board.is_valid():
            return False
        return True
    except (ValueError, Exception):
        return False


def fen_to_hash(fen: str) -> str:
    """Generate a deterministic hash for a FEN position.
    
    We hash only the board position + side to move + castling + en passant,
    ignoring halfmove clock and fullmove number for cache purposes.
    """
    parts = fen.strip().split()
    # Use first 4 fields: position, side-to-move, castling, en-passant
    key = " ".join(parts[:4]) if len(parts) >= 4 else fen.strip()
    return hashlib.sha256(key.encode()).hexdigest()[:16]


def normalize_fen(fen: str) -> str:
    """Normalize a FEN string to canonical form."""
    try:
        board = chess.Board(fen)
        return board.fen()
    except (ValueError, Exception):
        return fen.strip()
