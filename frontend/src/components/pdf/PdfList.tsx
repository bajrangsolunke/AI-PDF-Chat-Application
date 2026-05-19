import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDeletePdf, usePdfs } from "@/services/pdfs";
import { cn } from "@/lib/cn";

export function PdfList({
  selectedIds,
  onToggle,
}: {
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const { data: pdfs = [], isLoading } = usePdfs();
  const del = useDeletePdf();

  if (isLoading)
    return (
      <p className="text-xs font-mono uppercase tracking-[0.12em] text-ink-soft px-2 py-2">
        Loading…
      </p>
    );

  if (pdfs.length === 0)
    return (
      <p className="text-sm text-ink-soft italic px-2 py-2">
        No documents yet. Add one to begin reading.
      </p>
    );

  return (
    <ul className="space-y-0.5">
      {pdfs.map((p) => {
        const selected = selectedIds.includes(p.id);
        const isReady = p.status === "ready";
        const isProcessing = p.status === "processing";
        const isFailed = p.status === "failed";

        return (
          <li key={p.id} className="relative group">
            {/* Left accent strip for selected */}
            {selected && (
              <span className="absolute left-0 top-0 h-full w-0.5 bg-accent rounded-full" />
            )}
            <button
              className={cn(
                "w-full text-left pl-3 pr-2 py-1.5 flex items-center gap-2 transition-colors",
                isFailed && "text-ink-muted opacity-70",
                !isFailed && "text-ink hover:text-ink",
              )}
              onClick={() => isReady && onToggle(p.id)}
              title={
                isReady
                  ? "Click to toggle"
                  : isFailed
                    ? (p.error ?? "Failed to process")
                    : "Processing…"
              }
              disabled={!isReady && !isFailed}
            >
              {/* Status dot */}
              <span
                className={cn(
                  "size-1.5 rounded-full shrink-0",
                  isReady && "bg-good",
                  isProcessing && "bg-warn animate-pulse",
                  isFailed && "bg-bad",
                )}
              />

              {/* Filename */}
              <span className="flex-1 truncate text-sm font-sans">
                {p.filename}
              </span>

              {/* Status label */}
              <span
                className={cn(
                  "text-[10px] font-mono uppercase tracking-[0.12em] shrink-0",
                  isReady && "text-ink-soft",
                  isProcessing && "text-warn",
                  isFailed && "text-bad",
                )}
              >
                {isReady && "READY"}
                {isProcessing && "INDEXING…"}
                {isFailed && "FAILED"}
              </span>

              {/* Delete button (hover-revealed) */}
              <button
                className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-bad transition-colors shrink-0 p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete ${p.filename}?`)) {
                    del.mutate(p.id, {
                      onSuccess: () => toast.success("Deleted"),
                    });
                  }
                }}
                title="Delete"
              >
                <Trash2 className="size-3.5" />
              </button>
            </button>

            {/* Error note on hover for failed */}
            {isFailed && p.error && (
              <p className="hidden group-hover:block pl-6 pb-1 text-[11px] text-bad font-sans">
                {p.error}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
