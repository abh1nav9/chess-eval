import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useGameStore } from '@/store/gameStore';
import { gameSoundCoordinator } from '@/audio/GameSoundCoordinator';
import { Badge } from '@/components/ui/Badge';
import { ClassificationLegendModal } from '@/components/analysis/ClassificationLegendModal';
import { MoveCommentCollapsible } from '@/components/analysis/MoveCommentCollapsible';
import { ComparisonModal } from '@/components/analysis/ComparisonModal';
import { CLASSIFICATION_CONFIG } from '@/constants';
import { COACH_CLASSIFICATION_META } from '@/components/board/CoachMessage';
import type { MoveEvaluation } from '@/types';

export function MoveList() {
  const { pgnResult, selectedMoveIndex, setSelectedMove } = useAnalysisStore();
  const { goToMove } = useGameStore();
  const listRef = useRef<HTMLDivElement>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [compareMove, setCompareMove] = useState<MoveEvaluation | null>(null);

  const moves = pgnResult?.moves || [];

  const handleMoveClick = (index: number) => {
    const prev = useGameStore.getState().currentMoveIndex;
    setSelectedMove(index);
    goToMove(index);
    const snap = useGameStore.getState();
    gameSoundCoordinator.onBoardNavigation(prev, snap.currentMoveIndex, snap);
  };

  useEffect(() => {
    if (listRef.current && selectedMoveIndex >= 0) {
      const el = listRef.current.querySelector(`[data-move="${selectedMoveIndex}"]`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedMoveIndex]);

  if (moves.length === 0) return null;

  const sel = selectedMoveIndex >= 0 ? moves[selectedMoveIndex] : null;
  const canCompare =
    sel &&
    sel.best_move_uci &&
    sel.move_uci &&
    sel.best_move_uci !== sel.move_uci &&
    sel.classification !== 'book';

  const pairs: [MoveEvaluation | null, MoveEvaluation | null][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i] || null, moves[i + 1] || null]);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <ClassificationLegendModal isOpen={legendOpen} onClose={() => setLegendOpen(false)} />
      <ComparisonModal move={compareMove} open={compareMove !== null} onClose={() => setCompareMove(null)} />

      <div className="sticky top-0 z-[1] flex justify-between items-center gap-2 py-1.5 mb-1 -mx-0.5 px-0.5 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-card)]">
        {canCompare ? (
          <button
            type="button"
            onClick={() => setCompareMove(sel)}
            className="text-[10px] font-medium text-[var(--color-accent)] hover:underline cursor-pointer px-2"
          >
            Compare played / best
          </button>
        ) : (
          <span className="w-2 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          onClick={() => setLegendOpen(true)}
          className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-[10px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
          title="What do the icons mean?"
        >
          <Info size={14} className="shrink-0" aria-hidden />
          <span>Classifications</span>
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="space-y-px">
        {pairs.map((pair, pairIndex) => {
          const [white, black] = pair;
          const moveNum = pairIndex + 1;

          return (
            <div key={pairIndex} className="flex items-stretch text-sm">
              {/* Move number */}
              <div className="w-8 shrink-0 flex items-center justify-center text-[11px] text-[var(--color-text-muted)] font-mono">
                {moveNum}.
              </div>

              {/* White move */}
              {white && (
                <MoveCell
                  move={white}
                  index={pairIndex * 2}
                  isSelected={selectedMoveIndex === pairIndex * 2}
                  onClick={() => handleMoveClick(pairIndex * 2)}
                />
              )}

              {/* Black move */}
              {black && (
                <MoveCell
                  move={black}
                  index={pairIndex * 2 + 1}
                  isSelected={selectedMoveIndex === pairIndex * 2 + 1}
                  onClick={() => handleMoveClick(pairIndex * 2 + 1)}
                />
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

function MoveCell({
  move,
  index,
  isSelected,
  onClick,
}: {
  move: MoveEvaluation;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      data-move={index}
      onClick={onClick}
      whileHover={{ backgroundColor: 'var(--color-bg-hover)' }}
      aria-label={`${move.move}, ${CLASSIFICATION_CONFIG[move.classification].label}`}
      className={`
        flex-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-2 py-1.5 text-left min-w-0
        transition-colors duration-150 cursor-pointer rounded-[var(--radius-sm)]
        ${isSelected
          ? 'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
        }
      `}
    >
      <span className="inline-flex min-w-0 max-w-full shrink-0 items-center">
        <Badge classification={move.classification} size="sm" showLabel />
      </span>
      <span className="relative font-mono text-xs font-medium min-w-0 flex-1 basis-[2ch]">
        {move.move}
        {move.coach_message && (
          <span
            className="absolute -top-0.5 -right-1.5 h-1.5 w-1.5 rounded-full"
            style={{
              background:
                COACH_CLASSIFICATION_META[move.classification]?.color ?? '#8ca0b8',
            }}
            aria-hidden
          />
        )}
      </span>
      {move.comment ? <MoveCommentCollapsible text={move.comment} /> : null}
      {/* Per-move time (from PGN %clk if available) */}
      {(move as MoveEvaluation & { time_spent?: number }).time_spent != null && (
        <span className="text-[9px] font-mono text-[var(--color-text-muted)] ml-auto tabular-nums">
          {formatMoveTime((move as MoveEvaluation & { time_spent?: number }).time_spent!)}
        </span>
      )}
    </motion.button>
  );
}

function formatMoveTime(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toFixed(0)}s`;
  }
  return `${seconds.toFixed(1)}s`;
}
