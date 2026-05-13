"""Typed Pydantic models for every WebSocket event."""

from typing import Literal, Optional
from pydantic import BaseModel
from app.models.analysis import MoveDocument


class ProgressEvent(BaseModel):
    type: Literal["progress"] = "progress"
    move_index: int
    total_moves: int
    percentage: float
    current_san: Optional[str] = None
    last_move: Optional[MoveDocument] = None
    status: Optional[str] = None


class CompletedEvent(BaseModel):
    type: Literal["completed"] = "completed"
    analysis_id: str
    result: dict


class FailedEvent(BaseModel):
    type: Literal["failed"] = "failed"
    analysis_id: str
    error: str
