"""Persistence for user studies (analysis.md §7.7)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from app.db.mongodb import MongoDBClient
from app.models.study import StudyDocument


class StudyRepository:
    @staticmethod
    async def create(doc: StudyDocument) -> str:
        coll = MongoDBClient.studies_collection()
        await coll.insert_one(doc.to_mongo())
        return doc.study_id

    @staticmethod
    async def list_ids_titles(limit: int = 50) -> List[Dict[str, Any]]:
        coll = MongoDBClient.studies_collection()
        out: List[Dict[str, Any]] = []
        async for row in coll.find({}, {"_id": 1, "title": 1, "updated_at": 1}).sort("updated_at", -1).limit(
            limit
        ):
            out.append(
                {
                    "study_id": row["_id"],
                    "title": row.get("title") or "",
                    "updated_at": row.get("updated_at"),
                }
            )
        return out

    @staticmethod
    async def get(study_id: str) -> Optional[Dict[str, Any]]:
        coll = MongoDBClient.studies_collection()
        doc = await coll.find_one({"_id": study_id})
        if doc:
            doc.pop("_id", None)
            doc["study_id"] = study_id
        return doc

    @staticmethod
    async def update(study_id: str, payload: Dict[str, Any]) -> bool:
        coll = MongoDBClient.studies_collection()
        payload = {k: v for k, v in payload.items() if k in ("title", "chapters")}
        if not payload:
            return False
        payload["updated_at"] = datetime.utcnow()
        r = await coll.update_one({"_id": study_id}, {"$set": payload})
        return r.modified_count > 0

    @staticmethod
    async def delete(study_id: str) -> bool:
        coll = MongoDBClient.studies_collection()
        r = await coll.delete_one({"_id": study_id})
        return r.deleted_count > 0
