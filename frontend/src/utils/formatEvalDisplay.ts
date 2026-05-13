/** Single-line eval for UI (matches engine bar conventions). */
export function formatEvalDisplay(evalScore: number, mateIn: number | null | undefined): string {
  if (mateIn !== null && mateIn !== undefined) {
    return `M${Math.abs(mateIn)}`;
  }
  const absEval = Math.abs(evalScore);
  return absEval >= 10
    ? `${evalScore > 0 ? '+' : ''}${evalScore.toFixed(0)}`
    : `${evalScore > 0 ? '+' : ''}${evalScore.toFixed(1)}`;
}
