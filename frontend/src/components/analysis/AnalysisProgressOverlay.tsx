import type { AnalysisProgressState } from '@/types';
import { AnalysisProgressOverlayCopy } from '@/components/analysis/AnalysisProgressOverlayCopy';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

function formatRemainingSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '';
  if (sec < 90) return `About ${Math.max(1, Math.round(sec))} s left`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `About ${m}m ${s}s left`;
}

function AnalysisProgressEta({ progress }: { progress: AnalysisProgressState }) {
  const [clock, setClock] = useState(() => Date.now());
  const inBand =
    !!progress.startedAtMs && progress.percentage >= 4 && progress.percentage <= 97;

  useEffect(() => {
    if (!inBand) return;
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [inBand, progress.startedAtMs, progress.percentage]);

  if (!inBand || !progress.startedAtMs) return null;

  const elapsed = (clock - progress.startedAtMs) / 1000;
  const p = Math.max(progress.percentage, 1);
  const estTotal = (elapsed / p) * 100;
  const remaining = estTotal - elapsed;
  const line = formatRemainingSeconds(remaining);
  if (!line) return null;
  return <p className="text-xs text-[var(--color-text-muted)] tabular-nums">{line}</p>;
}

interface AnalysisProgressTrackProps {
  percentage: number;
}

function AnalysisProgressTrack({ percentage }: AnalysisProgressTrackProps) {
  const pct = Math.min(100, Math.max(0, percentage));
  return (
    <div
      className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-hover)] ring-1 ring-inset ring-[var(--color-border)]"
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
          className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-md"
          style={{ backgroundColor: 'var(--color-overlay-scrim)' }}
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
                {showBar && progress && <AnalysisProgressEta progress={progress} />}
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
