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
    # When true, root logging uses one JSON object per line (for log aggregators).
    LOG_JSON: bool = False
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
    # Caps each `go` search in ms (used with depth); 0 = no extra ceiling beyond depth.
    STOCKFISH_MAX_MOVETIME_MS: int = 10_000
    STOCKFISH_THREADS: int = 2
    STOCKFISH_HASH_MB: int = 128
    STOCKFISH_MULTIPV: int = 3
    # Lines to request when resolving played-move eval from MultiPV in PGN pipeline.
    STOCKFISH_PGN_MULTIPV_LINES: int = 5

    # ── Classifier (centipawn loss from player perspective) ──
    CLASSIFIER_CP_EXCELLENT: int = 10
    CLASSIFIER_CP_GOOD: int = 25
    CLASSIFIER_CP_INACCURACY: int = 50
    CLASSIFIER_CP_MISTAKE: int = 150
    # cp loss above mistake threshold = blunder
    CLASSIFIER_MISS_MIN_ADVANTAGE_PAWNS: float = 2.0
    CLASSIFIER_BRILLIANT_SWING_PAWNS: float = 1.0
    CLASSIFIER_BRILLIANT_SACRIFICE_CP: int = 80

    # ── Stale analysis cleanup ───────────────────────────
    STALE_PROCESSING_MINUTES: int = 10

    # ── Optional Polyglot opening book (.bin path); empty = disabled ──
    OPENING_POLYGLOT_PATH: str = ""
    OPENING_POLYGLOT_MAX_PLY: int = 16

    # ── Two-pass analysis (cheap depth for swing, then full tiered depth) ──
    ANALYSIS_CHEAP_PASS_DEPTH: int = 12
    ANALYSIS_TWO_PASS_ENABLED: bool = True

    # ── Chess.com profile cache (Mongo TTL) ──────────────
    CHESSCOM_PROFILE_CACHE_TTL_SECONDS: int = 3600

    # After normalizing engine_cache, set true to skip on-read White POV flip for legacy rows.
    CACHE_STRICT_WHITE_POV: bool = False

    # ── Emit structlog JSON (alternative to LOG_JSON on stdlib) ──
    STRUCTLOG_JSON: bool = False

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
