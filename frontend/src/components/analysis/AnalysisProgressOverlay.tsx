import type { AnalysisProgressState } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/** User-facing copy for the analysis progress overlay. */
export class AnalysisProgressOverlayCopy {
  static title(progress: AnalysisProgressState | null): string {
    if (!progress) return 'Analyzing Game';
    if (progress.totalMoves > 0) return 'Engine Progress';
    if (progress.statusMessage) return 'Preparing Engine';
    return 'Analyzing Game';
  }

  static subtitle(progress: AnalysisProgressState | null): string {
    if (!progress) {
      return 'Running Stockfish on every position. This can take a minute for long games.';
    }
    if (progress.totalMoves > 0) {
      const moveText = `Move ${progress.currentMove} of ${progress.totalMoves}`;
      if (progress.currentSan) {
        return `${moveText} — last analyzed: ${progress.currentSan}`;
      }
      return moveText;
    }
    if (progress.statusMessage) {
      return progress.statusMessage;
    }
    return 'Parsing moves and connecting to the engine...';
  }
}

interface AnalysisProgressTrackProps {
  percentage: number;
}

function AnalysisProgressTrack({ percentage }: AnalysisProgressTrackProps) {
  const pct = Math.min(100, Math.max(0, percentage));
  return (
    <div
      className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.08] ring-1 ring-inset ring-white/[0.08]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label="Analysis completion"
    >
      <div
        className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface AnalysisProgressOverlayProps {
  visible: boolean;
  progress: AnalysisProgressState | null;
}

export function AnalysisProgressOverlay({ visible, progress }: AnalysisProgressOverlayProps) {
  const showBar = progress !== null && progress.totalMoves > 0;
  const pct = progress && showBar ? progress.percentage : 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="analysis-progress-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md px-4"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/95 p-10 shadow-2xl"
          >
            <div className="flex flex-col items-center gap-6 text-center">
              <Loader2
                size={36}
                className="shrink-0 text-[var(--color-accent)] animate-spin"
                aria-hidden
              />
              <div className="flex w-full flex-col gap-2">
                <h3 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                  {AnalysisProgressOverlayCopy.title(progress)}
                </h3>
                <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                  {AnalysisProgressOverlayCopy.subtitle(progress)}
                </p>
              </div>

              {showBar && (
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                    <span>Progress</span>
                    <span className="tabular-nums text-[var(--color-text-primary)]">
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <AnalysisProgressTrack percentage={pct} />
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
