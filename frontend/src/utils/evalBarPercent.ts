/** Map engine eval (pawns) and optional mate to bar fill percent (white = top). */
export function evalToBarPercent(evalScore: number, mateIn: number | null | undefined): number {
  if (mateIn !== null && mateIn !== undefined) {
    return mateIn > 0 ? 96 : 4;
  }
  return 50 + 47 * Math.tanh(evalScore / 650);
}
