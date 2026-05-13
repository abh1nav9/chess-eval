import type { MoveClassification } from '@/types';

/**
 * Classify a live move based on eval delta (from the side that moved).
 * Positive delta = good for the mover, negative = bad.
 */
export function classifyLiveMove(
  evalBefore: number,
  evalAfter: number,
  bestMoveUci: string | null,
  playedMoveUci: string,
  color: 'white' | 'black',
): MoveClassification {
  // Normalise eval to be from the moving side's perspective
  const signedBefore = color === 'white' ? evalBefore : -evalBefore;
  const signedAfter = color === 'white' ? evalAfter : -evalAfter;
  const delta = signedAfter - signedBefore;

  // Played the engine's top move
  if (bestMoveUci && playedMoveUci === bestMoveUci) {
    if (delta > 1.0) return 'brilliant';
    if (delta > 0.5) return 'great';
    return 'best';
  }

  // Based on centipawn loss
  const cpLoss = -delta * 100;

  if (cpLoss <= 10) return 'excellent';
  if (cpLoss <= 25) return 'good';
  if (cpLoss <= 50) return 'inaccuracy';
  if (cpLoss <= 100) return 'mistake';
  return 'blunder';
}
