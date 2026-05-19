import { useState } from "react";
import type { Citation } from "@/types/api";
import { cn } from "@/lib/cn";

/** Inline superscript — used when rendering [n] markers in text */
export function CitationInline({
  idx,
  citation,
}: {
  idx: number;
  citation: Citation;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <sup
        className="text-[0.7em] font-mono text-accent hover:underline cursor-pointer"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        title={`${citation.filename}, page ${citation.page}`}
      >
        {idx}
      </sup>
      {open && (
        <span className="absolute z-20 left-0 top-5 w-72 text-ink text-sm bg-surface border border-rule p-3 max-w-sm leading-relaxed not-italic font-sans">
          <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted mb-1 truncate">
            {citation.filename} · p.{citation.page}
          </span>
          <span className="line-clamp-5 text-ink-muted">{citation.snippet}</span>
        </span>
      )}
    </span>
  );
}

/** Footnote block shown below each assistant message */
export function CitationsBlock({ citations }: { citations: Citation[] }) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="h-px w-8 bg-rule mb-2" />
      <ol className="space-y-1">
        {citations.map((c, i) => (
          <CitationFootnote key={i} idx={i + 1} citation={c} />
        ))}
      </ol>
    </div>
  );
}

function CitationFootnote({
  idx,
  citation,
}: {
  idx: number;
  citation: Citation;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className="relative">
      <button
        className={cn(
          "text-xs text-ink-muted font-sans text-left flex items-baseline gap-1 hover:text-ink transition-colors",
        )}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        <sup className="font-mono text-accent">{idx}</sup>
        <span>
          {citation.filename}, page {citation.page}
        </span>
      </button>
      {open && (
        <div className="absolute z-20 left-0 top-6 w-80 text-ink text-sm bg-surface border border-rule p-3 leading-relaxed">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted mb-1 truncate">
            {citation.filename} · p.{citation.page}
          </p>
          <p className="text-ink-muted line-clamp-6">{citation.snippet}</p>
        </div>
      )}
    </li>
  );
}

/** Legacy export for any remaining usages — renders inline chip */
export function CitationChip({
  idx,
  citation,
}: {
  idx: number;
  citation: Citation;
}) {
  return <CitationInline idx={idx} citation={citation} />;
}
