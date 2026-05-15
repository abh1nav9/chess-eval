from __future__ import annotations

import logging

import chess

from app.analysis.coach_signals import extract_signals
from app.analysis.coach_templates import TEMPLATE_MAP, interpolate
from app.db.coach_message_repository import CoachMessageRepository
from app.models.analysis import MoveDocument

log = logging.getLogger(__name__)

COACHED_CLASSIFICATIONS = {
    "brilliant",
    "best",
    "great",
    "excellent",
    "good",
    "inaccuracy",
    "mistake",
    "blunder",
    "miss",
    "book",
}


def get_coach_message(
    doc: MoveDocument,
    *,
    mate_in_before: int | None,
    board_before: chess.Board,
) -> str | None:
    if doc.classification not in COACHED_CLASSIFICATIONS:
        return None

    try:
        signals = extract_signals(doc, mate_in_before=mate_in_before, board_before=board_before)
        templates = TEMPLATE_MAP.get(signals.classification, [])

        for condition, template in templates:
            try:
                if condition(signals):
                    return interpolate(template, signals)
            except Exception as e:
                log.debug("Coach template condition error: %s", e)
                continue

    except Exception as e:
        log.warning("Coach message generation failed for %s: %s", doc.move, e)

    return None


async def get_coach_message_cached(
    doc: MoveDocument,
    *,
    mate_in_before: int | None,
    board_before: chess.Board,
) -> str | None:
    if doc.classification not in COACHED_CLASSIFICATIONS:
        return None

    cached = await CoachMessageRepository.get(
        doc.fen_before, doc.move_uci, doc.classification
    )
    if cached:
        return cached

    message = get_coach_message(
        doc, mate_in_before=mate_in_before, board_before=board_before
    )
    if message:
        await CoachMessageRepository.store(
            doc.fen_before, doc.move_uci, doc.classification, message
        )

    return message
