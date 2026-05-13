import { Chess, type Move } from 'chess.js';

/** Replay `moveHistory[moveIndex]` from `fenHistory[moveIndex]`; returns null if illegal. */
export function getVerboseMoveAtHistoryIndex(
  fenHistory: string[],
  moveHistory: string[],
  moveIndex: number,
): Move | null {
  if (moveIndex < 0 || moveIndex >= moveHistory.length || moveIndex >= fenHistory.length - 1) {
    return null;
  }
  try {
    const game = new Chess(fenHistory[moveIndex]);
    return game.move(moveHistory[moveIndex]);
  } catch {
    return null;
  }
}
