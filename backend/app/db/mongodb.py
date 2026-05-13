"""
MongoDB connection manager using Motor (async driver).
Provides lifespan-managed client and typed collection accessors.
"""

import logging
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class MongoDBClient:
    """Singleton MongoDB client manager."""

    _client: Optional[AsyncIOMotorClient] = None
    _db: Optional[AsyncIOMotorDatabase] = None

    @classmethod
    async def connect(cls) -> None:
        """Connect to MongoDB."""
        settings = get_settings()
        cls._client = AsyncIOMotorClient(settings.MONGODB_URL)
        cls._db = cls._client[settings.MONGODB_DB_NAME]

        # Verify connection
        try:
            await cls._client.admin.command("ping")
            logger.info(
                f"Connected to MongoDB: {settings.MONGODB_URL}/{settings.MONGODB_DB_NAME}"
            )
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise

        # Create indexes
        await cls._create_indexes()

    @classmethod
    async def disconnect(cls) -> None:
        """Disconnect from MongoDB."""
        if cls._client:
            cls._client.close()
            cls._client = None
            cls._db = None
            logger.info("Disconnected from MongoDB")

    @classmethod
    def get_db(cls) -> AsyncIOMotorDatabase:
        """Get the database instance."""
        if cls._db is None:
            raise RuntimeError("MongoDB not connected. Call connect() first.")
        return cls._db

    # ── Collection Accessors ──────────────────────────────

    @classmethod
    def analyses_collection(cls):
        return cls.get_db()["analyses"]

    @classmethod
    def games_collection(cls):
        return cls.get_db()["games"]

    @classmethod
    def positions_collection(cls):
        return cls.get_db()["positions"]

    @classmethod
    def engine_cache_collection(cls):
        return cls.get_db()["engine_cache"]

    @classmethod
    def pgns_collection(cls):
        return cls.get_db()["pgns"]

    @classmethod
    def chesscom_profile_cache_collection(cls):
        return cls.get_db()["chesscom_profile_cache"]

    @classmethod
    def moves_collection(cls):
        """Per-move denormalized rows for stats / repertoire (analysis.md §3.4)."""
        return cls.get_db()["moves"]

    @classmethod
    def studies_collection(cls):
        return cls.get_db()["studies"]

    @classmethod
    def users_collection(cls):
        return cls.get_db()["users"]

    # ── Index Management ──────────────────────────────────

    @classmethod
    async def _create_indexes(cls) -> None:
        """Create indexes for all collections."""
        try:
            # Analyses
            await cls.analyses_collection().create_index("game_id", unique=True)
            await cls.analyses_collection().create_index("created_at")
            await cls.analyses_collection().create_index("status")

            # Positions
            await cls.positions_collection().create_index("fen_hash", unique=True)

            # Engine cache
            await cls.engine_cache_collection().create_index("fen_hash")
            await cls.engine_cache_collection().create_index(
                "expires_at", expireAfterSeconds=0
            )

            # Games
            await cls.games_collection().create_index("created_at")

            logger.info("MongoDB indexes created/verified")
        except Exception as e:
            logger.warning(f"Error creating indexes: {e}")
