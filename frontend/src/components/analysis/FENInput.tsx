import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSubmitFEN } from '@/hooks/useAnalysis';
import { useAnalysisStore } from '@/store/analysisStore';
import { INITIAL_FEN } from '@/constants';
import { Search, RotateCcw } from 'lucide-react';

export function FENInput() {
  const [fen, setFen] = useState('');
  const submitFEN = useSubmitFEN();
  const { isAnalyzing } = useAnalysisStore();

  const handleSubmit = () => {
    if (!fen.trim()) return;
    submitFEN.mutate({ fen: fen.trim(), num_lines: 3 });
  };

  const handleReset = () => {
    setFen(INITIAL_FEN);
  };

  return (
    <div className="space-y-3">
      <Input
        label="FEN Position"
        placeholder="r2qkbnr/1pp2Q1p/p2p1pp1/8/P1B1P3/8/1Pn2PPP/RNB2RK1 b kq - 3 12"
        value={fen}
        onChange={(e) => setFen(e.target.value)}
        className="font-mono text-xs"
      />
      <div className="flex items-center gap-2">
        <Button
          onClick={handleSubmit}
          loading={isAnalyzing}
          disabled={!fen.trim() || isAnalyzing}
          className="flex-1"
        >
          <Search size={14} />
          {isAnalyzing ? 'Analyzing...' : 'Analyze Position'}
        </Button>
        <Button variant="outline" size="md" onClick={handleReset}>
          <RotateCcw size={14} />
          Start
        </Button>
      </div>
    </div>
  );
}
