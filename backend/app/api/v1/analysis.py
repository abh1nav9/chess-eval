"""
Analysis API endpoints.
POST /analyze/pgn — Analyze a PGN game
POST /analyze/fen — Analyze a FEN position
GET  /analysis/{analysis_id} — Retrieve a stored analysis
GET  /analyses — List recent analyses
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, File, UploadFile
from fastapi.responses import PlainTextResponse, HTMLResponse

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
        raise HTTPException(status_code=e.status_code, detail=e.message) from e
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


@router.get("/analysis/{analysis_id}/export", response_class=PlainTextResponse)
async def export_analysis_pgn(
    analysis_id: str,
    format: str = Query("pgn", description="Only ``pgn`` is supported"),
):
    """Annotated PGN download (analysis.md §4.18)."""
    if format.lower() != "pgn":
        raise HTTPException(status_code=400, detail="Only format=pgn is supported")
    from app.analysis.pgn_export import AnnotatedPgnExportFormatter

    service = get_analysis_service()
    try:
        doc = await service.get_analysis(analysis_id)
    except AnalysisNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message) from e
    txt = AnnotatedPgnExportFormatter().build(doc)
    return PlainTextResponse(txt, media_type="text/plain; charset=utf-8")


@router.get("/analysis/{analysis_id}/report", response_class=HTMLResponse)
async def analysis_report_html(
    analysis_id: str,
    format: str = Query("html", description="Only ``html`` supported in MVP"),
):
    """Shareable HTML report (analysis.md §7.3)."""
    if format.lower() != "html":
        raise HTTPException(status_code=400, detail="Only format=html is supported")
    from app.analysis.html_report_builder import AnalysisHtmlReportBuilder

    service = get_analysis_service()
    try:
        doc = await service.get_analysis(analysis_id)
    except AnalysisNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message) from e
    body = AnalysisHtmlReportBuilder.build(doc)
    return HTMLResponse(body, media_type="text/html; charset=utf-8")


@router.post("/analyze/pgn/bulk")
async def analyze_pgn_bulk(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Multi-game PGN file — each game queued separately (analysis.md §7.4)."""
    service = get_analysis_service()
    try:
        raw = await file.read()
        return await service.create_bulk_pgn_jobs(raw, background_tasks=background_tasks)
    except InvalidPGNError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e
    except ChessAnalysisError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e
    except Exception as e:
        logger.error("bulk PGN: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Could not parse bulk PGN") from e


@router.delete("/analysis/{analysis_id}")
async def delete_analysis(analysis_id: str):
    service = get_analysis_service()
    deleted = await service.delete_analysis(analysis_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {"deleted": True, "analysis_id": analysis_id}


@router.post("/analysis/{analysis_id}/reanalyze")
async def reanalyze_stored(analysis_id: str, background_tasks: BackgroundTasks):
    """Enqueue a new PGN analysis using the stored game from ``analysis_id``."""
    service = get_analysis_service()
    try:
        return await service.reanalyze_from_stored(analysis_id, background_tasks)
    except AnalysisNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message) from e
    except InvalidPGNError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e
    except ChessAnalysisError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e


@router.get("/analyses")
async def list_analyses(
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    before: Optional[str] = Query(
        None,
        description="Optional analysis_id: return analyses older than this row (cursor pagination).",
    ),
):
    """List recent analyses with offset or cursor pagination."""
    service = get_analysis_service()
    try:
        result = await service.list_analyses(limit=limit, skip=skip, before=before)
        return result
    except Exception as e:
        logger.error(f"Error listing analyses: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
