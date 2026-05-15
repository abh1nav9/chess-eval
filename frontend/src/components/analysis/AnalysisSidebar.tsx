import { DEFAULT_PGN_ANALYSIS_DEPTH } from '@/constants/analysisDepth';
import { useUIStore } from '@/store/uiStore';
import { useAnalysisStore } from '@/store/analysisStore';
import { Tabs } from '@/components/ui/Tabs';
import { MoveList } from '@/components/analysis/MoveList';
import { EngineLines } from '@/components/analysis/EngineLines';
import { AnalysisSummary } from '@/components/analysis/AnalysisSummary';
import { TopEngineLines } from '@/components/analysis/TopEngineLines';
import { EvalGraph } from '@/components/charts/EvalGraph';
import { Card } from '@/components/ui/Card';
import { CoachMessage } from '@/components/board/CoachMessage';
import { List, Cpu, PieChart } from 'lucide-react';

export function AnalysisSidebar() {
  const { activeTab, setActiveTab } = useUIStore();
  const { pgnResult, fenResult, selectedMoveIndex } = useAnalysisStore();

  const hasAnalysis = pgnResult || fenResult;

  const tabs = [
    { id: 'moves', label: 'Moves', icon: <List size={12} /> },
    { id: 'engine', label: 'Engine', icon: <Cpu size={12} /> },
    { id: 'summary', label: 'Summary', icon: <PieChart size={12} /> },
  ];

  if (!hasAnalysis) return null;

  return (
    <div className="w-[380px] shrink-0 flex flex-col h-[calc(100vh-112px)]">
      <Card padding="none" className="flex-1 flex flex-col min-h-0 linear-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Analysis</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
              {pgnResult
                ? `depth=${pgnResult.depth ?? DEFAULT_PGN_ANALYSIS_DEPTH} | Stockfish 18`
                : fenResult
                  ? `depth=${fenResult.depth} | Stockfish 18`
                  : 'Stockfish 18'}
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

        {pgnResult && selectedMoveIndex >= 0 && selectedMoveIndex < pgnResult.moves.length && (
          <div className="px-3 pt-2">
            <CoachMessage move={pgnResult.moves[selectedMoveIndex]} />
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
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden px-3 pb-2">
          {activeTab === 'moves' && <MoveList />}
          {activeTab === 'engine' && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <EngineLines />
            </div>
          )}
          {activeTab === 'summary' && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <AnalysisSummary />
            </div>
          )}
        </div>

        {/* Eval graph strip */}
        {pgnResult && (
          <div className="px-3 border-t border-[var(--color-border)]">
            <EvalGraph />
          </div>
        )}
      </Card>
    </div>
  );
}
