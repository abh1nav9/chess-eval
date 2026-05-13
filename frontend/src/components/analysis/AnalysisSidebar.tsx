import { useUIStore } from '@/store/uiStore';
import { useAnalysisStore } from '@/store/analysisStore';
import { useGameStore } from '@/store/gameStore';
import { Tabs } from '@/components/ui/Tabs';
import { MoveList } from '@/components/analysis/MoveList';
import { EngineLines } from '@/components/analysis/EngineLines';
import { AnalysisSummary } from '@/components/analysis/AnalysisSummary';
import { TopEngineLines } from '@/components/analysis/TopEngineLines';
import { EvalGraph } from '@/components/charts/EvalGraph';
import { Card } from '@/components/ui/Card';
import { List, Cpu, PieChart, Settings, Plus, Save, Star } from 'lucide-react';

export function AnalysisSidebar() {
  const { activeTab, setActiveTab } = useUIStore();
  const { pgnResult, fenResult, reset: resetAnalysis } = useAnalysisStore();
  const { reset: resetGame } = useGameStore();

  const hasAnalysis = pgnResult || fenResult;

  const tabs = [
    { id: 'moves', label: 'Moves', icon: <List size={12} /> },
    { id: 'engine', label: 'Engine', icon: <Cpu size={12} /> },
    { id: 'summary', label: 'Summary', icon: <PieChart size={12} /> },
  ];

  if (!hasAnalysis) return null;

  const handleNewAnalysis = () => {
    resetAnalysis();
    resetGame();
  };

  return (
    <div className="w-[380px] shrink-0 flex flex-col h-[calc(100vh-112px)]">
      <Card padding="none" className="flex-1 flex flex-col min-h-0 linear-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Analysis</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
              depth=26 | Stockfish 18
            </span>
            {/* <button className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer">
              <Settings size={14} />
            </button> */}
          </div>
        </div>

        {/* Engine lines (always visible) */}
        <div className="px-3 pt-2">
          <TopEngineLines />
        </div>

        {/* Opening name */}
        {pgnResult?.metadata.opening && (
          <div className="px-3 pb-2 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-xs">
              {pgnResult.metadata.eco && (
                <span className="font-mono text-[var(--color-accent)] font-semibold">
                  {pgnResult.metadata.eco}
                </span>
              )}
              <span className="text-[var(--color-text-secondary)]">{pgnResult.metadata.opening}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="px-3 pt-2 pb-1">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as any)}
          />
        </div>

        {/* Tabbed content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2">
          {activeTab === 'moves' && <MoveList />}
          {activeTab === 'engine' && <EngineLines />}
          {activeTab === 'summary' && <AnalysisSummary />}
        </div>

        {/* Eval graph strip */}
        {pgnResult && (
          <div className="px-3 border-t border-[var(--color-border)]">
            <EvalGraph />
          </div>
        )}

        {/* Bottom action bar */}
        {/* <div className="flex items-center justify-center gap-4 px-3 py-2 border-t border-[var(--color-border)]">
          <button
            onClick={handleNewAnalysis}
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>New</span>
          </button>
          <button
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <Save size={13} />
            <span>Save</span>
          </button>
          <button
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <Star size={13} />
            <span>Review</span>
          </button>
          <button
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <Settings size={13} />
            <span>...</span>
          </button>
        </div> */}
      </Card>
    </div>
  );
}
