"""Cache deterministic coach messages by position + played move + classification."""

from __future__ import annotations

import logging
from typing import Optional

from app.db.mongodb import MongoDBClient

logger = logging.getLogger(__name__)


class CoachMessageRepository:
    @staticmethod
    async def get(
        fen_before: str, move_uci: str, classification: str
    ) -> Optional[str]:
        col = MongoDBClient.coach_messages_collection()
        doc = await col.find_one(
            {
                "fen_before": fen_before,
                "move_uci": move_uci,
                "classification": classification,
            },
            {"message": 1},
        )
        if doc and "message" in doc:
            return doc["message"]
        return None

    @staticmethod
    async def store(
        fen_before: str,
        move_uci: str,
        classification: str,
        message: str,
    ) -> None:
        col = MongoDBClient.coach_messages_collection()
        try:
            await col.update_one(
                {
                    "fen_before": fen_before,
                    "move_uci": move_uci,
                    "classification": classification,
                },
                {"$set": {"message": message}},
                upsert=True,
            )
        except Exception as e:
            logger.debug("Coach message cache store failed: %s", e)
