from app.utils.pgn_hash import pgn_sha256


def test_pgn_sha256_stable_across_trailing_whitespace_lines():
    a = "[Event \"x\"]\n1. e4 e5 *\n"
    b = "[Event \"x\"]\n1. e4 e5 *\n\n"
    assert pgn_sha256(a) == pgn_sha256(b)


def test_pgn_sha256_differs_on_move():
    a = "1. e4 e5 *\n"
    b = "1. e4 c5 *\n"
    assert pgn_sha256(a) != pgn_sha256(b)
