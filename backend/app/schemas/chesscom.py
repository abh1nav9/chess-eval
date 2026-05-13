"""Response models for Chess.com archive proxy endpoints."""

from pydantic import BaseModel, Field


class ChessComPlayerBrief(BaseModel):
    """Public profile snippet from api.chess.com/pub/player/{username}."""

    username: str
    name: str | None = Field(default=None, description="Real name when public")
    title: str | None = Field(default=None, description="FIDE-style title, e.g. GM, IM, WFM")
    avatar: str | None = Field(default=None, description="Avatar image URL")


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
    white_display_name: str | None = Field(default=None, description="Profile display name")
    white_title: str | None = Field(default=None, description="Profile title, e.g. GM")
    black_display_name: str | None = None
    black_title: str | None = None
    already_analysed: bool = Field(default=False, description="Completed ChessEval analysis exists for this PGN")
    analysis_id: str | None = Field(default=None, description="Newest matching analysis id when already_analysed")


class ChessComRecentGamesResponse(BaseModel):
    username: str
    games: list[ChessComGameBrief]
    player_profiles: dict[str, ChessComPlayerBrief] = Field(
        default_factory=dict,
        description="Lowercase username -> public profile fields from Chess.com",
    )
