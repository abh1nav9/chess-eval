import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { studyService } from '@/services/studyService';
import { Button } from '@/components/ui/Button';

export function StudiesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['studies'],
    queryFn: () => studyService.list(),
  });

  const create = useMutation({
    mutationFn: () => studyService.create(),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['studies'] });
      navigate(`/studies/${d.study_id}`);
    },
  });

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Studies</h1>
          <Button type="button" size="sm" onClick={() => create.mutate()} loading={create.isPending}>
            New study
          </Button>
        </div>
        {isLoading && <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>}
        {isError && <p className="text-sm text-red-400">Could not load studies.</p>}
        <ul className="space-y-2">
          {(data?.items ?? []).map((s) => (
            <li key={s.study_id}>
              <Link
                to={`/studies/${s.study_id}`}
                className="block rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 hover:border-[var(--color-text-muted)]"
              >
                <span className="text-sm font-medium">{s.title || 'Untitled'}</span>
                <div className="text-[10px] font-mono text-[var(--color-text-muted)]">{s.study_id.slice(0, 10)}…</div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
