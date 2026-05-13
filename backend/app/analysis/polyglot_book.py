"""Optional Polyglot (.bin) opening probe (analysis.md §1.3)."""

from __future__ import annotations

import os
from typing import Optional

import chess
import chess.polyglot


class PolyglotBookProbe:
    """Read-only Polyglot reader; disabled when path missing or invalid."""

    def __init__(self, path: str) -> None:
        self._path = path
        self._reader: chess.polyglot.MemoryMappedReader = chess.polyglot.open_reader(path)

    @classmethod
    def try_open(cls, path: str) -> Optional["PolyglotBookProbe"]:
        p = path.strip()
        if not p or not os.path.isfile(p):
            return None
        try:
            return cls(p)
        except OSError:
            return None

    def close(self) -> None:
        try:
            self._reader.close()
        except Exception:
            pass

    def is_played_move_in_book(self, board: chess.Board, move: chess.Move) -> bool:
        try:
            return any(e.move == move for e in self._reader.find_all(board))
        except Exception:
            return False
