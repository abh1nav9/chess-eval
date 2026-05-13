"""
FastAPI application factory.
Configures CORS, lifespan events, exception handlers, and routes.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import v1_router
from app.core.config import get_settings
from app.core.exceptions import ChessAnalysisError
from app.core.logging_config import configure_root_logging, configure_structlog_json
from app.db.mongodb import MongoDBClient
from app.engine.stockfish import StockfishEngine
from app.engine.types import EngineConfig

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown events."""
    settings = get_settings()

    # MongoDB
    logger.info("Starting Chess Analysis Platform...")
    try:
        await MongoDBClient.connect()
        logger.info("MongoDB connected")
        from app.db.indexes import ensure_mongo_indexes
        from app.db.repositories import AnalysisRepository

        await ensure_mongo_indexes()
        stale = await AnalysisRepository.sweep_stale_processing(settings.STALE_PROCESSING_MINUTES)
        if stale:
            logger.info("Marked %s stale processing analyses as failed", stale)
    except Exception as e:
        logger.warning(f"MongoDB connection failed: {e}. Running without database.")

    # Persistent Stockfish engine (for FEN analysis & health probe)
    eff_depth = min(settings.STOCKFISH_DEPTH, settings.MAX_ANALYSIS_DEPTH)
    mt = settings.STOCKFISH_MOVETIME
    max_mt = settings.STOCKFISH_MAX_MOVETIME_MS if settings.STOCKFISH_MAX_MOVETIME_MS > 0 else None
    engine_config = EngineConfig(
        path=settings.STOCKFISH_PATH,
        depth=eff_depth,
        movetime=mt if mt > 0 else None,
        max_movetime_ms=max_mt,
        threads=settings.STOCKFISH_THREADS,
        hash_mb=settings.STOCKFISH_HASH_MB,
        multi_pv=settings.STOCKFISH_MULTIPV,
    )
    engine = StockfishEngine(engine_config)
    try:
        await engine.start()
        app.state.engine = engine
        app.state.engine_config = engine_config
        from app.services.analysis_service import AnalysisService

        AnalysisService.configure_shared_engine(engine)
        logger.info("Stockfish engine pooled and ready")
    except Exception as e:
        logger.warning(f"Failed to start pooled Stockfish: {e}")
        app.state.engine = None
        app.state.engine_config = engine_config
        from app.services.analysis_service import AnalysisService

        AnalysisService.configure_shared_engine(None)

    yield

    # Shutdown
    logger.info("Shutting down...")
    if getattr(app.state, "engine", None):
        await app.state.engine.quit()
    await MongoDBClient.disconnect()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()
    if settings.STRUCTLOG_JSON:
        configure_structlog_json()
    configure_root_logging(use_json=settings.LOG_JSON or settings.STRUCTLOG_JSON)

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Production-grade chess analysis platform with Stockfish engine integration",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception handlers ────────────────────────────
    @app.exception_handler(ChessAnalysisError)
    async def chess_error_handler(request: Request, exc: ChessAnalysisError):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": type(exc).__name__,
                "message": exc.message,
            },
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled error: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "InternalServerError",
                "message": "An unexpected error occurred",
            },
        )

    # ── Routes ────────────────────────────────────────
    app.include_router(v1_router, prefix=settings.API_PREFIX)

    # Root redirect to docs
    @app.get("/", include_in_schema=False)
    async def root():
        return {"message": "Chess Analysis Platform API", "docs": "/docs"}

    return app


# Application instance
app = create_app()
