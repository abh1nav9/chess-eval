/** Lichess-style win% mapping (fitted to real game data); input is centipawns, white POV. */
const SIGMOID_K = 0.00368208;

/**
 * Centipawns (white POV) → bar fill percentage (0–100).
 * Sigmoid saturates without a hard cp cap.
 */
export function cpToBarPercent(cpCentipawns: number): number {
  return 100 / (1 + Math.exp(-SIGMOID_K * cpCentipawns));
}

/**
 * Mate in N (signed from white POV: positive = white mates) → bar fill %.
 * Asymptotic so M5 ≠ M1 visually; mateIn 0 is undefined — treated as balanced.
 */
export function mateToBarPercent(mateIn: number): number {
  if (mateIn === 0) return 50;
  if (mateIn > 0) return Math.min(99, 94 + 5 * (1 / mateIn));
  return Math.max(1, 6 - 5 * (1 / Math.abs(mateIn)));
}

/**
 * Engine eval in pawns (white POV) + optional mate → white segment height %.
 * Converts pawns to centipawns for the sigmoid. No eval → 50%.
 */
export function evalToBarPercent(
  evalPawns: number | null | undefined,
  mate: number | null | undefined,
): number {
  if (mate != null && mate !== undefined) {
    return mateToBarPercent(mate);
  }
  if (evalPawns != null && evalPawns !== undefined && Number.isFinite(evalPawns)) {
    return cpToBarPercent(evalPawns * 100);
  }
  return 50;
}
