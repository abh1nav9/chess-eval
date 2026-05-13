import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useGameStore } from '@/store/gameStore';
import { useSubmitPGN } from '@/hooks/useAnalysis';
import { DEFAULT_PGN_ANALYSIS_DEPTH } from '@/constants/analysisDepth';

const DEPTH_OPTIONS = [
  { value: 18, label: '18', description: 'Fast' },
  { value: 22, label: '22', description: 'Balanced' },
  { value: 26, label: '26', description: 'Standard' },
  { value: 30, label: '30', description: 'Very Deep' },
  { value: 36, label: '36', description: 'Maximum' },
];

export function ReanalyzePanel() {
  const { pgnResult, isAnalyzing, chessComPlayerOverlay } = useAnalysisStore();
  const { loadGame } = useGameStore();
  const submitPGN = useSubmitPGN();
  const [selectedDepth, setSelectedDepth] = useState(DEFAULT_PGN_ANALYSIS_DEPTH);

  useEffect(() => {
    if (!pgnResult) return;
    setSelectedDepth(pgnResult.depth ?? DEFAULT_PGN_ANALYSIS_DEPTH);
  }, [pgnResult?.analysis_id, pgnResult?.depth, pgnResult]);

  if (!pgnResult || isAnalyzing) return null;

  const analysisDepth = pgnResult.depth ?? DEFAULT_PGN_ANALYSIS_DEPTH;

  const handleReanalyze = () => {
    if (!pgnResult.pgn) return;
    loadGame(pgnResult.pgn);
    submitPGN.mutate({
      pgn: pgnResult.pgn,
      depth: selectedDepth,
      chessComPlayerOverlay: chessComPlayerOverlay ?? undefined,
    });
  };

  return (
    <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-primary)] border border-[var(--color-border)]">
      <div className="flex items-center gap-1.5 mb-2">
        <RefreshCw size={11} className="text-[var(--color-text-muted)]" />
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase">Re-analyze</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        {DEPTH_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelectedDepth(opt.value)}
            className={`flex-1 py-1.5 text-xs rounded-[var(--radius-sm)] transition-all cursor-pointer border ${
              selectedDepth === opt.value
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)] border-[var(--color-accent)]'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-muted)]'
            }`}
            title={opt.description}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button
        onClick={handleReanalyze}
        disabled={selectedDepth === analysisDepth}
        className="w-full py-2 text-xs font-medium rounded-[var(--radius-sm)] transition-all cursor-pointer bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Re-analyze at depth {selectedDepth}
      </button>

      <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5 text-center">
        Higher depth = more accurate but slower
      </p>
    </div>
  );
}
