import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useSubmitPGN } from '@/hooks/useAnalysis';
import { useAnalysisStore } from '@/store/analysisStore';
import { SAMPLE_PGN } from '@/constants';
import { Upload, Sparkles } from 'lucide-react';
import { analysisService } from '@/services/analysisService';

export function PGNInput() {
  const [pgn, setPgn] = useState('');
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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

      <div className="pt-3 mt-3 border-t border-[var(--color-border-subtle)] space-y-2">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
          Bulk multi-game PGN
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".pgn,.txt,text/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            void (async () => {
              setBulkMsg(null);
              try {
                const r = await analysisService.uploadBulkPgn(f);
                setBulkMsg(`Queued ${r.count} game(s). Analysis jobs run in the background.`);
              } catch (err) {
                setBulkMsg(err instanceof Error ? err.message : 'Bulk upload failed');
              }
            })();
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          Upload .pgn file (multiple games)
        </Button>
        {bulkMsg ? <p className="text-xs text-[var(--color-text-muted)]">{bulkMsg}</p> : null}
      </div>
    </div>
  );
}
