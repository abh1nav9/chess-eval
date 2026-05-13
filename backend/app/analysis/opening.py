"""ECO opening detection using FEN-keyed hayatbiralem/eco.json dataset.

Data files (backend/data/):
  ecoA.json .. ecoE.json — primary ECO positions keyed by FEN
  eco_interpolated.json  — intermediate positions for deeper book detection
"""

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Dict, FrozenSet, List, Optional, Tuple

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

ECO_PRIMARY_FILES = ["ecoA.json", "ecoB.json", "ecoC.json", "ecoD.json", "ecoE.json"]
ECO_INTERPOLATED_FILE = "eco_interpolated.json"


@lru_cache(maxsize=1)
def _load_eco_table() -> Dict[str, Dict[str, str]]:
    """Load all ECO files into a single FEN-keyed lookup table.

    The hayatbiralem dataset uses full FEN as keys and objects with
    'eco', 'name', 'moves', and optional 'aliases'.
    """
    table: Dict[str, Dict[str, str]] = {}

    for filename in ECO_PRIMARY_FILES:
        path = DATA_DIR / filename
        if not path.exists():
            logger.warning("ECO file missing: %s", path)
            continue
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        for fen_key, entry in data.items():
            table[fen_key] = {"eco": entry.get("eco", ""), "name": entry.get("name", "")}

    # Interpolated positions fill gaps between named positions
    interp_path = DATA_DIR / ECO_INTERPOLATED_FILE
    if interp_path.exists():
        with open(interp_path, encoding="utf-8") as f:
            data = json.load(f)
        for fen_key, entry in data.items():
            if fen_key not in table:
                table[fen_key] = {"eco": entry.get("eco", ""), "name": entry.get("name", "")}

    if table:
        logger.info("Loaded %d ECO positions", len(table))
    else:
        logger.warning("No ECO data loaded — opening detection disabled")

    return table


def _normalize_fen_key(fen: str) -> str:
    """The dataset keys include move counters. Return FEN as-is for direct lookup."""
    return fen.strip()


def _fen_epd4(fen: str) -> str:
    """Board + side + castling + en passant (ignore halfmove / fullmove counters)."""
    parts = fen.strip().split()
    if len(parts) >= 4:
        return " ".join(parts[:4])
    return fen.strip()


# python-chess start FEN, first four fields — ECO JSON usually omits this full key.
_STANDARD_START_EPD4 = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -"


def _fen_in_eco_table(fen: str, eco_table: Dict[str, Dict[str, str]], epd4_keys: FrozenSet[str]) -> bool:
    key = _normalize_fen_key(fen)
    if key in eco_table:
        return True
    return _fen_epd4(key) in epd4_keys


def opening_book_depth(fens: List[str]) -> int:
    """Return last move index still in consecutive opening theory (ECO table).

    A move index ``i`` is book only if every ``fen_before`` from ``0`` through ``i`` is
    present in the ECO dataset **without gaps** — the first missing FEN ends the book
    window. This matches leaving theory once; the old implementation used the *maximum*
    hit index anywhere in the game, which wrongly marked midgame moves as book when a
    later position appeared in interpolated data.

    Positions are matched by full FEN key or by the first four FEN fields (EPD-style),
    because dataset keys can differ in halfmove / fullmove from python-chess. The
    standard initial position is usually absent from the JSON; move ``0`` still counts
    as the book root so the first played moves can be marked book.

    Capped by ``OPENING_ECO_MAX_BOOK_PLY`` so very deep ECO chains still leave accuracy
    to engine-graded moves like Chess.com after the opening phase.
    """
    from app.core.config import get_settings

    eco_table = _load_eco_table()
    if not eco_table or not fens:
        return -1
    cap = max(0, get_settings().OPENING_ECO_MAX_BOOK_PLY)
    epd4_keys = frozenset(_fen_epd4(k) for k in eco_table)
    last_book_ply = -1
    for i, fen in enumerate(fens):
        if i >= cap:
            break
        key = _normalize_fen_key(fen)
        in_eco = _fen_in_eco_table(fen, eco_table, epd4_keys)
        if not in_eco and i == 0 and _fen_epd4(key) == _STANDARD_START_EPD4:
            in_eco = True
        if not in_eco:
            break
        last_book_ply = i
    return last_book_ply


def detect_opening(fens: List[str]) -> Tuple[Optional[str], Optional[str]]:
    """Walk FEN history backwards and return (eco, name) for the deepest book match.

    Args:
        fens: list of FEN strings from the game (fen_before for each move).

    Returns:
        (eco_code, opening_name) or (None, None) if no match.
    """
    eco_table = _load_eco_table()
    if not eco_table:
        return None, None
    epd_first: Dict[str, Dict[str, str]] = {}
    for k, e in eco_table.items():
        epd = _fen_epd4(k)
        if epd not in epd_first:
            epd_first[epd] = e
    for fen in reversed(fens):
        key = _normalize_fen_key(fen)
        entry = eco_table.get(key) or epd_first.get(_fen_epd4(key))
        if entry:
            return entry.get("eco"), entry.get("name")
    return None, None
