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
    async def list_recent(limit: int = 20, skip: int = 0) -> List[Dict[str, Any]]:
        collection = MongoDBClient.analyses_collection()
        cursor = (
            collection.find({}, {"moves": 0})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
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
