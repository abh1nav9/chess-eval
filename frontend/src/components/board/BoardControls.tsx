import { useGameStore } from '@/store/gameStore';
import { useAnalysisStore } from '@/store/analysisStore';
import { Button } from '@/components/ui/Button';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useCallback, useEffect } from 'react';

function syncPgnMoveSelection() {
  if (!useAnalysisStore.getState().pgnResult) return;
  useAnalysisStore.getState().setSelectedMove(useGameStore.getState().currentMoveIndex);
}

export function BoardControls() {
  const { firstMove, prevMove, nextMove, lastMove, flipBoard, currentMoveIndex, fenHistory } =
    useGameStore();

  const isAtStart = currentMoveIndex === -1;
  const isAtEnd = currentMoveIndex >= fenHistory.length - 2;

  const runNav = useCallback((action: () => void) => {
    action();
    syncPgnMoveSelection();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
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
    <div className="flex items-center justify-center gap-1.5 mt-3">
      <Button variant="ghost" size="sm" onClick={flipBoard} title="Flip board (F)">
        <RotateCcw size={16} />
      </Button>
      <div className="w-px h-6 bg-[var(--color-border)] mx-1" />
      <Button variant="ghost" size="sm" onClick={() => runNav(firstMove)} disabled={isAtStart} title="First move (Home)">
        <ChevronFirst size={16} />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => runNav(prevMove)} disabled={isAtStart} title="Previous (←)">
        <ChevronLeft size={16} />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => runNav(nextMove)} disabled={isAtEnd} title="Next (→)">
        <ChevronRight size={16} />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => runNav(lastMove)} disabled={isAtEnd} title="Last move (End)">
        <ChevronLast size={16} />
      </Button>
    </div>
  );
}
