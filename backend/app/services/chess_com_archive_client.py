"""
Server-side client for https://api.chess.com/pub (Published Data API).
Used because browser CORS blocks direct calls from the SPA.
"""

from __future__ import annotations

import asyncio
import logging
import re
from typing import Any

import httpx

from app.core.chess_com_errors import ChessComUpstreamError, ChessComUserNotFoundError
from app.schemas.chesscom import ChessComGameBrief, ChessComPlayerBrief, ChessComRecentGamesResponse

logger = logging.getLogger(__name__)

CHESS_COM_USER_AGENT = "ChessEval/1.0 (https://github.com/chess-eval; contact via repo)"
CHESS_COM_BASE = "https://api.chess.com/pub/player"
USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{1,32}$")
MAX_MONTH_REQUESTS = 36
REQUEST_TIMEOUT = 25.0


def normalize_username(raw: str) -> str:
    u = raw.strip().lower()
    if not USERNAME_PATTERN.fullmatch(u):
        raise ValueError(
            "Username must be 1–32 characters: letters, digits, underscore, or hyphen.",
        )
    return u


class ChessComArchiveClient:
    """Fetches public game archives and recent games for a Chess.com username."""

    def __init__(self, http: httpx.AsyncClient | None = None) -> None:
        self._owns_client = http is None
        self._http = http or httpx.AsyncClient(
            headers={"User-Agent": CHESS_COM_USER_AGENT},
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
            transport=httpx.AsyncHTTPTransport(retries=3),
        )

    async def aclose(self) -> None:
        if self._owns_client:
            await self._http.aclose()

    async def fetch_recent_games(
        self,
        username: str,
        limit: int,
        time_class: str | None = None,
    ) -> ChessComRecentGamesResponse:
        uname = normalize_username(username)
        archives = await self._fetch_archive_urls(uname)
        if not archives:
            return ChessComRecentGamesResponse(username=uname, games=[])

        collected: list[ChessComGameBrief] = []
        months_fetched = 0

        for archive_url in reversed(archives):
            if len(collected) >= limit or months_fetched >= MAX_MONTH_REQUESTS:
                break
            months_fetched += 1
            games = await self._fetch_month_games(archive_url)
            for game in reversed(games):
                if len(collected) >= limit:
                    break
                brief = self._game_to_brief(game)
                if not brief:
                    continue
                if time_class and brief.time_class != time_class:
                    continue
                collected.append(brief)

        profiles = await self._load_player_profiles(collected)
        self._apply_profiles_to_games(collected, profiles)

        return ChessComRecentGamesResponse(username=uname, games=collected, player_profiles=profiles)

    async def fetch_games_for_month(
        self,
        username: str,
        year: int,
        month: int,
        time_class: str | None = None,
    ) -> ChessComRecentGamesResponse:
        """Games from ``/pub/player/{user}/games/{YYYY}/{MM}`` (analysis.md §5.1)."""
        uname = normalize_username(username)
        url = f"{CHESS_COM_BASE}/{uname}/games/{year:04d}/{month:02d}"
        games = await self._fetch_month_games(url)
        collected: list[ChessComGameBrief] = []
        for g in games:
            brief = self._game_to_brief(g)
            if not brief:
                continue
            if time_class and brief.time_class != time_class:
                continue
            collected.append(brief)
        collected.sort(key=lambda x: x.end_time, reverse=True)
        profiles = await self._load_player_profiles(collected)
        self._apply_profiles_to_games(collected, profiles)
        return ChessComRecentGamesResponse(username=uname, games=collected, player_profiles=profiles)

    async def _fetch_archive_urls(self, username: str) -> list[str]:
        url = f"{CHESS_COM_BASE}/{username}/games/archives"
        r = await self._http.get(url)
        if r.status_code == 404:
            raise ChessComUserNotFoundError(username)
        if r.status_code != 200:
            logger.warning("Chess.com archives HTTP %s for %s", r.status_code, username)
            raise ChessComUpstreamError(f"Chess.com returned HTTP {r.status_code} for archives")
        data = r.json()
        archives = data.get("archives")
        if not isinstance(archives, list):
            raise ChessComUpstreamError("Invalid archives response from Chess.com")
        return [str(a) for a in archives if isinstance(a, str)]

    async def _fetch_month_games(self, archive_url: str) -> list[dict[str, Any]]:
        r = await self._http.get(archive_url)
        if r.status_code != 200:
            logger.warning("Chess.com month HTTP %s for %s", r.status_code, archive_url)
            return []
        data = r.json()
        games = data.get("games")
        if not isinstance(games, list):
            return []
        return [g for g in games if isinstance(g, dict)]

    def _game_to_brief(self, game: dict[str, Any]) -> ChessComGameBrief | None:
        if game.get("rules") and game.get("rules") != "chess":
            return None
        pgn = game.get("pgn")
        if not isinstance(pgn, str) or not pgn.strip():
            return None
        url = str(game.get("url") or "")
        uuid = str(game.get("uuid") or "")
        if not url or not uuid:
            return None

        white = game.get("white")
        black = game.get("black")
        if not isinstance(white, dict) or not isinstance(black, dict):
            return None
        wu = white.get("username")
        bu = black.get("username")
        if not isinstance(wu, str) or not isinstance(bu, str):
            return None

        wr = white.get("rating")
        br = black.get("rating")
        end_time = game.get("end_time")
        if not isinstance(end_time, int):
            return None

        return ChessComGameBrief(
            url=url,
            uuid=uuid,
            pgn=pgn.strip(),
            end_time=end_time,
            time_class=str(game.get("time_class") or "unknown"),
            rated=bool(game.get("rated")),
            white_username=wu,
            black_username=bu,
            white_rating=int(wr) if isinstance(wr, int) else None,
            black_rating=int(br) if isinstance(br, int) else None,
        )

    async def _fetch_pub_player(self, username: str) -> dict[str, Any] | None:
        key = username.strip().lower()
        if not USERNAME_PATTERN.fullmatch(key):
            return None
        from app.db.repositories import ChessComProfileCacheRepository

        cached = await ChessComProfileCacheRepository.get_json(key)
        if cached is not None:
            return cached
        url = f"{CHESS_COM_BASE}/{key}"
        r = await self._http.get(url)
        if r.status_code != 200:
            return None
        data = r.json()
        if isinstance(data, dict):
            await ChessComProfileCacheRepository.put_json(key, data)
        return data if isinstance(data, dict) else None

    @staticmethod
    def _sanitize_avatar_url(url: object) -> str | None:
        if not isinstance(url, str):
            return None
        u = url.strip()
        if not u.startswith("https://images.chess.com/"):
            return None
        return u

    def _profile_from_pub(self, username: str, raw: dict[str, Any]) -> ChessComPlayerBrief:
        name = raw.get("name")
        title = raw.get("title")
        avatar = self._sanitize_avatar_url(raw.get("avatar"))
        un = raw.get("username")
        canonical = str(un).lower() if isinstance(un, str) and un.strip() else username
        return ChessComPlayerBrief(
            username=canonical,
            name=str(name).strip() if isinstance(name, str) and name.strip() else None,
            title=str(title).strip() if isinstance(title, str) and title.strip() else None,
            avatar=avatar,
        )

    async def _load_player_profiles(self, games: list[ChessComGameBrief]) -> dict[str, ChessComPlayerBrief]:
        usernames: set[str] = set()
        for g in games:
            usernames.add(g.white_username.lower())
            usernames.add(g.black_username.lower())

        profiles: dict[str, ChessComPlayerBrief] = {}
        sorted_u = sorted(usernames)

        async def one(u: str) -> tuple[str, ChessComPlayerBrief | None]:
            raw = await self._fetch_pub_player(u)
            if raw:
                return u, self._profile_from_pub(u, raw)
            return u, None

        results = await asyncio.gather(*(one(u) for u in sorted_u))
        for u, prof in results:
            if prof:
                profiles[u] = prof
        return profiles

    def _apply_profiles_to_games(
        self,
        games: list[ChessComGameBrief],
        profiles: dict[str, ChessComPlayerBrief],
    ) -> None:
        for i, g in enumerate(games):
            wp = profiles.get(g.white_username.lower())
            bp = profiles.get(g.black_username.lower())
            games[i] = g.model_copy(
                update={
                    "white_display_name": wp.name if wp else None,
                    "white_title": wp.title if wp else None,
                    "black_display_name": bp.name if bp else None,
                    "black_title": bp.title if bp else None,
                },
            )
