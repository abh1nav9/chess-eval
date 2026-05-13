import { useUIStore } from '@/store/uiStore';
import { useAnalysisStore } from '@/store/analysisStore';
import { useGameStore } from '@/store/gameStore';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MoveList } from '@/components/analysis/MoveList';
import { EngineLines } from '@/components/analysis/EngineLines';
import { AnalysisSummary } from '@/components/analysis/AnalysisSummary';
import { List, Cpu, PieChart, RefreshCw } from 'lucide-react';

export function AnalysisSidebar() {
  const { activeTab, setActiveTab } = useUIStore();
  const { pgnResult, fenResult, reset: resetAnalysis } = useAnalysisStore();
  const { reset: resetGame } = useGameStore();

  const hasAnalysis = pgnResult || fenResult;

  const handleNewAnalysis = () => {
    resetAnalysis();
    resetGame();
  };

  const tabs = [
    { id: 'moves', label: 'Moves', icon: <List size={12} /> },
    { id: 'engine', label: 'Engine', icon: <Cpu size={12} /> },
    { id: 'summary', label: 'Summary', icon: <PieChart size={12} /> },
  ];

  if (!hasAnalysis) return null;

  return (
    <div className="w-[340px] shrink-0 flex flex-col gap-3 h-full overflow-y-auto">
      {/* New Analysis Button */}
      <Button
        variant="secondary"
        onClick={handleNewAnalysis}
        className="w-full justify-center gap-2 border-[var(--color-border-subtle)]"
      >
        <RefreshCw size={14} />
        New Analysis
      </Button>

      {/* Analysis Results */}
      <Card padding="md" className="flex-1 flex flex-col min-h-0 linear-card">
        <div className="mb-3">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as any)}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === 'moves' && <MoveList />}
          {activeTab === 'engine' && <EngineLines />}
          {activeTab === 'summary' && <AnalysisSummary />}
        </div>
      </Card>
    </div>
  );
}
