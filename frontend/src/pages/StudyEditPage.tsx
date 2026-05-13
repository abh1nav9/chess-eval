import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { studyService, type StudyDoc } from '@/services/studyService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function StudyEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['study', id],
    queryFn: () => studyService.get(id!),
    enabled: !!id,
  });

  if (!id) return null;

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Link to="/studies" className="text-xs text-[var(--color-accent)] hover:underline">
          All studies
        </Link>
        {isLoading && <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>}
        {isError && <p className="text-sm text-red-400">Study not found.</p>}
        {data && <StudyEditForm key={id} studyId={id} study={data} />}
      </div>
    </PageShell>
  );
}

interface StudyEditFormProps {
  studyId: string;
  study: StudyDoc;
}

function StudyEditForm({ studyId, study }: StudyEditFormProps) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(study.title);
  const [chapters, setChapters] = useState<StudyDoc['chapters']>(study.chapters ?? []);

  const save = useMutation({
    mutationFn: () => studyService.patch(studyId, { title, chapters }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study', studyId] }),
  });

  const addChapter = () => {
    setChapters((c) => [
      ...c,
      {
        chapter_id: `ch_${Math.random().toString(36).slice(2, 10)}`,
        title: `Chapter ${c.length + 1}`,
        start_fen: '',
        mainline_pgn: '',
        notes_by_ply: {},
      },
    ]);
  };

  return (
    <>
      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Chapters</span>
          <Button type="button" size="sm" variant="outline" onClick={addChapter}>
            Add chapter
          </Button>
        </div>
        {chapters.map((ch, i) => (
          <div key={ch.chapter_id} className="border border-[var(--color-border)] rounded p-3 space-y-2">
            <Input
              label={`Chapter ${i + 1} title`}
              value={ch.title}
              onChange={(e) => {
                const v = e.target.value;
                setChapters((prev) => prev.map((x, j) => (j === i ? { ...x, title: v } : x)));
              }}
            />
            <Input
              label="Start FEN (optional)"
              value={ch.start_fen}
              onChange={(e) => {
                const v = e.target.value;
                setChapters((prev) => prev.map((x, j) => (j === i ? { ...x, start_fen: v } : x)));
              }}
            />
            <label className="text-[10px] text-[var(--color-text-muted)]">Mainline PGN fragment</label>
            <textarea
              className="w-full text-xs font-mono rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2 min-h-[80px]"
              value={ch.mainline_pgn}
              onChange={(e) => {
                const v = e.target.value;
                setChapters((prev) => prev.map((x, j) => (j === i ? { ...x, mainline_pgn: v } : x)));
              }}
            />
          </div>
        ))}
      </div>
      <Button type="button" onClick={() => save.mutate()} loading={save.isPending}>
        Save
      </Button>
    </>
  );
}
