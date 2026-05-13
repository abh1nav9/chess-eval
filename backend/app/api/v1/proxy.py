"""Avatar and other safe image proxying (analysis.md §4.15)."""

import logging
from urllib.parse import unquote

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

logger = logging.getLogger(__name__)
router = APIRouter(tags=["proxy"])

_ALLOWED_AVATAR_PREFIX = "https://images.chess.com/"


@router.get("/proxy/avatar")
async def proxy_chesscom_avatar(url: str = Query(..., description="URL-encoded Chess.com avatar URL")):
    decoded = unquote(url).strip()
    if not decoded.startswith(_ALLOWED_AVATAR_PREFIX):
        raise HTTPException(status_code=400, detail="Only images.chess.com avatar URLs are allowed")
    async with httpx.AsyncClient(
        headers={"User-Agent": "ChessEval/1.0 (avatar proxy)"},
        timeout=20.0,
        follow_redirects=True,
    ) as client:
        r = await client.get(decoded)
    if r.status_code != 200:
        logger.warning("Avatar upstream %s for %s", r.status_code, decoded[:80])
        raise HTTPException(status_code=502, detail="Failed to fetch avatar")
    ct = r.headers.get("content-type", "image/jpeg").split(";")[0].strip()
    if not ct.startswith("image/"):
        raise HTTPException(status_code=502, detail="Unexpected content type")
    return Response(content=r.content, media_type=ct)
