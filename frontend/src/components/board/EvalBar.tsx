import { motion } from 'framer-motion';

interface EvalBarProps {
  eval_score: number;
  mate_in?: number | null;
  height?: number;
}

export function EvalBar({ eval_score, mate_in, height = 560 }: EvalBarProps) {
  let whitePercent: number;
  let displayText: string;

  if (mate_in !== null && mate_in !== undefined) {
    whitePercent = mate_in > 0 ? 100 : 0;
    displayText = `M${Math.abs(mate_in)}`;
  } else {
    // Chess.com-style: more sensitive to small eval changes
    // Linear in the ±2 range, then gradual compression beyond that
    const clamped = Math.max(-10, Math.min(10, eval_score));
    if (Math.abs(clamped) <= 2) {
      // Linear region: 0 maps to 50%, ±2 maps to ~35%/65%
      whitePercent = 50 + (clamped / 2) * 15;
    } else {
      // Compressed region beyond ±2
      const sign = clamped > 0 ? 1 : -1;
      const excess = Math.abs(clamped) - 2;
      const compressed = 15 + (excess / 8) * 35;
      whitePercent = 50 + sign * Math.min(compressed, 48);
    }

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
