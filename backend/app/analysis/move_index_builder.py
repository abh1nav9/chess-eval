"""Build flat move-index documents from a completed analysis."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from app.models.analysis import AnalysisDocument


class MoveIndexBuilder:
    """Maps ``AnalysisDocument.moves`` into denormalized Mongo rows."""

    @staticmethod
    def build_rows(doc: AnalysisDocument) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        completed = doc.completed_at or now
        eco = (doc.metadata.eco or "").strip()
        opening = (doc.metadata.opening or "").strip()
        white = doc.metadata.white or "Unknown"
        black = doc.metadata.black or "Unknown"
        rows: List[Dict[str, Any]] = []
        for ply, m in enumerate(doc.moves):
            rows.append(
                {
                    "analysis_id": doc.analysis_id,
                    "ply": ply,
                    "move_number": m.move_number,
                    "move_san": m.move,
                    "color": m.color,
                    "classification": m.classification,
                    "centipawn_loss": float(m.centipawn_loss),
                    "phase": (m.phase or "") or "",
                    "fen_before": m.fen_before,
                    "opening_eco": eco,
                    "opening_name": opening,
                    "white_player": white,
                    "black_player": black,
                    "indexed_at": now,
                    "completed_at": completed,
                }
            )
        return rows
