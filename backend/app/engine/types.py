"""
Type definitions for the engine layer.
Keeps engine-related data structures decoupled from API schemas.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


class ScoreType(str, Enum):
    """Type of engine evaluation score."""
    CENTIPAWN = "cp"
    MATE = "mate"


@dataclass
class EngineConfig:
    """Configuration for a Stockfish engine instance."""
    path: str = "/usr/local/bin/stockfish"
    depth: int = 64
    movetime: Optional[int] = None  # ms; None or 0 = depth-only search (full depth)
    threads: int = 2
    hash_mb: int = 128
    multi_pv: int = 3  # number of principal variations


@dataclass
class EngineScore:
    """Represents an engine evaluation score."""
    score_type: ScoreType
    value: int  # centipawns or moves-to-mate

    @property
    def is_mate(self) -> bool:
        return self.score_type == ScoreType.MATE

    @property
    def centipawn_value(self) -> float:
        """Normalize to centipawn-equivalent for comparison.
        Mate scores are clamped to ±10000 cp.
        """
        if self.is_mate:
            if self.value > 0:
                return 10000.0
            elif self.value < 0:
                return -10000.0
            else:
                return 0.0
        return float(self.value)

    def to_pawn_value(self) -> float:
        """Convert to pawn units (divide cp by 100)."""
        return self.centipawn_value / 100.0


@dataclass
class EngineResult:
    """Result of a single position analysis."""
    score: EngineScore
    best_move: str
    pv: List[str] = field(default_factory=list)
    depth: int = 0
    nodes: int = 0
    time_ms: int = 0
    mate_in: Optional[int] = None
    nps: int = 0
    multi_pv_results: List["EngineResult"] = field(default_factory=list)

    def __post_init__(self):
        if self.score.is_mate:
            self.mate_in = self.score.value
