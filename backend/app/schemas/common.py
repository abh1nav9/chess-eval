"""
Shared/common schemas used across the API.
"""

from datetime import datetime
from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    version: str = ""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    mongodb: str = "unknown"
    stockfish: str = "unknown"
    stockfish_version: Optional[str] = Field(
        None, description="UCI id name string from the configured binary, if available"
    )


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Human-readable error message")
    detail: Optional[Any] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PaginatedResponse(BaseModel):
    """Paginated list response wrapper."""
    items: list = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 20
    has_more: bool = False


class SuccessResponse(BaseModel):
    """Generic success response."""
    success: bool = True
    message: str = ""
    data: Optional[Any] = None
