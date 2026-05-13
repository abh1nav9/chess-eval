"""
Pydantic schemas for API request/response models.
Strictly typed, validated, and documented.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────


class MoveClassification(str, Enum):
    """Move quality classification based on centipawn loss."""
    BRILLIANT = "brilliant"
    BEST = "best"
    EXCELLENT = "excellent"
    GOOD = "good"
    INACCURACY = "inaccuracy"
    MISTAKE = "mistake"
    BLUNDER = "blunder"
    BOOK = "book"


class AnalysisStatus(str, Enum):
    """Status of an analysis job."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ── Request Schemas ───────────────────────────────────────


class PGNAnalysisRequest(BaseModel):
    """Request body for PGN game analysis."""
    pgn: str = Field(..., description="PGN string of the game to analyze", min_length=1)
    depth: Optional[int] = Field(
        None,
        description="Custom analysis depth (default 26 with tiered 18-28). Higher = slower but more accurate.",
        ge=10,
        le=40,
    )


class FENAnalysisRequest(BaseModel):
    """Request body for single FEN position analysis."""
    fen: str = Field(..., description="FEN string of the position", min_length=1)
    depth: Optional[int] = Field(
        None,
        description="Deprecated: ignored. Server uses STOCKFISH_DEPTH from environment.",
        ge=1,
        le=245,
    )
    num_lines: Optional[int] = Field(
        3, description="Number of principal variations to return", ge=1, le=5
    )


# ── Response Schemas ──────────────────────────────────────


class MoveEvaluation(BaseModel):
    """Evaluation data for a single move in a game."""
    move_number: int = Field(..., description="Move number (1-indexed)")
    move: str = Field(..., description="Move in SAN notation (e.g., 'Nf3')")
    move_uci: str = Field(..., description="Move in UCI notation (e.g., 'g1f3')")
    color: str = Field(..., description="'white' or 'black'")
    fen_before: str = Field(..., description="FEN before the move")
    fen_after: str = Field(..., description="FEN after the move")
    eval_before: float = Field(..., description="Eval before move (in pawns, from white's perspective)")
    eval_after: float = Field(..., description="Eval after move (in pawns, from white's perspective)")
    centipawn_loss: float = Field(..., description="Centipawn loss for this move")
    classification: MoveClassification = Field(..., description="Move quality classification")
    best_move: Optional[str] = Field(None, description="Engine's best move (SAN)")
    best_move_uci: Optional[str] = Field(None, description="Engine's best move (UCI)")
    best_move_eval: Optional[float] = Field(None, description="Eval of the best move")
    pv: List[str] = Field(default_factory=list, description="Principal variation")
    is_check: bool = Field(False, description="Whether this move gives check")
    is_capture: bool = Field(False, description="Whether this move is a capture")
    is_castle: bool = Field(False, description="Whether this move is castling")
    mate_in: Optional[int] = Field(None, description="Mate in N moves (if applicable)")


class GameMetadata(BaseModel):
    """Metadata extracted from PGN headers."""
    white: str = Field("Unknown", description="White player name")
    black: str = Field("Unknown", description="Black player name")
    event: str = Field("", description="Event name")
    date: str = Field("", description="Game date")
    result: str = Field("*", description="Game result")
    eco: str = Field("", description="ECO opening code")
    opening: str = Field("", description="Opening name")
    time_control: str = Field("", description="Time control")
    site: str = Field("", description="Site/platform")


class AnalysisSummary(BaseModel):
    """Summary statistics for a completed analysis."""
    total_moves: int = 0
    white_accuracy: float = 0.0
    black_accuracy: float = 0.0
    white_classifications: dict = Field(default_factory=dict)
    black_classifications: dict = Field(default_factory=dict)
    avg_centipawn_loss_white: float = 0.0
    avg_centipawn_loss_black: float = 0.0


class PGNAnalysisResponse(BaseModel):
    """Full response for a PGN analysis."""
    analysis_id: str = Field(..., description="Unique analysis identifier")
    game_id: str = Field(..., description="Unique game identifier")
    status: AnalysisStatus = Field(..., description="Analysis status")
    metadata: GameMetadata = Field(default_factory=GameMetadata)
    moves: List[MoveEvaluation] = Field(default_factory=list)
    summary: AnalysisSummary = Field(default_factory=AnalysisSummary)
    pgn: str = Field("", description="Original PGN")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class FENAnalysisResponse(BaseModel):
    """Response for a single FEN position analysis."""
    fen: str = Field(..., description="Input FEN string")
    eval: float = Field(..., description="Position eval in pawns (white's perspective)")
    best_move: str = Field(..., description="Best move in SAN notation")
    best_move_uci: str = Field(..., description="Best move in UCI notation")
    pv: List[str] = Field(default_factory=list, description="Principal variation (SAN)")
    mate_in: Optional[int] = Field(None, description="Mate in N (if applicable)")
    depth: int = Field(..., description="Search depth reached")
    is_check: bool = Field(False)
    is_checkmate: bool = Field(False)
    is_stalemate: bool = Field(False)
    turn: str = Field("white", description="Side to move")
    top_lines: List["EngineLine"] = Field(
        default_factory=list, description="Top engine lines (multi-PV)"
    )


class EngineLine(BaseModel):
    """A single engine analysis line (for multi-PV display)."""
    rank: int = Field(..., description="Line ranking (1 = best)")
    eval: float = Field(..., description="Evaluation in pawns")
    move: str = Field(..., description="First move (SAN)")
    move_uci: str = Field(..., description="First move (UCI)")
    pv: List[str] = Field(default_factory=list, description="Full PV in SAN")
    mate_in: Optional[int] = None
    depth: int = 0
