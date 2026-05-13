import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { CLASSIFICATION_CONFIG, CLASSIFICATION_ORDER } from '@/constants';
import type { MoveClassification } from '@/types';

const CLASSIFICATION_HINTS: Record<MoveClassification, string> = {
  brilliant: 'Only move that keeps a clear advantage at high depth.',
  great: 'One of the best engine moves with only a tiny eval cost.',
  book: 'Follows known opening theory from the database.',
  best: 'Matches the engine’s best reply at this depth.',
  excellent: 'Very close to best—minimal eval loss.',
  good: 'Solid move with a small but acceptable eval swing.',
  inaccuracy: 'Noticeable eval drop; another move was clearly better.',
  mistake: 'Loses a significant amount of advantage.',
  miss: 'Misses a strong tactical or positional resource.',
  blunder: 'A serious error that often changes the result.',
};

export function ClassificationLegendModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Move classifications" maxWidth="440px">
      <p className="text-sm text-[var(--color-text-muted)] mb-4 leading-relaxed">
        Each move is labeled by the engine. The icon matches the category name below.
      </p>
      <ul className="space-y-3.5">
        {CLASSIFICATION_ORDER.map((key) => {
          const c = CLASSIFICATION_CONFIG[key];
          return (
            <li key={key} className="flex items-start gap-3">
              <Badge classification={key} size="md" />
              <div className="min-w-0 pt-0.5">
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">{c.label}</div>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-snug">
                  {CLASSIFICATION_HINTS[key]}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
