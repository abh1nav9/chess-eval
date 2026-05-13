"""Denormalized per-move rows for cross-game analytics (analysis.md §3.4)."""

from __future__ import annotations

import logging
from typing import Any, List

from app.db.mongodb import MongoDBClient

logger = logging.getLogger(__name__)


class MoveIndexRepository:
    """CRUD for the ``moves`` analytics collection."""

    @staticmethod
    async def delete_for_analysis(analysis_id: str) -> int:
        coll = MongoDBClient.moves_collection()
        result = await coll.delete_many({"analysis_id": analysis_id})
        return int(result.deleted_count)

    @staticmethod
    async def replace_for_analysis(analysis_id: str, rows: List[dict[str, Any]]) -> None:
        coll = MongoDBClient.moves_collection()
        await coll.delete_many({"analysis_id": analysis_id})
        if not rows:
            return
        await coll.insert_many(rows)
