import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useUiStore } from "@/store/uiStore";
import { useUploadPdfs } from "@/services/pdfs";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function UploadModal() {
  const { uploadOpen, setUploadOpen } = useUiStore();
  const upload = useUploadPdfs();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!uploadOpen) return null;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files).filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (list.length === 0) {
      toast.error("Only PDFs are accepted");
      return;
    }
    try {
      await upload.mutateAsync(list);
      toast.success(`${list.length} file${list.length === 1 ? "" : "s"} queued`);
      setUploadOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Upload failed";
      toast.error(msg);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setUploadOpen(false)}>
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload PDFs</h2>
          <button onClick={() => setUploadOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="size-5" /></button>
        </div>

        <div
          className={cn(
            "mt-4 border-2 border-dashed rounded-2xl p-8 text-center transition-colors",
            dragging ? "border-brand bg-brand/5" : "border-slate-300 dark:border-slate-700",
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        >
          <Upload className="size-8 mx-auto text-slate-400" />
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Drag PDFs here, or</p>
          <Button className="mt-2" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? "Uploading…" : "Browse files"}
          </Button>
          <input ref={inputRef} type="file" accept="application/pdf" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
          <p className="mt-3 text-xs text-slate-500">Max 20 MB each</p>
        </div>
      </div>
    </div>
  );
}
