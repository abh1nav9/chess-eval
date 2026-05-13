/** Reads `[Termination "..."]` from raw PGN text. */
export function parsePgnTermination(pgn: string): string | null {
  const match = pgn.match(/\[Termination\s+"([^"]*)"\]/i);
  return match?.[1]?.trim() ?? null;
}

export function isTimeoutTermination(pgn: string): boolean {
  const term = parsePgnTermination(pgn);
  if (!term) return false;
  return /time|timeout|flag|clock|forfeit/i.test(term);
}
