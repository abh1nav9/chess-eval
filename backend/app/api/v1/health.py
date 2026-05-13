"""
Health check endpoint.
"""

from datetime import datetime

from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.common import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Return service health status including dependency checks."""
    settings = get_settings()

    # Check MongoDB
    mongo_status = "unknown"
    try:
        from app.db.mongodb import MongoDBClient
        db = MongoDBClient.get_db()
        await db.command("ping")
        mongo_status = "connected"
    except Exception:
        mongo_status = "disconnected"

    # Check Stockfish binary exists
    import os

    from app.engine.stockfish_probe import StockfishVersionProbe

    sf_status = "available" if os.path.isfile(settings.STOCKFISH_PATH) else "not found"
    sf_version = None
    if sf_status == "available":
        sf_version = await StockfishVersionProbe.read_id_name(settings.STOCKFISH_PATH)

    return HealthResponse(
        status="ok",
        version=settings.APP_VERSION,
        timestamp=datetime.utcnow(),
        mongodb=mongo_status,
        stockfish=sf_status,
        stockfish_version=sf_version,
    )
