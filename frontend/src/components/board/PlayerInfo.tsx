import { User } from 'lucide-react';

interface PlayerInfoProps {
  name: string;
  rating?: string;
  color: 'white' | 'black';
  active?: boolean;
}

export function PlayerInfo({ name, rating, color, active }: PlayerInfoProps) {
  return (
    <div className={`flex items-center justify-between py-2 px-1 transition-opacity ${active ? 'opacity-100' : 'opacity-60'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center shadow-inner ${
          color === 'white' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-400 border border-white/5'
        }`}>
          <User size={16} />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--color-text-primary)] tracking-tight">
            {name}
          </span>
          {rating && (
            <span className="text-[10px] font-mono bg-zinc-800/50 px-1.5 py-0.5 rounded text-[var(--color-text-muted)] border border-white/5">
              {rating}
            </span>
          )}
        </div>
      </div>
      
      {/* Capture indicator or secondary info could go here */}
    </div>
  );
}
