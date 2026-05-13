"""opening_book_depth must be consecutive from the start (not max hit index)."""

from unittest.mock import patch

from app.analysis import opening as opening_mod


def test_opening_book_depth_stops_at_first_gap():
    fens = ["A", "B", "MISS", "D", "E"]
    table = {"A": {}, "B": {}, "D": {}, "E": {}}

    with patch.object(opening_mod, "_load_eco_table", return_value=table):
        with patch.object(opening_mod, "_normalize_fen_key", side_effect=lambda x: x):
            assert opening_mod.opening_book_depth(fens) == 1


def test_opening_book_depth_standard_start_waiver_then_consecutive():
    """ECO JSON often omits the initial FEN key; move 0 must still start a book chain."""
    start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    after_e4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
    fens = [start, after_e4, "NOT_IN_BOOK"]
    table = {after_e4: {}}

    with patch.object(opening_mod, "_load_eco_table", return_value=table):
        with patch.object(opening_mod, "_normalize_fen_key", side_effect=lambda x: x):
            assert opening_mod.opening_book_depth(fens) == 1


def test_opening_book_depth_respects_cap(monkeypatch):
    from unittest.mock import MagicMock

    fens = [f"p{i}" for i in range(30)]
    table = {f"p{i}": {} for i in range(30)}
    fake = MagicMock()
    fake.OPENING_ECO_MAX_BOOK_PLY = 5
    monkeypatch.setattr("app.core.config.get_settings", lambda: fake)

    with patch.object(opening_mod, "_load_eco_table", return_value=table):
        with patch.object(opening_mod, "_normalize_fen_key", side_effect=lambda x: x):
            assert opening_mod.opening_book_depth(fens) == 4
