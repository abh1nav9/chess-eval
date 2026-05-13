import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { analysisService } from '@/services/analysisService';
import { Button } from '@/components/ui/Button';

export function RepertoirePage() {
  const [color, setColor] = useState<'white' | 'black'>('white');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['repertoire', color],
    queryFn: () => analysisService.getRepertoireSummary(color),
  });

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Opening repertoire</h1>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={color === 'white' ? 'primary' : 'outline'} onClick={() => setColor('white')}>
            As White
          </Button>
          <Button type="button" size="sm" variant={color === 'black' ? 'primary' : 'outline'} onClick={() => setColor('black')}>
            As Black
          </Button>
        </div>
        {isLoading && <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>}
        {isError && <p className="text-sm text-red-400">Could not load repertoire.</p>}
        {data && (
          <ul className="space-y-1 text-sm">
            {(data.openings ?? []).map(
              (row: {
                eco: string;
                opening_name: string;
                play_count: number;
                avg_centipawn_loss: number;
              }) => (
                <li
                  key={row.eco}
                  className="flex justify-between gap-2 border-b border-[var(--color-border-subtle)] py-2"
                >
                  <span className="truncate">
                    <span className="font-mono text-[var(--color-accent)]">{row.eco}</span> {row.opening_name}
                  </span>
                  <span className="font-mono shrink-0 text-[var(--color-text-muted)]">
                    {row.play_count} games · CPL {row.avg_centipawn_loss}
                  </span>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
