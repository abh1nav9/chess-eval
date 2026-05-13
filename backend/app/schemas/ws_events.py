"""Typed WebSocket payloads for analysis progress (JSON over WS)."""

from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class ProgressEvent(BaseModel):
    type: Literal["progress"] = "progress"
    analysis_id: Optional[str] = None
    move_index: int = 0
    total_moves: int = 0
    percentage: float = 0.0
    current_san: Optional[str] = None
    status_message: Optional[str] = None
    last_move: Optional[dict[str, Any]] = None


class CompletedEvent(BaseModel):
    type: Literal["completed"] = "completed"
    analysis_id: str
    result: dict[str, Any]


class FailedEvent(BaseModel):
    type: Literal["failed"] = "failed"
    analysis_id: str
    error: str = Field(..., min_length=1)
