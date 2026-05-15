import { AnimatePresence, motion } from 'framer-motion';
import type { MoveEvaluation } from '@/types/analysis';

export const COACH_CLASSIFICATION_META: Record<
  string,
  { label: string; icon: string; color: string; bg: string }
> = {
  brilliant: { label: 'Brilliant', icon: '!!', color: '#b491f7', bg: 'rgba(180,145,247,0.12)' },
  best: { label: 'Best', icon: '*', color: '#7ec8a0', bg: 'rgba(126,200,160,0.12)' },
  great: { label: 'Great', icon: '!', color: 'var(--color-great)', bg: 'rgba(92,138,207,0.12)' },
  excellent: { label: 'Excellent', icon: '+', color: '#5da0f0', bg: 'rgba(93,160,240,0.12)' },
  good: { label: 'Good', icon: 'ok', color: '#8ecf6e', bg: 'rgba(142,207,110,0.12)' },
  inaccuracy: { label: 'Inaccuracy', icon: '?!', color: '#e8c55a', bg: 'rgba(232,197,90,0.12)' },
  mistake: { label: 'Mistake', icon: '?', color: '#e8935a', bg: 'rgba(232,147,90,0.12)' },
  blunder: { label: 'Blunder', icon: '??', color: '#e05c5c', bg: 'rgba(224,92,92,0.12)' },
  miss: { label: 'Miss', icon: 'o', color: '#c87cd6', bg: 'rgba(200,124,214,0.12)' },
  book: { label: 'Book', icon: 'B', color: '#8ca0b8', bg: 'rgba(140,160,184,0.12)' },
};

const DEFAULT_META = {
  label: 'Move',
  icon: 'P',
  color: '#8ca0b8',
  bg: 'rgba(140,160,184,0.08)',
};

function evalBadge(move: MoveEvaluation): string | null {
  if (move.mate_in == null) return null;
  return `${move.mate_in > 0 ? '+' : '-'}M${Math.abs(move.mate_in)}`;
}

interface Props {
  move: MoveEvaluation | null;
}

export function CoachMessage({ move }: Props) {
  if (!move || !move.coach_message) return null;

  const meta = COACH_CLASSIFICATION_META[move.classification] ?? DEFAULT_META;
  const badge = evalBadge(move);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${move.move}-${move.classification}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18 }}
        style={{ background: meta.bg }}
        className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] p-3 mb-2"
      >
        <motion.div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
          style={{ background: meta.bg, border: `1.5px solid ${meta.color}` }}
          aria-hidden
        >
          ♟
        </motion.div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold leading-none flex-wrap">
            <span style={{ color: meta.color }}>{meta.icon}</span>
            <span className="font-mono">{move.move}</span>
            <span className="font-normal text-[var(--color-text-muted)]">is</span>
            <span style={{ color: meta.color }}>{meta.label}</span>
            {badge && (
              <span
                className="ml-auto rounded px-1.5 py-0.5 font-mono text-xs text-white"
                style={{ background: move.mate_in! > 0 ? '#2d6a4f' : '#7b2d2d' }}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm leading-snug text-[var(--color-text-muted)]">
            {move.coach_message}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
