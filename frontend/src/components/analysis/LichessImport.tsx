import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { lichessService } from '@/services/lichessService';
import { useSubmitPGN } from '@/hooks/useAnalysis';
import { useAnalysisStore } from '@/store/analysisStore';
import type { ChessComGameBrief } from '@/types/chesscom';
import { formatChessComPlayerLabel } from '@/utils/formatChessComPlayer';
import { User, Loader2, ExternalLink } from 'lucide-react';

const USERNAME_RE = /^[a-zA-Z0-9_-]{1,40}$/;

export function LichessImport() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [games, setGames] = useState<ChessComGameBrief[]>([]);
  const [analyzeTargetUuid, setAnalyzeTargetUuid] = useState<string | null>(null);
  const submitPGN = useSubmitPGN();
  const { isAnalyzing } = useAnalysisStore();

  const loadGames = useMutation({
    mutationFn: (user: string) => lichessService.getRecentGames(user, 15),
    onSuccess: (data) => setGames(data.games),
  });

  const handleLoad = useCallback(() => {
    const u = username.trim();
    if (!USERNAME_RE.test(u)) return;
    loadGames.mutate(u);
  }, [username, loadGames]);

  const analyzeSpinnerUuid = isAnalyzing ? analyzeTargetUuid : null;

  const handleAnalyze = useCallback(
    (g: ChessComGameBrief) => {
      const pgn = g.pgn.trim();
      if (!pgn || isAnalyzing) return;
      setAnalyzeTargetUuid(g.uuid);
      submitPGN.mutate(
        { pgn },
        {
          onError: () => setAnalyzeTargetUuid(null),
        },
      );
    },
    [submitPGN, isAnalyzing],
  );

  const invalid = username.trim().length > 0 && !USERNAME_RE.test(username.trim());

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--color-text-muted)]">
        Recent games via Lichess API (proxied). Usernames are case-sensitive on Lichess; try exact spelling.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <Input
            label="Lichess username"
            placeholder="e.g. DrNykterstein"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
            error={invalid ? 'Use 1–40 letters, digits, underscore, or hyphen.' : undefined}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="sm:mb-0.5 shrink-0"
          onClick={handleLoad}
          disabled={!username.trim() || invalid || loadGames.isPending}
          loading={loadGames.isPending}
        >
          <User size={14} />
          Load games
        </Button>
      </div>
      {loadGames.isError && (
        <p className="text-xs text-red-400">Could not load games (rate limit or network).</p>
      )}
      {games.length > 0 && (
        <div className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden max-h-64 overflow-y-auto divide-y divide-[var(--color-border-subtle)]">
          {games.map((g) => (
            <div key={g.uuid} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between bg-[var(--color-bg-primary)]">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {formatChessComPlayerLabel({
                    username: g.white_username,
                    rating: g.white_rating,
                    title: g.white_title,
                    displayName: g.white_display_name,
                  })}{' '}
                  <span className="text-[var(--color-text-muted)] font-normal">vs</span>{' '}
                  {formatChessComPlayerLabel({
                    username: g.black_username,
                    rating: g.black_rating,
                    title: g.black_title,
                    displayName: g.black_display_name,
                  })}
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{g.time_class}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {g.already_analysed && g.analysis_id ? (
                  <span className="text-[10px] font-mono text-[var(--color-eval-positive)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">
                    Saved
                  </span>
                ) : null}
                <a
                  href={g.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                  title="Open on Lichess"
                >
                  <ExternalLink size={16} aria-hidden />
                </a>
                <Button
                  size="sm"
                  variant={g.already_analysed && g.analysis_id ? 'outline' : 'primary'}
                  onClick={() =>
                    g.already_analysed && g.analysis_id
                      ? navigate(`/analysis/${g.analysis_id}`)
                      : handleAnalyze(g)
                  }
                  disabled={isAnalyzing || submitPGN.isPending}
                  loading={analyzeSpinnerUuid === g.uuid && (submitPGN.isPending || isAnalyzing)}
                >
                  {g.already_analysed && g.analysis_id ? 'View' : 'Analyze'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {loadGames.isPending && games.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-8 text-[var(--color-text-muted)] text-sm">
          <Loader2 className="animate-spin" size={18} aria-hidden />
          Fetching from Lichess…
        </div>
      )}
    </div>
  );
}
