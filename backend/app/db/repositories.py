"""
Repository layer for MongoDB operations.
Encapsulates all database access behind a clean async API.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.core.config import get_settings
from app.db.mongodb import MongoDBClient
from app.models.analysis import AnalysisDocument, PositionCacheDocument

logger = logging.getLogger(__name__)


class AnalysisRepository:
    """CRUD operations for the 'analyses' collection."""

    @staticmethod
    async def create(doc: AnalysisDocument) -> str:
        collection = MongoDBClient.analyses_collection()
        mongo_data = doc.to_mongo()
        try:
            await collection.insert_one(mongo_data)
            return doc.analysis_id
        except Exception as e:
            logger.error(f"Failed to create analysis: {e}")
            raise

    @staticmethod
    async def get_by_id(analysis_id: str) -> Optional[Dict[str, Any]]:
        collection = MongoDBClient.analyses_collection()
        doc = await collection.find_one({"_id": analysis_id})
        if doc:
            doc.pop("_id", None)
        return doc

    @staticmethod
    async def update(analysis_id: str, update_data: Dict[str, Any]) -> bool:
        collection = MongoDBClient.analyses_collection()
        update_data["updated_at"] = datetime.utcnow()
        result = await collection.update_one(
            {"_id": analysis_id}, {"$set": update_data}
        )
        return result.modified_count > 0

    @staticmethod
    async def update_status(analysis_id: str, status: str, error: Optional[str] = None) -> bool:
        update_data: Dict[str, Any] = {"status": status, "updated_at": datetime.utcnow()}
        if status == "completed":
            update_data["completed_at"] = datetime.utcnow()
        if error:
            update_data["error_message"] = error
        collection = MongoDBClient.analyses_collection()
        result = await collection.update_one(
            {"_id": analysis_id}, {"$set": update_data}
        )
        return result.modified_count > 0

    @staticmethod
    async def get_created_at_for_analysis(analysis_id: str) -> Optional[datetime]:
        collection = MongoDBClient.analyses_collection()
        doc = await collection.find_one({"_id": analysis_id}, {"created_at": 1})
        if not doc:
            return None
        return doc.get("created_at")

    @staticmethod
    async def list_recent(
        limit: int = 20,
        skip: int = 0,
        before_created_at: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        collection = MongoDBClient.analyses_collection()
        query: Dict[str, Any] = {}
        if before_created_at is not None:
            query["created_at"] = {"$lt": before_created_at}
        cursor = collection.find(
            query,
            {
                "moves": 0,
                "pgn": 0,
                "summary.white_accuracy": 1,
                "summary.black_accuracy": 1,
                "metadata.opening": 1,
                "metadata.eco": 1,
            },
        ).sort("created_at", -1)
        if before_created_at is None:
            cursor = cursor.skip(skip)
        cursor = cursor.limit(limit)
        results = []
        async for doc in cursor:
            doc.pop("_id", None)
            results.append(doc)
        return results

    @staticmethod
    async def count() -> int:
        collection = MongoDBClient.analyses_collection()
        return await collection.count_documents({})

    @staticmethod
    async def delete(analysis_id: str) -> bool:
        collection = MongoDBClient.analyses_collection()
        result = await collection.delete_one({"_id": analysis_id})
        return result.deleted_count > 0

    @staticmethod
    async def sweep_stale_processing(minutes: int) -> int:
        """Mark long-running processing jobs as failed (server restart / crash)."""
        collection = MongoDBClient.analyses_collection()
        cutoff = datetime.utcnow() - timedelta(minutes=minutes)
        result = await collection.update_many(
            {"status": "processing", "created_at": {"$lt": cutoff}},
            {
                "$set": {
                    "status": "failed",
                    "error_message": "stale_processing_timeout",
                    "updated_at": datetime.utcnow(),
                }
            },
        )
        return int(result.modified_count)

    @staticmethod
    async def processing_stats() -> tuple[int, float | None]:
        """Return (count of processing docs, age in seconds of oldest processing doc)."""
        collection = MongoDBClient.analyses_collection()
        n = await collection.count_documents({"status": "processing"})
        if n == 0:
            return 0, None
        doc = await collection.find_one({"status": "processing"}, sort=[("created_at", 1)])
        if not doc or not doc.get("created_at"):
            return n, None
        created = doc["created_at"]
        age = (datetime.utcnow() - created).total_seconds()
        return n, max(0.0, age)

    @staticmethod
    async def find_completed_ids_by_pgn_hashes(hashes: List[str]) -> Dict[str, str]:
        """Map pgn_hash -> newest completed analysis_id."""
        if not hashes:
            return {}
        collection = MongoDBClient.analyses_collection()
        out: Dict[str, str] = {}
        cursor = collection.aggregate(
            [
                {"$match": {"pgn_hash": {"$in": hashes}, "status": "completed"}},
                {"$sort": {"created_at": -1}},
                {"$group": {"_id": "$pgn_hash", "aid": {"$first": "$analysis_id"}}},
            ]
        )
        async for row in cursor:
            hid = row.get("_id")
            aid = row.get("aid")
            if isinstance(hid, str) and isinstance(aid, str):
                out[hid] = aid
        return out


class PgnContentRepository:
    """Deduplicated full PGN text by SHA-256 (analysis.md §3.3)."""

    @staticmethod
    async def upsert(pgn_hash: str, pgn_text: str) -> None:
        coll = MongoDBClient.pgns_collection()
        now = datetime.utcnow()
        await coll.update_one(
            {"_id": pgn_hash},
            {
                "$set": {"pgn": pgn_text, "updated_at": now},
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )


class ChessComProfileCacheRepository:
    """TTL-cached Chess.com ``pub/player`` JSON (analysis.md §2.2 / §5.4)."""

    @staticmethod
    async def get_json(username: str) -> Optional[Dict[str, Any]]:
        coll = MongoDBClient.chesscom_profile_cache_collection()
        doc = await coll.find_one({"_id": username.lower()})
        if not doc:
            return None
        payload = doc.get("payload")
        return payload if isinstance(payload, dict) else None

    @staticmethod
    async def put_json(username: str, payload: Dict[str, Any]) -> None:
        coll = MongoDBClient.chesscom_profile_cache_collection()
        await coll.update_one(
            {"_id": username.lower()},
            {"$set": {"payload": payload, "cached_at": datetime.utcnow()}},
            upsert=True,
        )


class PositionCacheRepository:
    """CRUD operations for the 'engine_cache' collection."""

    @staticmethod
    async def get_cached(fen_hash: str, min_depth: int = 0) -> Optional[Dict[str, Any]]:
        collection = MongoDBClient.engine_cache_collection()
        doc = await collection.find_one(
            {"fen_hash": fen_hash, "depth": {"$gte": min_depth}},
            sort=[("depth", -1)],
        )
        if doc:
            doc.pop("_id", None)
        return doc

    @staticmethod
    async def cache_position(doc: PositionCacheDocument) -> None:
        settings = get_settings()
        doc.expires_at = datetime.utcnow() + timedelta(seconds=settings.CACHE_TTL_SECONDS)
        collection = MongoDBClient.engine_cache_collection()
        mongo_data = doc.to_mongo()
        try:
            await collection.replace_one(
                {"_id": mongo_data["_id"]}, mongo_data, upsert=True
            )
        except Exception as e:
            logger.warning(f"Failed to cache position: {e}")

    @staticmethod
    async def invalidate(fen_hash: str) -> None:
        collection = MongoDBClient.engine_cache_collection()
        await collection.delete_many({"fen_hash": fen_hash})
