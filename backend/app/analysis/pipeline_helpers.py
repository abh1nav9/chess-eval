"""
Pure helper functions for the analysis pipeline.
Handles move notation conversion, metadata extraction, and document construction.
"""

from typing import Dict, List

import chess

from app.analysis.classifier import Classification
from app.analysis.pgn_parser import ParsedGame, ParsedMove
from app.engine.types import EngineResult, EngineScore, ScoreType
from app.models.analysis import GameMetadataDocument, MoveDocument


def uci_to_san(board: chess.Board, uci_move: str) -> str:
    """Convert a single UCI move to SAN notation."""
    try:
        move = chess.Move.from_uci(uci_move)
        if move in board.legal_moves:
            return board.san(move)
    except (ValueError, Exception):
        pass
    return uci_move


def uci_to_san_list(board: chess.Board, uci_moves: List[str]) -> List[str]:
    """Convert a list of UCI moves to SAN, advancing the board."""
    san_moves = []
    temp_board = board.copy()
    for uci in uci_moves:
        try:
            move = chess.Move.from_uci(uci)
            if move in temp_board.legal_moves:
                san_moves.append(temp_board.san(move))
                temp_board.push(move)
            else:
                san_moves.append(uci)
                break
        except (ValueError, Exception):
            san_moves.append(uci)
            break
    return san_moves


def extract_game_metadata(game: ParsedGame) -> GameMetadataDocument:
    """Extract metadata from parsed PGN headers."""
    h = game.headers
    return GameMetadataDocument(
        white=h.get("White", "Unknown"),
        black=h.get("Black", "Unknown"),
        event=h.get("Event", ""),
        date=h.get("Date", ""),
        result=h.get("Result", "*"),
        eco=h.get("ECO", ""),
        opening=h.get("Opening", ""),
        time_control=h.get("TimeControl", ""),
        white_elo=h.get("WhiteElo"),
        black_elo=h.get("BlackElo"),
        site=h.get("Site", ""),
    )


def build_book_move_doc(parsed_move: ParsedMove) -> MoveDocument:
    """Create a MoveDocument for a book/opening move (no engine eval)."""
    return MoveDocument(
        move_number=parsed_move.move_number,
        move=parsed_move.san,
        move_uci=parsed_move.uci,
        color=parsed_move.color,
        fen_before=parsed_move.fen_before,
        fen_after=parsed_move.fen_after,
        eval_before=0.0,
        eval_after=0.0,
        centipawn_loss=0.0,
        classification=Classification.BOOK.value,
        is_check=parsed_move.is_check,
        is_capture=parsed_move.is_capture,
        is_castle=parsed_move.is_castle,
    )


def cached_to_engine_result(cached: Dict) -> EngineResult:
    """Reconstruct EngineResult from a cache document."""
    eval_type = cached.get("eval_type", "cp")
    eval_cp = cached.get("eval_cp", 0)
    if eval_type == "mate":
        score = EngineScore(ScoreType.MATE, cached.get("mate_in", 0))
    else:
        score = EngineScore(ScoreType.CENTIPAWN, eval_cp)
    return EngineResult(
        score=score,
        best_move=cached.get("best_move", ""),
        pv=cached.get("pv", []),
        depth=cached.get("depth", 0),
    )
