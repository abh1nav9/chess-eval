"""Lichess-style study documents (analysis.md §7.7 MVP)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List

from pydantic import BaseModel, Field


def _gen_id() -> str:
    return uuid.uuid4().hex


class StudyChapter(BaseModel):
    chapter_id: str = Field(default_factory=_gen_id)
    title: str = "Chapter"
    start_fen: str = ""
    mainline_pgn: str = ""
    notes_by_ply: Dict[str, str] = Field(default_factory=dict)


class StudyDocument(BaseModel):
    study_id: str = Field(default_factory=_gen_id)
    title: str = "New study"
    chapters: List[StudyChapter] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def to_mongo(self) -> Dict[str, Any]:
        d = self.model_dump()
        d["_id"] = d["study_id"]
        return d
