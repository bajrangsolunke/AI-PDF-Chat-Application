import { useRef, useState } from "react";
import { Upload, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useUiStore } from "@/store/uiStore";
import { useUploadPdfs } from "@/services/pdfs";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function UploadDrawer() {
  const { uploadOpen, setUploadOpen } = useUiStore();
  const upload = useUploadPdfs();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files).filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf"),
    );
    if (list.length === 0) {
      toast.error("Only PDFs are accepted");
      return;
    }
    try {
      await upload.mutateAsync(list);
      toast.success(`${list.length} file${list.length === 1 ? "" : "s"} queued`);
      setUploadOpen(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Upload failed";
      toast.error(msg);
    }
  }

  return (
    <>
      {/* Backdrop */}
      {uploadOpen && (
        <div
          className="fixed inset-0 z-40 bg-bg/40 transition-opacity"
          onClick={() => setUploadOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-[420px] bg-surface border-l border-rule z-50",
          "transition-transform duration-300 ease-out",
          uploadOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-rule flex items-start justify-between">
          <div>
            <h2
              className="font-display text-2xl text-ink leading-tight"
              style={{ fontFeatureSettings: "'opsz' 144" }}
            >
              Add documents
            </h2>
            <p className="mt-1 text-xs font-mono uppercase tracking-[0.12em] text-ink-soft">
              PDF only · up to 20 MB per file
            </p>
          </div>
          <button
            onClick={() => setUploadOpen(false)}
            className="text-ink-soft hover:text-ink transition-colors p-1 mt-0.5"
            title="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-8 flex flex-col gap-6">
          {/* Drop zone */}
          <div
            className={cn(
              "h-[200px] border border-dashed rounded-[4px] flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer",
              dragging
                ? "border-accent bg-accent-soft"
                : "border-rule-strong bg-bg",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-6 text-ink-soft" />
            <p className="text-sm text-ink-muted text-center max-w-[200px] leading-relaxed">
              Drop your PDF, or browse — Atlas accepts up to 20 MB per file.
            </p>
            <Button
              variant="primary"
              className="gap-2"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              disabled={upload.isPending}
            >
              {upload.isPending ? "Uploading…" : "Browse files"}
              {!upload.isPending && <ArrowRight className="size-4" />}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* Footer caption */}
          <p className="text-xs text-ink-soft italic">
            Atlas will read each document carefully. This takes a moment.
          </p>
        </div>
      </div>
    </>
  );
}
