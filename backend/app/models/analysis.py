"""
MongoDB document models for the analysis platform.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import uuid


def generate_id() -> str:
    return uuid.uuid4().hex


class MoveDocument(BaseModel):
    move_number: int
    move: str
    move_uci: str
    color: str
    fen_before: str
    fen_after: str
    eval_before: float
    eval_after: float
    centipawn_loss: float
    classification: str
    best_move: Optional[str] = None
    best_move_uci: Optional[str] = None
    best_move_eval: Optional[float] = None
    pv: List[str] = Field(default_factory=list)
    is_check: bool = False
    is_capture: bool = False
    is_castle: bool = False
    mate_in: Optional[int] = None


class GameMetadataDocument(BaseModel):
    white: str = "Unknown"
    black: str = "Unknown"
    event: str = ""
    date: str = ""
    result: str = "*"
    eco: str = ""
    opening: str = ""
    time_control: str = ""
    white_elo: Optional[str] = None
    black_elo: Optional[str] = None
    site: str = ""


class AnalysisSummaryDocument(BaseModel):
    total_moves: int = 0
    white_accuracy: float = 0.0
    black_accuracy: float = 0.0
    white_classifications: Dict[str, int] = Field(default_factory=dict)
    black_classifications: Dict[str, int] = Field(default_factory=dict)
    avg_centipawn_loss_white: float = 0.0
    avg_centipawn_loss_black: float = 0.0
    missed_wins_white: List[int] = Field(default_factory=list)
    missed_wins_black: List[int] = Field(default_factory=list)
    missed_wins_white: int = 0
    missed_wins_black: int = 0
    missed_wins_white: List[int] = Field(default_factory=list)
    missed_wins_black: List[int] = Field(default_factory=list)


class AnalysisDocument(BaseModel):
    analysis_id: str = Field(default_factory=generate_id)
    game_id: str = Field(default_factory=generate_id)
    status: str = "pending"
    pgn: str = ""
    metadata: GameMetadataDocument = Field(default_factory=GameMetadataDocument)
    moves: List[MoveDocument] = Field(default_factory=list)
    summary: AnalysisSummaryDocument = Field(default_factory=AnalysisSummaryDocument)
    depth: int = 64
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def to_mongo(self) -> Dict[str, Any]:
        data = self.model_dump()
        data["_id"] = data["analysis_id"]
        return data


class PositionCacheDocument(BaseModel):
    fen_hash: str
    fen: str
    depth: int
    eval_cp: int
    eval_type: str
    best_move: str
    pv: List[str] = Field(default_factory=list)
    mate_in: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=datetime.utcnow)

    def to_mongo(self) -> Dict[str, Any]:
        data = self.model_dump()
        data["_id"] = f"{self.fen_hash}_{self.depth}"
        return data
