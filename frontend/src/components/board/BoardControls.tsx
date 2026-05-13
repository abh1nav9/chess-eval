import { useGameStore } from '@/store/gameStore';
import { useAnalysisStore } from '@/store/analysisStore';
import { useUIStore } from '@/store/uiStore';
import { BOARD_THEMES, type BoardThemeId } from '@/constants/boardTheme';
import { Button } from '@/components/ui/Button';
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Copy,
  Keyboard,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { gameSoundCoordinator } from '@/audio/GameSoundCoordinator';

function syncSelection() {
  const { isExploring } = useGameStore.getState();
  const { pgnResult, clearExplorationMoves } = useAnalysisStore.getState();

  if (!isExploring && pgnResult) {
    useAnalysisStore.getState().setSelectedMove(useGameStore.getState().currentMoveIndex);
  }

  if (!isExploring) {
    clearExplorationMoves();
  }
}

export function BoardControls() {
  const { firstMove, prevMove, nextMove, lastMove, flipBoard, currentMoveIndex, fenHistory, currentFen } =
    useGameStore();
  const pgnResult = useAnalysisStore((s) => s.pgnResult);
  const boardTheme = useUIStore((s) => s.boardTheme);
  const setBoardTheme = useUIStore((s) => s.setBoardTheme);
  const [helpOpen, setHelpOpen] = useState(false);

  const isAtStart = currentMoveIndex === -1;
  const isAtEnd = currentMoveIndex >= fenHistory.length - 2;

  const runNav = useCallback((action: () => void) => {
    const prev = useGameStore.getState().currentMoveIndex;
    action();
    syncSelection();
    const snap = useGameStore.getState();
    gameSoundCoordinator.onBoardNavigation(prev, snap.currentMoveIndex, snap);
  }, []);

  const copyFen = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentFen);
    } catch {
      /* ignore */
    }
  }, [currentFen]);

  const copyPgn = useCallback(async () => {
    const pgn = pgnResult?.pgn?.trim();
    if (!pgn) return;
    try {
      await navigator.clipboard.writeText(pgn);
    } catch {
      /* ignore */
    }
  }, [pgnResult?.pgn]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setHelpOpen((o) => !o);
        return;
      }
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          runNav(prevMove);
          break;
        case 'ArrowRight':
          e.preventDefault();
          runNav(nextMove);
          break;
        case 'Home':
          e.preventDefault();
          runNav(firstMove);
          break;
        case 'End':
          e.preventDefault();
          runNav(lastMove);
          break;
        case 'f':
          e.preventDefault();
          flipBoard();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [runNav, flipBoard, firstMove, prevMove, nextMove, lastMove]);

  return (
    <>
      <div className="flex flex-col items-center gap-2 mt-3">
        <div className="flex items-center justify-center gap-1 flex-wrap">
          <Button variant="ghost" size="sm" onClick={flipBoard} title="Flip board (F)">
            <RotateCcw size={18} />
          </Button>
          <div className="w-px h-6 bg-[var(--color-border)] mx-1" />
          <Button variant="ghost" size="sm" onClick={copyFen} title="Copy current FEN">
            <span className="text-[10px] font-mono pr-1">FEN</span>
            <Copy size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyPgn}
            disabled={!pgnResult?.pgn}
            title="Copy full game PGN"
          >
            <span className="text-[10px] font-mono pr-1">PGN</span>
            <Copy size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setHelpOpen(true)} title="Keyboard shortcuts (?)">
            <Keyboard size={16} />
          </Button>
          <div className="w-px h-6 bg-[var(--color-border)] mx-1" />
          <Button variant="ghost" size="sm" onClick={() => runNav(firstMove)} disabled={isAtStart} title="First move (Home)">
            <ChevronFirst size={20} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => runNav(prevMove)} disabled={isAtStart} title="Previous (Left Arrow)">
            <ChevronLeft size={20} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => runNav(nextMove)} disabled={isAtEnd} title="Next (Right Arrow)">
            <ChevronRight size={20} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => runNav(lastMove)} disabled={isAtEnd} title="Last move (End)">
            <ChevronLast size={20} />
          </Button>
        </div>
        <div className="flex items-center justify-center gap-2">
          <label htmlFor="board-theme" className="text-[10px] text-[var(--color-text-muted)] shrink-0">
            Board
          </label>
          <select
            id="board-theme"
            value={boardTheme}
            onChange={(e) => setBoardTheme(e.target.value as BoardThemeId)}
            className="text-xs rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] px-2 py-1 max-w-[140px]"
          >
            {(Object.keys(BOARD_THEMES) as BoardThemeId[]).map((id) => (
              <option key={id} value={id}>
                {BOARD_THEMES[id].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {helpOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="max-w-sm w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 shadow-xl text-sm text-[var(--color-text-primary)]"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3 className="font-semibold mb-3">Shortcuts</h3>
            <ul className="space-y-1.5 text-[var(--color-text-secondary)] text-xs">
              <li><kbd className="font-mono">←</kbd> / <kbd className="font-mono">→</kbd> Previous / next move</li>
              <li><kbd className="font-mono">Home</kbd> Start position</li>
              <li><kbd className="font-mono">End</kbd> Final position</li>
              <li><kbd className="font-mono">F</kbd> Flip board</li>
              <li><kbd className="font-mono">?</kbd> Toggle this panel</li>
            </ul>
            <Button className="mt-4 w-full" variant="outline" size="sm" onClick={() => setHelpOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
