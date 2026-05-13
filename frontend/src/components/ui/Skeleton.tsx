interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = '', lines = 1 }: SkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-[var(--color-bg-hover)] rounded-[var(--radius-sm)] animate-pulse"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="aspect-square w-full max-w-[560px] bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] animate-pulse flex items-center justify-center">
      <div className="grid grid-cols-8 grid-rows-8 w-[90%] h-[90%] rounded overflow-hidden opacity-20">
        {Array.from({ length: 64 }).map((_, i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const isLight = (row + col) % 2 === 0;
          return (
            <div
              key={i}
              className={isLight ? 'bg-[#ebecd0]' : 'bg-[#739552]'}
            />
          );
        })}
      </div>
    </div>
  );
}
