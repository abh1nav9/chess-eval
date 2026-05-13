"""Errors when calling Chess.com Published Data API (upstream)."""


class ChessComUserNotFoundError(Exception):
    """No such public Chess.com username."""

    def __init__(self, username: str):
        self.username = username
        super().__init__(f'Chess.com user not found: "{username}"')


class ChessComUpstreamError(Exception):
    """Unexpected or failed response from api.chess.com."""

    def __init__(self, message: str = "Chess.com request failed"):
        super().__init__(message)
