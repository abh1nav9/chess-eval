"""Response models for Chess.com archive proxy endpoints."""

from pydantic import BaseModel, Field


class ChessComGameBrief(BaseModel):
    """One finished game suitable for PGN analysis."""

    url: str
    uuid: str
    pgn: str
    end_time: int = Field(description="Unix seconds when the game ended")
    time_class: str = Field(description="e.g. blitz, rapid, bullet")
    rated: bool
    white_username: str
    black_username: str
    white_rating: int | None = None
    black_rating: int | None = None


class ChessComRecentGamesResponse(BaseModel):
    username: str
    games: list[ChessComGameBrief]
