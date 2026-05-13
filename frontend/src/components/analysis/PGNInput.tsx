import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useSubmitPGN } from '@/hooks/useAnalysis';
import { useAnalysisStore } from '@/store/analysisStore';
import { SAMPLE_PGN } from '@/constants';
import { Upload, Sparkles } from 'lucide-react';

export function PGNInput() {
  const [pgn, setPgn] = useState('');
  const submitPGN = useSubmitPGN();
  const { isAnalyzing } = useAnalysisStore();

  const handleSubmit = () => {
    if (!pgn.trim()) return;
    submitPGN.mutate({ pgn: pgn.trim() });
  };

  const handleLoadSample = () => {
    setPgn(SAMPLE_PGN);
  };

  return (
    <div className="space-y-3">
      <Textarea
        label="Paste PGN"
        placeholder={'[Event "..."]\n[White "..."]\n[Black "..."]\n\n1. e4 e5 2. Nf3 Nc6...'}
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
        rows={10}
        className="font-mono text-xs"
      />
      <div className="flex items-center gap-2">
        <Button
          onClick={handleSubmit}
          loading={isAnalyzing}
          disabled={!pgn.trim() || isAnalyzing}
          className="flex-1"
        >
          <Upload size={14} />
          {isAnalyzing ? 'Analyzing...' : 'Analyze Game'}
        </Button>
        <Button variant="outline" size="md" onClick={handleLoadSample}>
          <Sparkles size={14} />
          Sample
        </Button>
      </div>
    </div>
  );
}
