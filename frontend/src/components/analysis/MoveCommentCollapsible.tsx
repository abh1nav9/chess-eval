import { useState } from 'react';

const PREVIEW_CHARS = 120;

type MoveCommentCollapsibleProps = {
  text: string;
};

/** Long PGN comments: preview + expand (analysis.md §4.7). */
export function MoveCommentCollapsible({ text }: MoveCommentCollapsibleProps) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();
  if (!trimmed) return null;

  const needsCollapse = trimmed.length > PREVIEW_CHARS;
  const shown = expanded || !needsCollapse ? trimmed : `${trimmed.slice(0, PREVIEW_CHARS).trimEnd()}…`;

  return (
    <span className="w-full basis-full text-[9px] text-[var(--color-text-muted)] italic leading-snug pl-0.5 block">
      <span className="whitespace-pre-wrap break-words">{shown}</span>
      {needsCollapse ? (
        <button
          type="button"
          className="ml-1 text-[var(--color-accent)] not-italic font-medium hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </span>
  );
}
