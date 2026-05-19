import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { ArrowRight } from "lucide-react";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function Composer({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  // Auto-grow fallback for browsers that don't support field-sizing
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [text]);

  return (
    <div className="border-t border-rule px-6 py-5">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask a question about your documents…"
            className="composer-textarea flex-1 bg-transparent border-b border-transparent focus:border-accent focus:outline-none text-ink placeholder:text-ink-soft text-base py-1 transition-colors"
            disabled={disabled}
          />
          {text.trim() && (
            <button
              onClick={submit}
              disabled={disabled || !text.trim()}
              className="text-ink-soft hover:text-accent transition-colors disabled:opacity-50 pb-1"
              title="Send (Enter)"
            >
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.12em] text-ink-soft">
          ↵ Atlas will reason — Shift+↵ for new line
        </p>
      </div>
    </div>
  );
}
