import type { MoveClassification } from '@/types';

export const CLASSIFICATION_CONFIG: Record<
  MoveClassification,
  { label: string; color: string; symbol: string }
> = {
  brilliant: { label: 'Brilliant', color: 'var(--color-brilliant)', symbol: '!!' },
  great: { label: 'Great', color: 'var(--color-great)', symbol: '!' },
  book: { label: 'Book', color: 'var(--color-book)', symbol: '📖' },
  best: { label: 'Best', color: 'var(--color-best)', symbol: '★' },
  excellent: { label: 'Excellent', color: 'var(--color-excellent)', symbol: '👍' },
  good: { label: 'Good', color: 'var(--color-good)', symbol: '✓' },
  inaccuracy: { label: 'Inaccuracy', color: 'var(--color-inaccuracy)', symbol: '?!' },
  mistake: { label: 'Mistake', color: 'var(--color-mistake)', symbol: '?' },
  miss: { label: 'Miss', color: 'var(--color-miss)', symbol: '✕' },
  blunder: { label: 'Blunder', color: 'var(--color-blunder)', symbol: '??' },
};

/** Solid RGB for board arrows (SVG cannot use CSS variables reliably). */
export const CLASSIFICATION_ARROW_COLOR: Record<MoveClassification, string> = {
  brilliant: 'rgb(38, 166, 91)',
  great: 'rgb(92, 138, 207)',
  book: 'rgb(168, 132, 82)',
  best: 'rgb(186, 150, 48)',
  excellent: 'rgb(74, 185, 82)',
  good: 'rgb(92, 175, 92)',
  inaccuracy: 'rgb(214, 182, 44)',
  mistake: 'rgb(224, 152, 52)',
  miss: 'rgb(207, 68, 68)',
  blunder: 'rgb(192, 44, 44)',
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

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8888';
