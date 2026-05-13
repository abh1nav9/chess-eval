import { useAnalysisStore } from '@/store/analysisStore';
import { Badge } from '@/components/ui/Badge';
import { CLASSIFICATION_CONFIG } from '@/constants';
import { TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react';

export function EngineLines() {
  const { pgnResult, fenResult, selectedMoveIndex, mode } = useAnalysisStore();

  // FEN mode — show top engine lines
  if (mode === 'fen' && fenResult) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
          Engine Lines
        </h3>
        {fenResult.top_lines.map((line) => (
          <div
            key={line.rank}
            className="flex items-start gap-3 p-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-primary)] border border-[var(--color-border)]"
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-mono text-[var(--color-text-muted)]">
                #{line.rank}
              </span>
              <span
                className={`text-sm font-bold font-mono ${
                  line.eval > 0
                    ? 'text-[var(--color-eval-positive)]'
                    : line.eval < 0
                    ? 'text-[var(--color-eval-negative)]'
                    : 'text-[var(--color-eval-neutral)]'
                }`}
              >
                {line.mate_in !== null
                  ? `M${Math.abs(line.mate_in)}`
                  : `${line.eval > 0 ? '+' : ''}${line.eval.toFixed(1)}`}
              </span>
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] font-mono leading-relaxed">
              <span className="font-semibold text-[var(--color-text-primary)]">{line.move}</span>
              {' '}{line.pv.slice(1).join(' ')}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // PGN mode — show current move detail
  if (!pgnResult || selectedMoveIndex < 0 || selectedMoveIndex >= pgnResult.moves.length) {
    return (
      <div className="text-sm text-[var(--color-text-muted)] text-center py-8">
        Select a move to see engine analysis
      </div>
    );
  }

  const move = pgnResult.moves[selectedMoveIndex];
  const config = CLASSIFICATION_CONFIG[move.classification];
  const evalDelta = move.eval_after - move.eval_before;

  return (
    <div className="space-y-4">
      {/* Move header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge classification={move.classification} size="md" showLabel />
          <span className="text-lg font-bold font-mono text-[var(--color-text-primary)]">
            {move.move_number}{move.color === 'white' ? '.' : '...'} {move.move}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {evalDelta > 0.1 ? (
            <TrendingUp size={14} className="text-[var(--color-eval-positive)]" />
          ) : evalDelta < -0.1 ? (
            <TrendingDown size={14} className="text-[var(--color-eval-negative)]" />
          ) : (
            <Minus size={14} className="text-[var(--color-eval-neutral)]" />
          )}
          <span
            className={`text-sm font-mono font-bold ${
              evalDelta > 0
                ? 'text-[var(--color-eval-positive)]'
                : evalDelta < 0
                ? 'text-[var(--color-eval-negative)]'
                : 'text-[var(--color-eval-neutral)]'
            }`}
          >
            {evalDelta > 0 ? '+' : ''}{evalDelta.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Eval details */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-primary)] border border-[var(--color-border)]">
          <div className="text-[10px] text-[var(--color-text-muted)] uppercase">Before</div>
          <div className="text-sm font-mono font-bold text-[var(--color-text-primary)]">
            {move.eval_before > 0 ? '+' : ''}{move.eval_before.toFixed(2)}
          </div>
        </div>
        <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-primary)] border border-[var(--color-border)]">
          <div className="text-[10px] text-[var(--color-text-muted)] uppercase">After</div>
          <div className="text-sm font-mono font-bold text-[var(--color-text-primary)]">
            {move.eval_after > 0 ? '+' : ''}{move.eval_after.toFixed(2)}
          </div>
        </div>
      </div>

      {/* CP Loss */}
      <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-primary)] border border-[var(--color-border)]">
        <div className="text-[10px] text-[var(--color-text-muted)] uppercase mb-0.5">Centipawn Loss</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[var(--color-bg-hover)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, move.centipawn_loss / 3)}%`,
                backgroundColor: config.color,
              }}
            />
          </div>
          <span className="text-xs font-mono text-[var(--color-text-secondary)]">
            {move.centipawn_loss.toFixed(0)} cp
          </span>
        </div>
      </div>

      {/* Best move */}
      {move.best_move && move.classification !== 'best' && move.classification !== 'brilliant' && (
        <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-best)]10 border border-[var(--color-best)]30">
          <div className="flex items-center gap-1.5 mb-1">
            <Lightbulb size={12} className="text-[var(--color-best)]" />
            <span className="text-[10px] text-[var(--color-best)] uppercase font-medium">Best Move</span>
          </div>
          <div className="text-sm font-mono font-bold text-[var(--color-text-primary)]">
            {move.best_move}
          </div>
          {move.pv.length > 0 && (
            <div className="text-xs font-mono text-[var(--color-text-muted)] mt-1">
              PV: {move.pv.join(' ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
