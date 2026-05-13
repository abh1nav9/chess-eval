"""ECO opening detection using FEN-keyed hayatbiralem/eco.json dataset.

Data files (backend/data/):
  ecoA.json .. ecoE.json — primary ECO positions keyed by FEN
  eco_interpolated.json  — intermediate positions for deeper book detection
"""

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional, Tuple

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


def opening_book_depth(fens: List[str]) -> int:
    """Return the index of the last fen_before that's in the ECO table.

    All moves with index <= returned value are considered "book" moves.
    Returns -1 if no match found.
    """
    eco_table = _load_eco_table()
    if not eco_table:
        return -1
    last_book_ply = -1
    for i, fen in enumerate(fens):
        key = _normalize_fen_key(fen)
        if key in eco_table:
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
    for fen in reversed(fens):
        key = _normalize_fen_key(fen)
        if key in eco_table:
            entry = eco_table[key]
            return entry.get("eco"), entry.get("name")
    return None, None
