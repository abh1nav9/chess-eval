import { useCallback, useState } from 'react';
import { Chess } from 'chess.js';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { analysisService } from '@/services/analysisService';
import { useAnalysisStore } from '@/store/analysisStore';
import { useGameStore } from '@/store/gameStore';

export function FenSetupPanel() {
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setFENResult = useAnalysisStore((s) => s.setFENResult);

  const analyze = useCallback(async () => {
    setErr(null);
    const c = new Chess();
    try {
      c.load(fen.trim());
    } catch {
      setErr('Invalid FEN — check field count and piece placement.');
      return;
    }
    const canonical = c.fen();
    setLoading(true);
    try {
      const data = await analysisService.analyzeFEN({ fen: canonical, num_lines: 3 });
      useGameStore.getState().loadFen(canonical);
      setFENResult(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [fen, setFENResult]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--color-text-muted)]">
        Paste a valid FEN (analysis.md §4.17). The board loads the position; engine lines appear in the sidebar.
      </p>
      <Input
        label="FEN string"
        value={fen}
        onChange={(e) => setFen(e.target.value)}
        error={err ?? undefined}
      />
      <Button type="button" onClick={analyze} loading={loading} disabled={!fen.trim()}>
        Analyze position
      </Button>
    </div>
  );
}
