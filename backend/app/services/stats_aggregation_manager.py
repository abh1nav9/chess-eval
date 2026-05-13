"""Cross-game aggregates over the ``moves`` index (analysis.md §7.2)."""

from __future__ import annotations

from typing import Any, Dict, List

from app.db.mongodb import MongoDBClient
from app.db.repositories import AnalysisRepository


class StatsAggregationManager:
    """Read-only aggregations for the stats dashboard."""

    @staticmethod
    async def dashboard_payload() -> Dict[str, Any]:
        moves = MongoDBClient.moves_collection()
        analyses = MongoDBClient.analyses_collection()
        total_analyses = await analyses.count_documents({})
        indexed_moves = await moves.count_documents({})

        by_class: List[Dict[str, Any]] = []
        cursor = moves.aggregate(
            [
                {"$group": {"_id": "$classification", "n": {"$sum": 1}}},
                {"$sort": {"n": -1}},
            ]
        )
        async for row in cursor:
            by_class.append({"classification": row["_id"], "count": row["n"]})

        by_phase: List[Dict[str, Any]] = []
        cursor2 = moves.aggregate(
            [
                {"$match": {"phase": {"$nin": ["", None]}}},
                {
                    "$group": {
                        "_id": "$phase",
                        "avg_cpl": {"$avg": "$centipawn_loss"},
                        "n": {"$sum": 1},
                    }
                },
                {"$sort": {"n": -1}},
            ]
        )
        async for row in cursor2:
            by_phase.append(
                {
                    "phase": row["_id"],
                    "avg_centipawn_loss": round(float(row.get("avg_cpl") or 0), 2),
                    "count": row["n"],
                }
            )

        openings: List[Dict[str, Any]] = []
        cursor3 = moves.aggregate(
            [
                {"$match": {"opening_eco": {"$nin": ["", None]}}},
                {
                    "$group": {
                        "_id": "$opening_eco",
                        "name": {"$first": "$opening_name"},
                        "n": {"$sum": 1},
                        "avg_cpl": {"$avg": "$centipawn_loss"},
                    }
                },
                {"$sort": {"n": -1}},
                {"$limit": 12},
            ]
        )
        async for row in cursor3:
            openings.append(
                {
                    "eco": row["_id"],
                    "name": row.get("name") or "",
                    "games_approx": row["n"],
                    "avg_centipawn_loss": round(float(row.get("avg_cpl") or 0), 2),
                }
            )

        processing, oldest_age = await AnalysisRepository.processing_stats()

        return {
            "analyses_total": total_analyses,
            "indexed_moves": indexed_moves,
            "processing_queue_depth": processing,
            "oldest_processing_age_seconds": oldest_age,
            "classification_histogram": by_class,
            "phase_centipawn_loss": by_phase,
            "top_openings": openings,
        }
