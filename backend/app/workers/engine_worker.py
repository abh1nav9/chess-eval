"""
Engine worker abstraction.
Currently runs analysis in-process. Designed to be replaced with
a distributed task queue (e.g., Celery, Redis Queue) for scaling.
"""

import logging
from typing import Optional

from app.analysis.pipeline import AnalysisPipeline
from app.engine.types import EngineConfig

logger = logging.getLogger(__name__)


class EngineWorker:
    """Abstraction for engine analysis work.
    
    In the current implementation, this runs analysis in-process.
    Future versions can dispatch to a task queue for distributed processing.
    """

    def __init__(self, engine_config: EngineConfig):
        self.engine_config = engine_config
        self.pipeline = AnalysisPipeline(engine_config)

    async def submit_pgn_analysis(self, pgn: str, depth: Optional[int] = None):
        """Submit a PGN for analysis. Returns the analysis document."""
        return await self.pipeline.analyze_pgn(pgn, depth=depth)

    async def submit_fen_analysis(
        self, fen: str, depth: Optional[int] = None, num_lines: int = 3
    ):
        """Submit a FEN for analysis. Returns position evaluation."""
        return await self.pipeline.analyze_fen(fen, depth=depth, num_lines=num_lines)
