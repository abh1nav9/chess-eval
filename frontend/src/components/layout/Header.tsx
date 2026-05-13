import { Link, useNavigate } from 'react-router-dom';
import { Crown, Sun, Moon, Plus } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAnalysisStore } from '@/store/analysisStore';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/Button';

export function Header() {
  const { theme, toggleTheme } = useUIStore();
  const navigate = useNavigate();
  const { pgnResult, fenResult, pendingAnalysisId, isAnalyzing, reset: resetAnalysis } =
    useAnalysisStore();
  const { reset: resetGame } = useGameStore();

  const showNewGame =
    !!pgnResult || !!fenResult || pendingAnalysisId !== null || isAnalyzing;

  const handleAnalyzeNewGame = () => {
    resetAnalysis();
    resetGame();
    useUIStore.getState().setActiveTab('moves');
    navigate('/');
  };

  return (
    <header className="h-14 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)]/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="h-full max-w-[1200px] mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-accent)] flex items-center justify-center shadow-sm">
            <Crown size={18} className="text-[var(--color-accent-fg)]" />
          </div>
          <span className="text-base font-bold text-[var(--color-text-primary)] tracking-tight">
            ChessEval
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {showNewGame && (
            <Button variant="outline" size="sm" onClick={handleAnalyzeNewGame} className="gap-1.5 shrink-0">
              <Plus size={14} aria-hidden />
              Analyze new game
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-eval-positive)] animate-pulse" />
            <span className="text-xs text-[var(--color-text-muted)]">Engine Ready</span>
          </div>

          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </div>
    </header>
  );
}
