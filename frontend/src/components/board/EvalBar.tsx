import { motion } from 'framer-motion';
import { evalToBarPercent } from '@/utils/evalBarPercent';

interface EvalBarProps {
  eval_score: number;
  mate_in?: number | null;
  height?: number;
}

export function EvalBar({ eval_score, mate_in, height = 560 }: EvalBarProps) {
  const whitePercent = evalToBarPercent(eval_score, mate_in ?? null);
  let displayText: string;

  if (mate_in !== null && mate_in !== undefined) {
    displayText = `M${Math.abs(mate_in)}`;
  } else {
    const absEval = Math.abs(eval_score);
    displayText = absEval >= 10
      ? `${eval_score > 0 ? '+' : ''}${eval_score.toFixed(0)}`
      : `${eval_score > 0 ? '+' : ''}${eval_score.toFixed(1)}`;
  }

  const isWhiteAdvantage = eval_score > 0 || (mate_in !== null && mate_in !== undefined && mate_in > 0);

  return (
    <div
      className="relative w-7 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--color-border)] flex-shrink-0"
      style={{ height }}
    >
      <motion.div
        className="absolute top-0 left-0 right-0 bg-[#333]"
        initial={{ height: '50%' }}
        animate={{ height: `${100 - whitePercent}%` }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      />

      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-[#f0f0f0]"
        initial={{ height: '50%' }}
        animate={{ height: `${whitePercent}%` }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      />

      <div className={`
        absolute left-0 right-0 flex items-center justify-center
        text-[9px] font-bold tracking-tight
        ${isWhiteAdvantage ? 'bottom-0.5 text-[#333]' : 'top-0.5 text-[#ccc]'}
      `}>
        <span className="leading-none">{displayText}</span>
      </div>
    </div>
  );
}
