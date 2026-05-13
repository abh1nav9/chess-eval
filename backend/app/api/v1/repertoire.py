"""Opening repertoire aggregates (analysis.md §7.6)."""

from fastapi import APIRouter, Query

from app.db.mongodb import MongoDBClient

router = APIRouter(tags=["repertoire"])


@router.get("/repertoire/summary")
async def repertoire_summary(color: str = Query("white", pattern="^(white|black)$")):
    """Per-opening stats for moves played as ``color``."""
    moves = MongoDBClient.moves_collection()
    match_c = "white" if color == "white" else "black"
    cur = moves.aggregate(
        [
            {"$match": {"color": match_c, "opening_eco": {"$nin": [None, ""]}}},
            {
                "$group": {
                    "_id": "$opening_eco",
                    "play_count": {"$sum": 1},
                    "avg_centipawn_loss": {"$avg": "$centipawn_loss"},
                    "opening_name": {"$first": "$opening_name"},
                }
            },
            {"$sort": {"play_count": -1}},
            {"$limit": 40},
        ]
    )
    openings = []
    async for r in cur:
        openings.append(
            {
                "eco": r["_id"],
                "opening_name": r.get("opening_name") or "",
                "play_count": r["play_count"],
                "avg_centipawn_loss": round(float(r.get("avg_centipawn_loss") or 0), 2),
            }
        )
    return {"color": color, "openings": openings}
