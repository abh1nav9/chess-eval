"""Server-side annotated PGN export (analysis.md §4.18 / §7)."""

from __future__ import annotations

import io
from typing import Any, Dict, List

import chess.pgn


class AnnotatedPgnExportFormatter:
    """Rebuilds PGN with per-move comments from stored analysis moves."""

    def build(self, doc: Dict[str, Any]) -> str:
        raw = (doc.get("pgn") or "").strip()
        moves: List[Dict[str, Any]] = doc.get("moves") or []
        if not raw:
            return ""
        game = chess.pgn.read_game(io.StringIO(raw))
        if game is None:
            return raw

        node = game
        mi = 0
        while node.variations and mi < len(moves):
            node = node.variation(0)
            m = moves[mi]
            bits: list[str] = []
            cls = m.get("classification")
            if cls:
                bits.append(str(cls))
            ph = m.get("phase")
            if ph:
                bits.append(str(ph))
            bits.append(f"cp{int(round(float(m.get('centipawn_loss') or 0)))}")
            com = (m.get("comment") or "").strip()
            if com:
                bits.append(com)
            text = " · ".join(bits)
            if text:
                prev = (node.comment or "").strip()
                node.comment = f"{prev} {text}".strip() if prev else text
            mi += 1

        exporter = chess.pgn.StringExporter(headers=True, variations=True, comments=True)
        game.accept(exporter)
        return str(exporter)
