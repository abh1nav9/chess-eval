import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Button } from '@/components/ui/Button';
import type { MoveEvaluation } from '@/types';
import type { Square } from 'chess.js';
import { CLASSIFICATION_ARROW_COLOR } from '@/constants';

type ComparisonModalProps = {
  move: MoveEvaluation | null;
  open: boolean;
  onClose: () => void;
};

function uciToArrowTuples(uci: string | null | undefined, rgb: string): [Square, Square, string][] {
  if (!uci || uci.length < 4) return [];
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  return [[from, to, rgb]];
}

function fenAfterBest(move: MoveEvaluation): string | null {
  if (!move.best_move_uci) return null;
  try {
    const b = new Chess(move.fen_before);
    const m = b.move(move.best_move_uci);
    if (!m) return null;
    return b.fen();
  } catch {
    return null;
  }
}

/** Side-by-side boards: played line vs engine best (analysis.md §7.1). */
export function ComparisonModal({ move, open, onClose }: ComparisonModalProps) {
  if (!open || !move) return null;
  const bestFen = fenAfterBest(move);
  if (!bestFen) return null;

  const playedRgb = CLASSIFICATION_ARROW_COLOR[move.classification];
  const bestRgb = CLASSIFICATION_ARROW_COLOR.best;
  const playedArrows = uciToArrowTuples(move.move_uci, playedRgb);
  const bestArrows = move.best_move_uci
    ? uciToArrowTuples(move.best_move_uci, bestRgb)
    : [];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-3 py-6 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Played vs best comparison"
      onClick={onClose}
    >
      <div
        className="max-w-4xl w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col sm:flex-row gap-4 items-start justify-center">
          <div className="w-full sm:w-[min(100%,320px)]">
            <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase mb-1">Played</p>
            <Chessboard
              position={move.fen_after}
              boardOrientation="white"
              arePiecesDraggable={false}
              areArrowsAllowed={true}
              customArrows={playedArrows}
              customBoardStyle={{ borderRadius: 8 }}
            />
          </div>
          <div className="w-full sm:w-[min(100%,320px)]">
            <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase mb-1">Engine best</p>
            <Chessboard
              position={bestFen}
              boardOrientation="white"
              arePiecesDraggable={false}
              areArrowsAllowed={true}
              customArrows={bestArrows}
              customBoardStyle={{ borderRadius: 8 }}
            />
          </div>
        </div>
        <Button type="button" className="mt-4 w-full" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
