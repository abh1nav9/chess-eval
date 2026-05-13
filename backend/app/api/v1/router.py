"""
V1 API router aggregation.
Combines all v1 route modules under a single router.
"""

from fastapi import APIRouter

from app.api.v1.analysis import router as analysis_router
from app.api.v1.chesscom import router as chesscom_router
from app.api.v1.health import router as health_router
from app.api.v1.lichess import router as lichess_router
from app.api.v1.proxy import router as proxy_router
from app.api.v1.repertoire import router as repertoire_router
from app.api.v1.stats import router as stats_router
from app.api.v1.studies import router as studies_router
from app.api.v1.websocket import router as ws_router

v1_router = APIRouter()

v1_router.include_router(health_router)
v1_router.include_router(analysis_router)
v1_router.include_router(chesscom_router)
v1_router.include_router(lichess_router)
v1_router.include_router(proxy_router)
v1_router.include_router(stats_router)
v1_router.include_router(repertoire_router)
v1_router.include_router(studies_router)
v1_router.include_router(ws_router)
