import { useState } from "react";
import type { Citation } from "@/types/api";
import { cn } from "@/lib/cn";

export function CitationChip({ idx, citation }: { idx: number; citation: Citation }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md text-xs font-medium",
          "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
          "hover:bg-brand hover:text-white transition-colors",
        )}
        title={`${citation.filename} (p.${citation.page})`}
      >
        {idx}
      </button>
      {open && (
        <div className="absolute z-20 left-0 top-7 w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-lg text-xs">
          <div className="font-medium truncate">{citation.filename}</div>
          <div className="text-slate-500">Page {citation.page}</div>
          <p className="mt-1 text-slate-700 dark:text-slate-300 line-clamp-6">{citation.snippet}</p>
        </div>
      )}
    </div>
  );
}
