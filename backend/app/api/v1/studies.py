"""CRUD API for studies (analysis.md §7.7)."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db.study_repository import StudyRepository
from app.models.study import StudyChapter, StudyDocument

router = APIRouter(tags=["studies"])


class StudyCreateRequest(BaseModel):
    title: str = "New study"


class StudyPatchRequest(BaseModel):
    title: Optional[str] = None
    chapters: Optional[List[StudyChapter]] = None


@router.get("/studies")
async def list_studies() -> Dict[str, Any]:
    items = await StudyRepository.list_ids_titles(80)
    return {"items": items}


@router.post("/studies")
async def create_study(body: StudyCreateRequest) -> Dict[str, Any]:
    doc = StudyDocument(title=body.title.strip() or "New study")
    sid = await StudyRepository.create(doc)
    return {"study_id": sid}


@router.get("/studies/{study_id}")
async def get_study(study_id: str) -> Dict[str, Any]:
    doc = await StudyRepository.get(study_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Study not found")
    return doc


@router.patch("/studies/{study_id}")
async def patch_study(study_id: str, body: StudyPatchRequest) -> Dict[str, Any]:
    payload: Dict[str, Any] = {}
    if body.title is not None:
        payload["title"] = body.title.strip()
    if body.chapters is not None:
        payload["chapters"] = [c.model_dump() for c in body.chapters]
    ok = await StudyRepository.update(study_id, payload)
    if not ok and not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    doc = await StudyRepository.get(study_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Study not found")
    return doc


@router.delete("/studies/{study_id}")
async def delete_study(study_id: str) -> Dict[str, Any]:
    ok = await StudyRepository.delete(study_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Study not found")
    return {"deleted": True, "study_id": study_id}
