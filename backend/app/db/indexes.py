"""Create MongoDB indexes once at startup (roadmap §3.1 / §3.2)."""

import logging

from app.core.config import get_settings
from app.db.mongodb import MongoDBClient

logger = logging.getLogger(__name__)

POSITION_CACHE_TTL_SECONDS = 30 * 24 * 3600


async def ensure_mongo_indexes() -> None:
    try:
        settings = get_settings()
        analyses = MongoDBClient.analyses_collection()
        cache = MongoDBClient.engine_cache_collection()
        await analyses.create_index([("status", 1), ("created_at", -1)])
        await analyses.create_index([("created_at", -1)])
        await analyses.create_index([("pgn_hash", 1)], sparse=True)
        await cache.create_index([("fen_hash", 1), ("depth", -1)])
        pgns = MongoDBClient.pgns_collection()
        await pgns.create_index([("updated_at", -1)])
        moves = MongoDBClient.moves_collection()
        await moves.create_index([("analysis_id", 1), ("ply", 1)])
        await moves.create_index([("classification", 1), ("phase", 1)])
        await moves.create_index([("opening_eco", 1), ("classification", 1)])
        await moves.create_index([("completed_at", -1), ("opening_eco", 1)])
        studies = MongoDBClient.studies_collection()
        await studies.create_index([("updated_at", -1)])
        coach_msgs = MongoDBClient.coach_messages_collection()
        await coach_msgs.create_index(
            [("fen_before", 1), ("move_uci", 1), ("classification", 1)],
            unique=True,
        )
        cc = MongoDBClient.chesscom_profile_cache_collection()
        try:
            await cc.create_index(
                [("cached_at", 1)],
                expireAfterSeconds=settings.CHESSCOM_PROFILE_CACHE_TTL_SECONDS,
            )
        except Exception as e:
            logger.warning("Chess.com profile TTL index: %s", e)
        try:
            await cache.create_index(
                [("created_at", 1)],
                expireAfterSeconds=POSITION_CACHE_TTL_SECONDS,
            )
        except Exception as e:
            logger.warning("TTL index on engine_cache may already exist: %s", e)
        logger.info("MongoDB indexes ensured")
    except Exception as e:
        logger.warning("ensure_mongo_indexes skipped: %s", e)
