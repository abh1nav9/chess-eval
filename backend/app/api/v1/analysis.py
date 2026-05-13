"""
Analysis API endpoints.
POST /analyze/pgn — Analyze a PGN game
POST /analyze/fen — Analyze a FEN position
GET  /analysis/{analysis_id} — Retrieve a stored analysis
GET  /analyses — List recent analyses
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks

from app.core.exceptions import (
    AnalysisNotFoundError,
    ChessAnalysisError,
    EngineError,
    InvalidFENError,
    InvalidPGNError,
)
from app.schemas.analysis import (
    FENAnalysisRequest,
    PGNAnalysisRequest,
    PGNAnalysisResponse,
    FENAnalysisResponse,
)
from app.services.analysis_service import AnalysisService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["analysis"])


def get_analysis_service() -> AnalysisService:
    """Factory for AnalysisService instances."""
    return AnalysisService()


@router.post("/analyze/pgn")
async def analyze_pgn(request: PGNAnalysisRequest, background_tasks: BackgroundTasks):
    """Analyze a full PGN game asynchronously.

    Parses PGN and returns an analysis_id immediately.
    The analysis progress is broadcasted via WebSockets.
    """
    service = get_analysis_service()
    try:
        result = await service.create_pgn_analysis(
            pgn=request.pgn,
            depth=request.depth,
            background_tasks=background_tasks,
        )
        return result
    except InvalidPGNError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except EngineError as e:
        raise HTTPException(status_code=500, detail=e.message)
    except ChessAnalysisError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error in PGN analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/analyze/fen")
async def analyze_fen(request: FENAnalysisRequest):
    """Analyze a single FEN position.

    Returns evaluation, best move, principal variation, and engine lines.
    """
    service = get_analysis_service()
    try:
        result = await service.create_fen_analysis(
            fen=request.fen,
            num_lines=request.num_lines or 3,
        )
        return result
    except InvalidFENError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except EngineError as e:
        raise HTTPException(status_code=500, detail=e.message)
    except ChessAnalysisError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error in FEN analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Retrieve a stored analysis by its ID."""
    service = get_analysis_service()
    try:
        result = await service.get_analysis(analysis_id)
        return result
    except AnalysisNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except Exception as e:
        logger.error(f"Error retrieving analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analyses")
async def list_analyses(
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    """List recent analyses with pagination."""
    service = get_analysis_service()
    try:
        result = await service.list_analyses(limit=limit, skip=skip)
        return result
    except Exception as e:
        logger.error(f"Error listing analyses: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
