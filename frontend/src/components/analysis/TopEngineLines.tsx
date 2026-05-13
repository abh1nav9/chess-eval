import { useAnalysisStore } from '@/store/analysisStore';
import { useGameStore } from '@/store/gameStore';
import { CLASSIFICATION_CONFIG } from '@/constants';

export function TopEngineLines() {
  const { pgnResult, fenResult, selectedMoveIndex, mode } = useAnalysisStore();
  const isExploring = useGameStore((s) => s.isExploring);

  if (fenResult && (isExploring || mode === 'fen')) {
    return <FENLines lines={fenResult.top_lines} />;
  }

  if (!pgnResult || selectedMoveIndex < 0 || selectedMoveIndex >= pgnResult.moves.length) {
    return null;
  }

  const move = pgnResult.moves[selectedMoveIndex];
  const config = CLASSIFICATION_CONFIG[move.classification];
  const evalDisplay = move.mate_in
    ? `M${Math.abs(move.mate_in)}`
    : `${move.eval_after > 0 ? '+' : ''}${move.eval_after.toFixed(2)}`;

  const isPositive = move.eval_after > 0 || (move.mate_in !== null && move.mate_in > 0);

  return (
    <div className="space-y-1.5 pb-2 border-b border-[var(--color-border)]">
      {/* Primary eval line */}
      <div className="flex items-center gap-2">
        <span
          className="px-1.5 py-0.5 text-xs font-bold font-mono rounded"
          style={{
            backgroundColor: isPositive ? 'var(--color-eval-positive)' : 'var(--color-eval-negative)',
            color: '#fff',
          }}
        >
          {evalDisplay}
        </span>
        <span
          className="w-4 h-4 inline-flex items-center justify-center rounded-full text-[9px] font-bold"
          style={{ backgroundColor: `${config.color}30`, color: config.color }}
        >
          {config.symbol}
        </span>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {move.best_move && move.best_move !== move.move
            ? <><span className="font-semibold text-[var(--color-text-primary)]">{move.best_move}</span> is best</>
            : <span className="font-semibold text-[var(--color-text-primary)]">{move.move}</span>
          }
        </span>
        <span className="text-xs text-[var(--color-text-muted)] ml-auto">
          {move.move_number}{move.color === 'white' ? '.' : '...'} {move.move}
        </span>
      </div>

      {/* PV line */}
      {move.pv.length > 0 && (
        <div className="flex items-start gap-2 pl-1">
          <span className="text-[10px] font-mono text-[var(--color-text-muted)] shrink-0 pt-px">
            {evalDisplay}
          </span>
          <span className="text-[11px] font-mono text-[var(--color-text-secondary)] leading-relaxed truncate">
            {move.pv.join(' ')}
          </span>
        </div>
      )}
    </div>
  );
}

interface FENLinesProps {
  lines: Array<{
    rank: number;
    eval: number;
    move: string;
    pv: string[];
    mate_in: number | null;
  }>;
}

function FENLines({ lines }: FENLinesProps) {
  if (!lines || lines.length === 0) return null;

  return (
    <div className="space-y-1 pb-2 border-b border-[var(--color-border)]">
      {lines.map((line) => {
        const evalStr = line.mate_in
          ? `M${Math.abs(line.mate_in)}`
          : `${line.eval > 0 ? '+' : ''}${line.eval.toFixed(2)}`;
        const isPositive = line.eval > 0 || (line.mate_in !== null && line.mate_in > 0);

        return (
          <div key={line.rank} className="flex items-start gap-2">
            <span
              className="px-1.5 py-0.5 text-[10px] font-bold font-mono rounded shrink-0"
              style={{
                backgroundColor: isPositive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                color: isPositive ? 'var(--color-eval-positive)' : 'var(--color-eval-negative)',
              }}
            >
              {evalStr}
            </span>
            <span className="text-[11px] font-mono text-[var(--color-text-secondary)] leading-relaxed truncate">
              <span className="font-semibold text-[var(--color-text-primary)]">{line.move}</span>
              {' '}{line.pv.slice(1).join(' ')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
