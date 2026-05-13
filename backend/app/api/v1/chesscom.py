"""Proxy Chess.com Published Data API for recent games (no browser CORS)."""

import logging

from fastapi import APIRouter, HTTPException, Query

from app.core.chess_com_errors import ChessComUpstreamError, ChessComUserNotFoundError
from app.schemas.chesscom import ChessComRecentGamesResponse
from app.services.chess_com_archive_client import ChessComArchiveClient, normalize_username

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chess.com"])


@router.get("/chesscom/player/{username}/recent-games", response_model=ChessComRecentGamesResponse)
async def get_recent_games(
    username: str,
    limit: int = Query(10, ge=1, le=31, description="Max games to return (newest first)"),
) -> ChessComRecentGamesResponse:
    """List recent finished games for a public Chess.com profile.

    Walks monthly archives from newest until ``limit`` standard chess games with PGN are collected.
    """
    client: ChessComArchiveClient | None = None
    try:
        try:
            normalize_username(username)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

        client = ChessComArchiveClient()
        return await client.fetch_recent_games(username, limit)
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
