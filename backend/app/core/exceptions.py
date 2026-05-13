"""
Custom exception classes for the chess analysis platform.
These are raised in services/pipeline and caught by FastAPI exception handlers.
"""


class ChessAnalysisError(Exception):
    """Base exception for all chess analysis errors."""

    def __init__(self, message: str = "An error occurred", status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class InvalidPGNError(ChessAnalysisError):
    """Raised when a PGN string cannot be parsed or replayed."""

    def __init__(self, message: str = "Invalid PGN format", status_code: int = 400):
        super().__init__(message=message, status_code=status_code)


class InvalidFENError(ChessAnalysisError):
    """Raised when a FEN string is invalid."""

    def __init__(self, message: str = "Invalid FEN string"):
        super().__init__(message=message, status_code=400)


class AnalysisNotFoundError(ChessAnalysisError):
    """Raised when a requested analysis does not exist."""

    def __init__(self, analysis_id: str):
        super().__init__(
            message=f"Analysis not found: {analysis_id}",
            status_code=404,
        )


class EngineError(ChessAnalysisError):
    """Raised when the chess engine encounters an error."""

    def __init__(self, message: str = "Engine error occurred"):
        super().__init__(message=message, status_code=500)


class EngineTimeoutError(EngineError):
    """Raised when the chess engine times out."""

    def __init__(self, message: str = "Engine analysis timed out"):
        super().__init__(message=message)


class DatabaseError(ChessAnalysisError):
    """Raised when a database operation fails."""

    def __init__(self, message: str = "Database operation failed"):
        super().__init__(message=message, status_code=500)
