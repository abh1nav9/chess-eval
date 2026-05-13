import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { chessComService } from '@/services/chessComService';
import { useSubmitPGN } from '@/hooks/useAnalysis';
import { useAnalysisStore } from '@/store/analysisStore';
import type { ChessComGameBrief, ChessComPlayerBrief } from '@/types/chesscom';
import { formatChessComPlayerLabel } from '@/utils/formatChessComPlayer';
import { buildChessComBoardPlayerOverlay } from '@/utils/chessComBoardOverlay';
import { User, Loader2, ExternalLink } from 'lucide-react';

const USERNAME_RE = /^[a-zA-Z0-9_-]{1,32}$/;

function formatGameEndDate(endTimeUnix: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(endTimeUnix * 1000));
  } catch {
    return '';
  }
}

function extractApiErrorMessage(err: unknown): string {
  const ax = err as { response?: { data?: { detail?: unknown } } };
  const d = ax.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg);
  if (err instanceof Error) return err.message;
  return 'Could not load games';
}

const GAME_LIMIT_MIN = 1;
const GAME_LIMIT_MAX = 31;
const GAME_LIMIT_DEFAULT = 10;

export function ChessComImport() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [gameLimit, setGameLimit] = useState(GAME_LIMIT_DEFAULT);
  const [archiveYear, setArchiveYear] = useState(() => new Date().getFullYear());
  const [archiveMonth, setArchiveMonth] = useState(() => new Date().getMonth() + 1);
  const [archiveTc, setArchiveTc] = useState('');
  const [games, setGames] = useState<ChessComGameBrief[]>([]);
  const [playerProfiles, setPlayerProfiles] = useState<Record<string, ChessComPlayerBrief>>({});
  const [analyzeTargetUuid, setAnalyzeTargetUuid] = useState<string | null>(null);
  const submitPGN = useSubmitPGN();
  const { isAnalyzing } = useAnalysisStore();

  const [recentTc, setRecentTc] = useState('');

  const loadGames = useMutation({
    mutationFn: ({ user, limit, tc }: { user: string; limit: number; tc?: string }) =>
      chessComService.getRecentGames(user, limit, tc || undefined),
    onSuccess: (data) => {
      setGames(data.games);
      setPlayerProfiles(data.player_profiles ?? {});
    },
  });

  const loadArchive = useMutation({
    mutationFn: ({
      user,
      year,
      month,
      tc,
    }: {
      user: string;
      year: number;
      month: number;
      tc?: string;
    }) => chessComService.getGamesForMonth(user, year, month, tc || undefined),
    onSuccess: (data) => {
      setGames(data.games);
      setPlayerProfiles(data.player_profiles ?? {});
    },
  });

  const handleLoadArchive = useCallback(() => {
    const u = username.trim().toLowerCase();
    if (!USERNAME_RE.test(u)) return;
    loadArchive.mutate({
      user: u,
      year: archiveYear,
      month: archiveMonth,
      tc: archiveTc || undefined,
    });
  }, [username, archiveYear, archiveMonth, archiveTc, loadArchive]);

  const handleLoad = useCallback(() => {
    const u = username.trim().toLowerCase();
    if (!USERNAME_RE.test(u)) return;
    loadGames.mutate({ user: u, limit: gameLimit, tc: recentTc || undefined });
  }, [username, gameLimit, recentTc, loadGames]);

  const analyzeSpinnerUuid = isAnalyzing ? analyzeTargetUuid : null;

  const handleAnalyze = useCallback(
    (g: ChessComGameBrief) => {
      const pgn = g.pgn.trim();
      if (!pgn || isAnalyzing) return;
      setAnalyzeTargetUuid(g.uuid);
      const chessComPlayerOverlay = buildChessComBoardPlayerOverlay(g, playerProfiles);
      submitPGN.mutate(
        { pgn, chessComPlayerOverlay },
        {
          onError: () => setAnalyzeTargetUuid(null),
        },
      );
    },
    [submitPGN, isAnalyzing, playerProfiles],
  );

  const usernameInvalid = username.trim().length > 0 && !USERNAME_RE.test(username.trim().toLowerCase());
  const loadError =
    loadGames.isError || loadArchive.isError
      ? extractApiErrorMessage(loadGames.isError ? loadGames.error : loadArchive.error)
      : null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
        Loads recent standard games from a public Chess.com profile via the official Published Data API
        (proxied through this app&apos;s server). Only usernames that exist on Chess.com are supported.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="chesscom-game-limit" className="text-sm font-medium text-[var(--color-text-secondary)]">
            Games to load
          </label>
          <span className="text-sm font-mono tabular-nums text-[var(--color-text-primary)] min-w-[2ch] text-right">
            {gameLimit}
          </span>
        </div>
        <input
          id="chesscom-game-limit"
          type="range"
          min={GAME_LIMIT_MIN}
          max={GAME_LIMIT_MAX}
          step={1}
          value={gameLimit}
          onChange={(e) => setGameLimit(Number(e.target.value))}
          disabled={loadGames.isPending}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--color-bg-hover)] accent-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
          aria-valuemin={GAME_LIMIT_MIN}
          aria-valuemax={GAME_LIMIT_MAX}
          aria-valuenow={gameLimit}
          aria-label="Number of games to fetch from Chess.com"
        />
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <label htmlFor="chesscom-recent-tc" className="text-[10px] text-[var(--color-text-muted)] shrink-0">
            Recent time class
          </label>
          <select
            id="chesscom-recent-tc"
            className="text-xs rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 flex-1 min-w-[120px]"
            value={recentTc}
            onChange={(e) => setRecentTc(e.target.value)}
            disabled={loadGames.isPending}
          >
            <option value="">All</option>
            <option value="bullet">Bullet</option>
            <option value="blitz">Blitz</option>
            <option value="rapid">Rapid</option>
            <option value="daily">Daily</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <Input
            label="Chess.com username"
            placeholder="e.g. abhinavgautam9"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
            error={usernameInvalid ? 'Use 1–32 letters, numbers, underscore, or hyphen only.' : undefined}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="sm:mb-0.5 shrink-0"
          onClick={handleLoad}
          disabled={!username.trim() || usernameInvalid || loadGames.isPending}
          loading={loadGames.isPending}
        >
          <User size={14} />
          Load games
        </Button>
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] p-3 space-y-2">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
          Archive month (analysis.md §5.1–5.2)
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-20">
            <label className="text-[10px] text-[var(--color-text-muted)] block mb-0.5">Year</label>
            <input
              type="number"
              className="w-full text-xs rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1"
              value={archiveYear}
              min={1998}
              max={2100}
              onChange={(e) => setArchiveYear(Number(e.target.value))}
            />
          </div>
          <div className="w-16">
            <label className="text-[10px] text-[var(--color-text-muted)] block mb-0.5">Month</label>
            <input
              type="number"
              className="w-full text-xs rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1"
              value={archiveMonth}
              min={1}
              max={12}
              onChange={(e) => setArchiveMonth(Number(e.target.value))}
            />
          </div>
          <div className="min-w-[100px]">
            <label className="text-[10px] text-[var(--color-text-muted)] block mb-0.5">Time class</label>
            <select
              className="w-full text-xs rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1"
              value={archiveTc}
              onChange={(e) => setArchiveTc(e.target.value)}
            >
              <option value="">All</option>
              <option value="bullet">Bullet</option>
              <option value="blitz">Blitz</option>
              <option value="rapid">Rapid</option>
              <option value="daily">Daily</option>
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={handleLoadArchive}
            disabled={!username.trim() || usernameInvalid || loadArchive.isPending}
            loading={loadArchive.isPending}
          >
            Load month
          </Button>
        </div>
      </div>

      {loadError && (
        <p className="text-xs text-red-400" role="alert">
          {loadError}
        </p>
      )}

      {loadGames.isSuccess && games.length === 0 && !loadError && (
        <p className="text-xs text-[var(--color-text-muted)]">No rated / standard games found in recent archives.</p>
      )}

      {games.length > 0 && (
        <div className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
          <div className="max-h-64 overflow-y-auto divide-y divide-[var(--color-border-subtle)]">
            {games.map((g) => (
              <div
                key={g.uuid}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between bg-[var(--color-bg-primary)]"
              >
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm font-medium text-[var(--color-text-primary)] truncate"
                    title={`${g.white_username} vs ${g.black_username}`}
                  >
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
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">
                    <span>{g.time_class}</span>
                    {g.rated && <span>Rated</span>}
                    <span className="normal-case tracking-normal">{formatGameEndDate(g.end_time)}</span>
                  </div>
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
                    title="Open on Chess.com"
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
        </div>
      )}

      {(loadGames.isPending || loadArchive.isPending) && games.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-8 text-[var(--color-text-muted)] text-sm">
          <Loader2 className="animate-spin" size={18} aria-hidden />
          Fetching games from Chess.com…
        </div>
      )}
    </div>
  );
}
