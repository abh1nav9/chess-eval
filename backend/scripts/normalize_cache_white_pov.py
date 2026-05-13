"""
One-off: set eval_white_pov=True on engine_cache docs where missing (legacy rows).

Run from backend with venv:
  python -m scripts.normalize_cache_white_pov
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from motor.motor_asyncio import AsyncIOMotorClient


async def main() -> None:
    url = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("MONGODB_DB_NAME", "chess_eval")
    client = AsyncIOMotorClient(url)
    coll = client[db_name]["engine_cache"]
    result = await coll.update_many(
        {"eval_white_pov": {"$ne": True}},
        {"$set": {"eval_white_pov": True}},
    )
    print(f"matched={result.matched_count} modified={result.modified_count}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
