import type { MoveClassification } from '@/types';

export const CLASSIFICATION_CONFIG: Record<
  MoveClassification,
  { label: string; color: string; symbol: string }
> = {
  brilliant: { label: 'Brilliant', color: 'var(--color-brilliant)', symbol: '!!' },
  best: { label: 'Best', color: 'var(--color-best)', symbol: '★' },
  excellent: { label: 'Excellent', color: 'var(--color-excellent)', symbol: '✓' },
  good: { label: 'Good', color: 'var(--color-good)', symbol: '•' },
  inaccuracy: { label: 'Inaccuracy', color: 'var(--color-inaccuracy)', symbol: '?!' },
  mistake: { label: 'Mistake', color: 'var(--color-mistake)', symbol: '?' },
  blunder: { label: 'Blunder', color: 'var(--color-blunder)', symbol: '??' },
  book: { label: 'Book', color: 'var(--color-book)', symbol: '📖' },
};

/** Solid RGB for board arrows (SVG cannot use CSS variables reliably). */
export const CLASSIFICATION_ARROW_COLOR: Record<MoveClassification, string> = {
  brilliant: 'rgb(56, 189, 248)',
  best: 'rgb(34, 197, 94)',
  excellent: 'rgb(74, 222, 128)',
  good: 'rgb(134, 239, 172)',
  inaccuracy: 'rgb(250, 204, 21)',
  mistake: 'rgb(251, 146, 60)',
  blunder: 'rgb(239, 68, 68)',
  book: 'rgb(161, 161, 170)',
};

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const SAMPLE_PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.05.13"]
[Round "?"]
[White "Zipiix"]
[Black "abhinavgautam9"]
[Result "1-0"]
[TimeControl "900+10"]
[WhiteElo "1253"]
[BlackElo "633"]
[Termination "Zipiix won by checkmate"]
[ECO "C50"]
[EndTime "9:30:25 GMT+0000"]
[Link "https://www.chess.com/game/live/168636710040"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 f6 4. d4 d6 5. O-O Bg4 6. c3 a6 7. a4 Bxf3 8. Qxf3
exd4 9. cxd4 Nxd4 10. Qh5+ g6 11. Qd5 Nc2 12. Qf7# 1-0`;

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
