import { useState, KeyboardEvent } from "react";
import { Paperclip, ArrowUp } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/cn";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function Composer({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const { setUploadOpen } = useUiStore();
  const canSend = text.trim().length > 0 && !disabled;

  function submit() {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-rule px-8 py-6 bg-surface">
      <div className="max-w-3xl mx-auto">
        <div className="border border-rule rounded-md focus-within:border-accent transition-colors">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask Atlas a question about your documents…"
            className="composer-textarea resize-none w-full bg-transparent text-base text-ink placeholder:text-ink-soft px-4 py-3.5 focus:outline-none"
            style={{ fieldSizing: "content" } as React.CSSProperties}
            disabled={disabled}
          />
          <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-1.5 text-ink-soft hover:text-ink transition-colors text-xs font-mono uppercase tracking-[0.12em]"
              aria-label="Attach document"
            >
              <Paperclip className="size-3.5" />
              Attach
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
              className={cn(
                "inline-flex items-center justify-center size-8 rounded-md transition-all",
                canSend
                  ? "bg-accent text-accent-ink hover:bg-accent/90"
                  : "bg-rule text-ink-soft cursor-not-allowed",
              )}
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-ink-soft mt-2.5 text-center">
          ↵ Atlas will reason · Shift+↵ for new line
        </p>
      </div>
    </div>
  );
}
