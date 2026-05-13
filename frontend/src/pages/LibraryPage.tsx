import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { analysisService } from '@/services/analysisService';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';

interface AnalysisListRow {
  analysis_id?: string;
  status?: string;
  metadata?: { white?: string; black?: string; opening?: string; eco?: string };
  summary?: { white_accuracy?: number; black_accuracy?: number };
}

export function LibraryPage() {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['analyses', 'library'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => analysisService.listAnalyses(20, 0, pageParam),
    getNextPageParam: (last) => (last?.next_cursor as string | undefined) ?? undefined,
  });

  const items = (data?.pages ?? []).flatMap((p) => (p?.items ?? []) as AnalysisListRow[]);

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Analysis library</h1>
        {isLoading && <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>}
        {isError && <p className="text-sm text-red-400">Could not load analyses.</p>}
        {!isLoading && items.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">No saved analyses yet.</p>
        )}
        <ul className="space-y-2">
          {items.map((row) => {
            const id = row.analysis_id;
            if (!id) return null;
            const w = row.metadata?.white ?? 'White';
            const b = row.metadata?.black ?? 'Black';
            const op = row.metadata?.opening || row.metadata?.eco;
            const accW = row.summary?.white_accuracy;
            const accB = row.summary?.black_accuracy;
            return (
              <li key={id}>
                <Link
                  to={`/analysis/${id}`}
                  className="block rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2.5 hover:border-[var(--color-text-muted)] transition-colors"
                >
                  <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {w} vs {b}
                  </div>
                  {op ? (
                    <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">{op}</div>
                  ) : null}
                  {accW != null && accB != null ? (
                    <div className="text-[10px] font-mono text-[var(--color-text-secondary)] mt-0.5">
                      Acc {accW.toFixed(1)}% / {accB.toFixed(1)}%
                    </div>
                  ) : null}
                  <div className="text-[10px] text-[var(--color-text-muted)] font-mono mt-0.5">
                    {row.status} · {id.slice(0, 8)}…
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        {hasNextPage && (
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            loading={isFetchingNextPage}
          >
            Load more
          </Button>
        )}
        <p className="text-xs text-[var(--color-text-muted)] mt-6">
          <Link to="/" className="text-[var(--color-accent)] hover:underline">
            Back to analysis
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
