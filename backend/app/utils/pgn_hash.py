"""Stable PGN fingerprint for deduplication and Chess.com flags."""

import hashlib


def pgn_sha256(pgn: str) -> str:
    normalized = "\n".join(line.rstrip() for line in pgn.strip().splitlines())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()
