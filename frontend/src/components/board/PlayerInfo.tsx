import { useMemo, useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { proxiedChessComAvatarUrl } from '@/utils/avatarProxy';

interface PlayerInfoProps {
  name: string;
  rating?: string;
  accuracy?: string | null;
  title?: string | null;
  avatarUrl?: string | null;
  color: 'white' | 'black';
  active?: boolean;
  clock?: string;
  /** Position eval (white POV), shown in a strip left of the avatar to align with the eval bar column. */
  evalDisplay?: string | null;
}

const PIECE_UNICODE: Record<string, string> = {
  q: '\u265B', Q: '\u2655',
  r: '\u265C', R: '\u2656',
  b: '\u265D', B: '\u2657',
  n: '\u265E', N: '\u2658',
  p: '\u265F', P: '\u2659',
};

const PIECE_VALUE: Record<string, number> = { q: 9, r: 5, b: 3, n: 3, p: 1 };
const PIECE_ORDER = ['q', 'r', 'b', 'n', 'p'];

function getCapturedPieces(fen: string) {
  const board = fen.split(' ')[0];

  const startingPieces: Record<string, number> = {
    K: 1, Q: 1, R: 2, B: 2, N: 2, P: 8,
    k: 1, q: 1, r: 2, b: 2, n: 2, p: 8,
  };

  const current: Record<string, number> = {};
  for (const ch of board) {
    if (/[a-zA-Z]/.test(ch) && ch in startingPieces) {
      current[ch] = (current[ch] || 0) + 1;
    }
  }

  const whiteCaptured: string[] = [];
  const blackCaptured: string[] = [];

  for (const piece of PIECE_ORDER) {
    const upper = piece.toUpperCase();
    const missingWhite = (startingPieces[upper] || 0) - (current[upper] || 0);
    const missingBlack = (startingPieces[piece] || 0) - (current[piece] || 0);

    for (let i = 0; i < missingWhite; i++) blackCaptured.push(upper);
    for (let i = 0; i < missingBlack; i++) whiteCaptured.push(piece);
  }

  const whiteValue = whiteCaptured.reduce((s, p) => s + (PIECE_VALUE[p.toLowerCase()] || 0), 0);
  const blackValue = blackCaptured.reduce((s, p) => s + (PIECE_VALUE[p.toLowerCase()] || 0), 0);

  return { whiteCaptured, blackCaptured, advantage: whiteValue - blackValue };
}

export function PlayerInfo({
  name,
  rating,
  accuracy,
  title,
  avatarUrl,
  color,
  active,
  clock,
  evalDisplay,
}: PlayerInfoProps) {
  const currentFen = useGameStore((s) => s.currentFen);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  const { captured, advantage } = useMemo(() => {
    const { whiteCaptured, blackCaptured, advantage } = getCapturedPieces(currentFen);
    return {
      captured: color === 'white' ? whiteCaptured : blackCaptured,
      advantage: color === 'white' ? advantage : -advantage,
    };
  }, [currentFen, color]);

  return (
    <div className={`flex items-center justify-between py-1.5 px-1 transition-opacity ${active ? 'opacity-100' : 'opacity-60'}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          {evalDisplay ? (
            <span className="w-7 text-right text-[10px] font-mono font-semibold tabular-nums tracking-tight text-[var(--color-text-secondary)] leading-none self-center">
              {evalDisplay}
            </span>
          ) : null}
          <div
            className={`w-7 h-7 rounded overflow-hidden shrink-0 flex items-center justify-center ${
              color === 'white'
                ? 'bg-[var(--color-white-square)] text-[#333]'
                : 'bg-[var(--color-black-square)] text-white border border-[var(--color-border-subtle)]'
            }`}
          >
          {avatarUrl && !avatarFailed ? (
            <img
              src={proxiedChessComAvatarUrl(avatarUrl) ?? avatarUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <User size={14} />
          )}
          </div>
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {title ? (
              <span className="text-[10px] font-bold font-mono text-amber-500/95 tracking-tight">
                {title}
              </span>
            ) : null}
            <span className="text-sm font-semibold text-[var(--color-text-primary)] tracking-tight">
              {name}
            </span>
            {rating && (
              <span className="text-[10px] font-mono bg-[var(--color-bg-hover)] px-1.5 py-0.5 rounded text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                {rating}
              </span>
            )}
            {accuracy ? (
              <span className="text-[10px] font-mono font-semibold text-[var(--color-text-secondary)] tabular-nums">
                {accuracy}
              </span>
            ) : null}
          </div>
          {captured.length > 0 && (
            <div className="flex items-center gap-0.5 mt-0.5">
              <span className="text-[13px] leading-none tracking-tighter opacity-70">
                {captured.map((p, i) => (
                  <span key={i}>{PIECE_UNICODE[p]}</span>
                ))}
              </span>
              {advantage > 0 && (
                <span className="text-[10px] font-mono text-[var(--color-text-muted)] ml-1">
                  +{advantage}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {clock && (
        <div className="flex items-center gap-1.5 bg-[var(--color-bg-hover)] px-2 py-1 rounded border border-[var(--color-border-subtle)]">
          <span className="text-xs font-mono font-semibold text-[var(--color-text-primary)]">
            {clock}
          </span>
        </div>
      )}
    </div>
  );
}
