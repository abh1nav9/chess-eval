"""Lightweight cross-game stats (roadmap §7.2)."""

from fastapi import APIRouter

from app.db.repositories import AnalysisRepository
from app.services.stats_aggregation_manager import StatsAggregationManager

router = APIRouter(tags=["stats"])


@router.get("/stats/summary")
async def stats_summary():
    """Return aggregate counts for stored analyses."""
    try:
        total = await AnalysisRepository.count()
        processing, oldest_age = await AnalysisRepository.processing_stats()
    except Exception:
        total, processing, oldest_age = 0, 0, None
    return {
        "analyses_total": total,
        "processing_queue_depth": processing,
        "oldest_processing_age_seconds": oldest_age,
    }


@router.get("/stats/dashboard")
async def stats_dashboard():
    """Cross-game aggregates from the ``moves`` index."""
    try:
        return await StatsAggregationManager.dashboard_payload()
    except Exception:
        return {
            "analyses_total": 0,
            "indexed_moves": 0,
            "processing_queue_depth": 0,
            "oldest_processing_age_seconds": None,
            "classification_histogram": [],
            "phase_centipawn_loss": [],
            "top_openings": [],
        }
