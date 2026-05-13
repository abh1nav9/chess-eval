/** Single-line label: optional FIDE title, display name or username, optional rating. */
export function formatChessComPlayerLabel(opts: {
  username: string;
  rating: number | null;
  title?: string | null;
  displayName?: string | null;
}): string {
  const t = opts.title?.trim() ? `${opts.title.trim()} ` : '';
  const name = opts.displayName?.trim() || opts.username;
  const r = opts.rating != null ? ` (${opts.rating})` : '';
  return `${t}${name}${r}`;
}
