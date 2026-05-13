"""
Application configuration using pydantic-settings.
All config is loaded from environment variables / .env file.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────
    APP_NAME: str = "Chess Analysis Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # ── CORS ─────────────────────────────────────────────
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ── MongoDB ──────────────────────────────────────────
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "chess_eval"

    # ── Stockfish ────────────────────────────────────────
    STOCKFISH_PATH: str = "/usr/local/bin/stockfish"
    STOCKFISH_DEPTH: int = 64
    # 0 = depth-only search (each `go` runs to STOCKFISH_DEPTH). >0 adds movetime cap.
    STOCKFISH_MOVETIME: int = 0
    STOCKFISH_THREADS: int = 2
    STOCKFISH_HASH_MB: int = 128
    STOCKFISH_MULTIPV: int = 3

    # ── Redis (optional, future use) ─────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Analysis ─────────────────────────────────────────
    MAX_ANALYSIS_DEPTH: int = 245
    CACHE_TTL_SECONDS: int = 86400  # 24 hours
    MAX_PGN_SIZE_KB: int = 512
    POSITION_CACHE_MIN_DEPTH: int = 12
    MAX_CONCURRENT_ANALYSES: int = 2


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
