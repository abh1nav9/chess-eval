import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAnalysisStore } from '@/store/analysisStore';
import { useGameStore } from '@/store/gameStore';
import { Badge } from '@/components/ui/Badge';
import type { MoveEvaluation } from '@/types';

export function MoveList() {
  const { pgnResult, selectedMoveIndex, setSelectedMove } = useAnalysisStore();
  const { goToMove } = useGameStore();
  const listRef = useRef<HTMLDivElement>(null);

  const moves = pgnResult?.moves || [];

  const handleMoveClick = (index: number) => {
    setSelectedMove(index);
    goToMove(index);
  };

  // Auto-scroll to selected move
  useEffect(() => {
    if (listRef.current && selectedMoveIndex >= 0) {
      const el = listRef.current.querySelector(`[data-move="${selectedMoveIndex}"]`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedMoveIndex]);

  if (moves.length === 0) return null;

  // Group moves into pairs (white + black)
  const pairs: [MoveEvaluation | null, MoveEvaluation | null][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i] || null, moves[i + 1] || null]);
  }

  return (
    <div ref={listRef} className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: '400px' }}>
      <div className="space-y-px">
        {pairs.map((pair, pairIndex) => {
          const [white, black] = pair;
          const moveNum = pairIndex + 1;

          return (
            <div key={pairIndex} className="flex items-stretch text-sm">
              {/* Move number */}
              <div className="w-8 shrink-0 flex items-center justify-center text-xs text-[var(--color-text-muted)] font-mono">
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
      className={`
        flex-1 flex items-center gap-1.5 px-2 py-1.5 text-left
        transition-colors duration-150 cursor-pointer rounded-[var(--radius-sm)]
        ${isSelected
          ? 'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
        }
      `}
    >
      <Badge classification={move.classification} size="sm" />
      <span className="font-mono text-xs font-medium">{move.move}</span>
    </motion.button>
  );
}
