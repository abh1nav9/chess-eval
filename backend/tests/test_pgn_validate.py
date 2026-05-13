"""PGN validation helpers."""

from app.analysis.pgn_parser import validate_pgn_playthrough


def test_validate_mini_game_ok() -> None:
    pgn = '[White "A"]\n[Black "B"]\n\n1. e4 e5 2. Nf3 Nc6 *'
    ok, err = validate_pgn_playthrough(pgn)
    assert ok is True
    assert err is None


def test_validate_no_moves_fails() -> None:
    pgn = '[White "A"]\n[Black "B"]\n\n*'
    ok, err = validate_pgn_playthrough(pgn)
    assert ok is False
    assert err is not None
