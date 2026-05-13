"""Lichess public API proxy with ChessEval-shaped game rows (analysis.md §7.5)."""

from __future__ import annotations

import io
import logging
import re
import time
import uuid

import chess.pgn
import httpx
from fastapi import APIRouter, HTTPException, Query

from app.db.repositories import AnalysisRepository
from app.schemas.chesscom import ChessComGameBrief, ChessComRecentGamesResponse
from app.utils.pgn_hash import pgn_sha256

logger = logging.getLogger(__name__)
router = APIRouter(tags=["lichess"])

LICHESS_BASE = "https://lichess.org/api"
_SITE_GAME_RE = re.compile(r"lichess\.org/([\w-]{6,12})", re.I)
_LAST_FETCH_MONO: dict[str, float] = {}
_MIN_INTERVAL_SEC = 5.0


async def _attach_analysis_flags(resp: ChessComRecentGamesResponse) -> ChessComRecentGamesResponse:
    if not resp.games:
        return resp
    hashes = [pgn_sha256(g.pgn) for g in resp.games]
    m = await AnalysisRepository.find_completed_ids_by_pgn_hashes(hashes)
    games = []
    for g in resp.games:
        h = pgn_sha256(g.pgn)
        aid = m.get(h)
        games.append(g.model_copy(update={"already_analysed": aid is not None, "analysis_id": aid}))
    return resp.model_copy(update={"games": games})


def _brief_from_pgn_block(pgn: str) -> ChessComGameBrief | None:
    try:
        g = chess.pgn.read_game(io.StringIO(pgn.strip()))
    except Exception:
        return None
    if g is None:
        return None
    h = g.headers
    site = str(h.get("Site", ""))
    m = _SITE_GAME_RE.search(site)
    uid = m.group(1) if m else uuid.uuid4().hex[:10]
    url = site if site.startswith("http") else f"https://lichess.org/{uid}"
    white = str(h.get("White", "Unknown"))
    black = str(h.get("Black", "Unknown"))
    wr = h.get("WhiteElo")
    br = h.get("BlackElo")
    tc = str(h.get("Event", "lichess"))[:32]
    et = 0
    utc = h.get("UTCDate") and h.get("UTCTime")
    if utc:
        try:
            from datetime import datetime

            ds = f"{h.get('UTCDate')} {h.get('UTCTime')}"
            et = int(datetime.strptime(ds, "%Y.%m.%d %H:%M:%S").timestamp())
        except Exception:
            et = 0
    return ChessComGameBrief(
        url=url,
        uuid=uid,
        pgn=pgn.strip(),
        end_time=et,
        time_class=tc,
        rated=str(h.get("Rated", "No")).lower() == "yes",
        white_username=white,
        black_username=black,
        white_rating=int(wr) if str(wr).isdigit() else None,
        black_rating=int(br) if str(br).isdigit() else None,
    )


@router.get("/lichess/player/{username}/recent-games", response_model=ChessComRecentGamesResponse)
async def lichess_recent_games(
    username: str,
    max_games: int = Query(10, ge=1, le=30, alias="max"),
):
    u = username.strip()
    if not u or len(u) > 40:
        raise HTTPException(status_code=400, detail="Invalid username")
    key = u.lower()
    now = time.monotonic()
    last = _LAST_FETCH_MONO.get(key, 0.0)
    if now - last < _MIN_INTERVAL_SEC:
        raise HTTPException(
            status_code=429,
            detail=f"Wait {_MIN_INTERVAL_SEC:.0f}s before reloading the same Lichess profile.",
        )
    _LAST_FETCH_MONO[key] = now

    url = f"{LICHESS_BASE}/games/user/{u}"
    try:
        async with httpx.AsyncClient(
            headers={
                "User-Agent": "ChessEval/1.0 (https://github.com/chess-eval)",
                "Accept": "application/x-chess-pgn",
            },
            timeout=30.0,
            follow_redirects=True,
        ) as client:
            r = await client.get(url, params={"max": max_games})
    except httpx.RequestError as e:
        logger.warning("Lichess request failed: %s", e)
        raise HTTPException(status_code=502, detail="Could not reach Lichess") from e
    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="User not found on Lichess")
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Lichess returned HTTP {r.status_code}")
    raw = (r.text or "").strip()
    if not raw:
        return await _attach_analysis_flags(ChessComRecentGamesResponse(username=key, games=[]))
    blocks = [b.strip() for b in raw.split("\n\n\n") if b.strip()]
    games: list[ChessComGameBrief] = []
    for b in blocks[:max_games]:
        brief = _brief_from_pgn_block(b)
        if brief:
            games.append(brief)
    resp = ChessComRecentGamesResponse(username=key, games=games, player_profiles={})
    return await _attach_analysis_flags(resp)
