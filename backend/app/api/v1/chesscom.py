"""Proxy Chess.com Published Data API for recent games (no browser CORS)."""

import logging
import time

from fastapi import APIRouter, HTTPException, Query

from app.core.chess_com_errors import ChessComUpstreamError, ChessComUserNotFoundError
from app.db.repositories import AnalysisRepository
from app.schemas.chesscom import ChessComRecentGamesResponse
from app.services.chess_com_archive_client import ChessComArchiveClient, normalize_username
from app.utils.pgn_hash import pgn_sha256

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chess.com"])

_LAST_FETCH_MONO: dict[str, float] = {}
_MIN_INTERVAL_SEC = 30.0


async def _attach_analysis_flags(resp: ChessComRecentGamesResponse) -> ChessComRecentGamesResponse:
    if not resp.games:
        return resp
    hashes = [pgn_sha256(g.pgn) for g in resp.games]
    m = await AnalysisRepository.find_completed_ids_by_pgn_hashes(hashes)
    games = []
    for g in resp.games:
        h = pgn_sha256(g.pgn)
        aid = m.get(h)
        games.append(
            g.model_copy(update={"already_analysed": aid is not None, "analysis_id": aid})
        )
    return resp.model_copy(update={"games": games})


@router.get("/chesscom/player/{username}/recent-games", response_model=ChessComRecentGamesResponse)
async def get_recent_games(
    username: str,
    limit: int = Query(10, ge=1, le=31, description="Max games to return (newest first)"),
    time_class: str | None = Query(
        None,
        description="Filter by Chess.com time_class, e.g. blitz, rapid, bullet, daily",
    ),
) -> ChessComRecentGamesResponse:
    """List recent finished games for a public Chess.com profile."""
    client: ChessComArchiveClient | None = None
    try:
        try:
            key = normalize_username(username)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

        cache_key = f"{key}:recent:{limit}:{time_class or 'all'}"
        now = time.monotonic()
        last = _LAST_FETCH_MONO.get(cache_key, 0.0)
        if now - last < _MIN_INTERVAL_SEC:
            raise HTTPException(
                status_code=429,
                detail=f"Wait {_MIN_INTERVAL_SEC:.0f}s before reloading the same profile.",
            )
        _LAST_FETCH_MONO[cache_key] = now

        client = ChessComArchiveClient()
        raw = await client.fetch_recent_games(username, limit, time_class)
        return await _attach_analysis_flags(raw)
    except ChessComUserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except ChessComUpstreamError as e:
        logger.warning("Chess.com upstream: %s", e)
        raise HTTPException(status_code=502, detail=str(e)) from e
    except Exception as e:
        logger.error("Chess.com proxy error: %s", e, exc_info=True)
        raise HTTPException(status_code=502, detail="Failed to load games from Chess.com") from e
    finally:
        if client is not None:
            await client.aclose()


@router.get("/chesscom/player/{username}/games", response_model=ChessComRecentGamesResponse)
async def get_games_for_month(
    username: str,
    year: int = Query(..., ge=1990, le=2100),
    month: int = Query(..., ge=1, le=12),
    time_class: str | None = Query(
        None,
        description="Filter by Chess.com time_class, e.g. blitz, rapid, bullet, classical",
    ),
) -> ChessComRecentGamesResponse:
    """Games from a specific archive month (analysis.md §5.1) with optional ``time_class`` (§5.2)."""
    client: ChessComArchiveClient | None = None
    try:
        try:
            key = normalize_username(username)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

        now = time.monotonic()
        cache_key = f"{key}:{year}:{month}:{time_class or 'all'}"
        last = _LAST_FETCH_MONO.get(cache_key, 0.0)
        if now - last < _MIN_INTERVAL_SEC:
            raise HTTPException(
                status_code=429,
                detail=f"Wait {_MIN_INTERVAL_SEC:.0f}s before repeating the same archive request.",
            )
        _LAST_FETCH_MONO[cache_key] = now

        client = ChessComArchiveClient()
        raw = await client.fetch_games_for_month(username, year, month, time_class)
        return await _attach_analysis_flags(raw)
    except ChessComUserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except ChessComUpstreamError as e:
        logger.warning("Chess.com upstream: %s", e)
        raise HTTPException(status_code=502, detail=str(e)) from e
    except Exception as e:
        logger.error("Chess.com archive error: %s", e, exc_info=True)
        raise HTTPException(status_code=502, detail="Failed to load games from Chess.com") from e
    finally:
        if client is not None:
            await client.aclose()
