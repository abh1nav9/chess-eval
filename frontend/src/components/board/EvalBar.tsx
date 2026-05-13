import { motion } from 'framer-motion';
import { ANALYSIS_BOARD_PIXEL_SIZE } from '@/constants/boardLayout';
import { formatEvalDisplay } from '@/utils/formatEvalDisplay';
import { evalToBarPercent } from '@/utils/evalBarPercent';

interface EvalBarProps {
  eval_score: number;
  mate_in?: number | null;
  /** Height of the colored bar in px; should match chessboard side length. */
  barLength?: number;
  /** When true (default), white sits toward bottom of screen — light segment at bottom. When false, light segment at top. */
  whiteOnScreenBottom?: boolean;
}

export function EvalBar({
  eval_score,
  mate_in,
  barLength = ANALYSIS_BOARD_PIXEL_SIZE,
  whiteOnScreenBottom = true,
}: EvalBarProps) {
  const whitePercent = evalToBarPercent(eval_score, mate_in ?? null);
  const displayText = formatEvalDisplay(eval_score, mate_in);

  return (
    <div
      className="relative shrink-0"
      style={{ width: 28, height: barLength }}
      aria-label={
        whiteOnScreenBottom
          ? `Evaluation ${displayText}, white toward bottom of screen`
          : `Evaluation ${displayText}, white toward top of screen`
      }
    >
      <div
        className="absolute inset-0 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--color-border)]"
        aria-hidden="true"
      >
        {whiteOnScreenBottom ? (
          <>
            <motion.div
              className="absolute top-0 left-0 right-0 bg-[var(--color-black-square)]"
              initial={false}
              animate={{ height: `${100 - whitePercent}%` }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            />
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-[var(--color-white-square)]"
              initial={false}
              animate={{ height: `${whitePercent}%` }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </>
        ) : (
          <>
            <motion.div
              className="absolute top-0 left-0 right-0 bg-[var(--color-white-square)]"
              initial={false}
              animate={{ height: `${whitePercent}%` }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            />
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-[var(--color-black-square)]"
              initial={false}
              animate={{ height: `${100 - whitePercent}%` }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </>
        )}
      </div>
    </div>
  );
}
