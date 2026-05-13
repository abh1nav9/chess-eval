import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { analysisService } from '@/services/analysisService';

export function StatsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['stats', 'dashboard'],
    queryFn: () => analysisService.getStatsDashboard(),
  });

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Cross-game stats</h1>
        {isLoading && <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>}
        {isError && <p className="text-sm text-red-400">Could not load stats.</p>}
        {data && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <Stat label="Analyses" value={String(data.analyses_total ?? 0)} />
              <Stat label="Indexed moves" value={String(data.indexed_moves ?? 0)} />
              <Stat label="Queue depth" value={String(data.processing_queue_depth ?? 0)} />
            </div>
            <section>
              <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-2">
                Classifications (all moves)
              </h2>
              <ul className="space-y-1 text-sm">
                {(data.classification_histogram ?? []).map(
                  (row: { classification: string; count: number }) => (
                    <li key={row.classification} className="flex justify-between border-b border-[var(--color-border-subtle)] py-1">
                      <span>{row.classification}</span>
                      <span className="font-mono">{row.count}</span>
                    </li>
                  ),
                )}
              </ul>
            </section>
            <section>
              <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-2">By phase</h2>
              <ul className="space-y-1 text-sm">
                {(data.phase_centipawn_loss ?? []).map(
                  (row: { phase: string; avg_centipawn_loss: number; count: number }) => (
                    <li key={row.phase} className="flex justify-between gap-4 border-b border-[var(--color-border-subtle)] py-1">
                      <span>{row.phase}</span>
                      <span className="font-mono text-[var(--color-text-muted)]">
                        avg CPL {row.avg_centipawn_loss} · n={row.count}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </section>
            <section>
              <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-2">Top openings</h2>
              <ul className="space-y-1 text-sm">
                {(data.top_openings ?? []).map(
                  (row: { eco: string; name: string; games_approx: number; avg_centipawn_loss: number }) => (
                    <li key={row.eco} className="flex justify-between gap-2 border-b border-[var(--color-border-subtle)] py-1">
                      <span className="truncate">
                        <span className="font-mono text-[var(--color-accent)]">{row.eco}</span> {row.name}
                      </span>
                      <span className="font-mono shrink-0 text-[var(--color-text-muted)]">
                        ~{row.games_approx} · CPL {row.avg_centipawn_loss}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 bg-[var(--color-bg-primary)]">
      <div className="text-[10px] text-[var(--color-text-muted)] uppercase">{label}</div>
      <div className="text-lg font-mono font-semibold">{value}</div>
    </div>
  );
}
