import { FileText, Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDeletePdf, usePdfs } from "@/services/pdfs";
import { cn } from "@/lib/cn";

export function PdfList({
  selectedIds, onToggle,
}: { selectedIds: string[]; onToggle: (id: string) => void }) {
  const { data: pdfs = [], isLoading } = usePdfs();
  const del = useDeletePdf();

  if (isLoading) return <div className="text-xs text-slate-500 px-3">Loading…</div>;
  if (pdfs.length === 0)
    return <div className="text-xs text-slate-500 px-3 py-2">No PDFs yet. Upload one to get started.</div>;

  return (
    <ul className="space-y-1">
      {pdfs.map((p) => {
        const selected = selectedIds.includes(p.id);
        return (
          <li
            key={p.id}
            className={cn(
              "group flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer",
              "hover:bg-slate-100 dark:hover:bg-slate-800",
              selected && "bg-slate-100 dark:bg-slate-800",
            )}
            onClick={() => p.status === "ready" && onToggle(p.id)}
            title={p.status === "ready" ? "Click to toggle" : p.status === "failed" ? p.error ?? "failed" : "Processing"}
          >
            <FileText className="size-4 shrink-0 text-slate-400" />
            <span className="flex-1 truncate">{p.filename}</span>
            {p.status === "processing" && <Loader2 className="size-3.5 animate-spin text-amber-500" />}
            {p.status === "ready" && <CheckCircle2 className={cn("size-3.5", selected ? "text-brand" : "text-emerald-500")} />}
            {p.status === "failed" && <AlertCircle className="size-3.5 text-red-500" />}
            <button
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete ${p.filename}?`)) {
                  del.mutate(p.id, { onSuccess: () => toast.success("Deleted") });
                }
              }}
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
