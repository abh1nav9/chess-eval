import type { MoveClassification } from '@/types';
import { CLASSIFICATION_CONFIG } from '@/constants';

interface BadgeProps {
  classification: MoveClassification;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  labelClassName?: string;
}

export function Badge({ classification, size = 'sm', showLabel = false, labelClassName = '' }: BadgeProps) {
  const config = CLASSIFICATION_CONFIG[classification];
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs';

  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span
        className={`${sizeClass} inline-flex items-center justify-center rounded-full font-bold shrink-0`}
        style={{
          backgroundColor: `${config.color}20`,
          color: config.color,
          border: `1px solid ${config.color}40`,
        }}
        title={config.label}
      >
        {config.symbol}
      </span>
      {showLabel && (
        <span
          className={`font-medium min-w-0 truncate ${size === 'sm' ? 'text-[10px]' : 'text-xs'} ${labelClassName}`}
          style={{ color: config.color }}
          title={config.label}
        >
          {config.label}
        </span>
      )}
    </span>
  );
}
