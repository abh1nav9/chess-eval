"""
V1 API router aggregation.
Combines all v1 route modules under a single router.
"""

from fastapi import APIRouter

from app.api.v1.analysis import router as analysis_router
from app.api.v1.health import router as health_router
from app.api.v1.websocket import router as ws_router

v1_router = APIRouter()

v1_router.include_router(health_router)
v1_router.include_router(analysis_router)
v1_router.include_router(ws_router)
