import { useEffect } from "react";
import { X } from "lucide-react";
import { useUiStore } from "@/store/uiStore";

export function SourcePanel() {
  const { activeCitation, activeCitationIdx, setActiveCitation } = useUiStore();
  const open = !!activeCitation;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveCitation(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setActiveCitation]);

  return (
    <>
      {/* Backdrop — extremely subtle, just dims slightly */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/5"
          onClick={() => setActiveCitation(null)}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 z-40 h-full w-full sm:w-[400px] bg-surface border-l border-rule
                    transform transition-transform duration-300 ease-out
                    ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!open}
      >
        {activeCitation && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-7 pt-7 pb-5 border-b border-rule">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-ink-soft mb-2">
                    Source <span className="text-accent">{activeCitationIdx ?? ""}</span>
                  </p>
                  <h3 className="font-display text-xl text-ink leading-tight">
                    {activeCitation.filename}
                  </h3>
                  <p className="text-xs font-mono uppercase tracking-[0.12em] text-ink-soft mt-2">
                    Page {activeCitation.page}
                  </p>
                </div>
                <button
                  onClick={() => setActiveCitation(null)}
                  className="text-ink-soft hover:text-ink transition-colors"
                  aria-label="Close source panel"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Snippet */}
            <div className="px-7 py-6 flex-1 overflow-y-auto">
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-ink-soft mb-3">
                Excerpt
              </p>
              <blockquote className="font-display italic text-ink text-lg leading-relaxed border-l-2 border-accent pl-5">
                &ldquo;{activeCitation.snippet}&hellip;&rdquo;
              </blockquote>
              <p className="text-xs text-ink-soft mt-6 font-sans leading-relaxed">
                Atlas retrieved this passage to support its answer. The excerpt is verbatim
                from the source document.
              </p>
            </div>

            {/* Footer */}
            <div className="px-7 py-4 border-t border-rule">
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-ink-soft">
                Press ESC to close
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
