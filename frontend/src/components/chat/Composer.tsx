import { useState, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props { onSend: (text: string) => void; disabled?: boolean }

export function Composer({ onSend, disabled }: Props) {
  const [text, setText] = useState("");

  function submit() {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 p-4">
      <div className="flex gap-2 items-end max-w-3xl mx-auto">
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask a question about your PDFs…"
          className="flex-1 resize-none rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand max-h-40"
        />
        <Button onClick={submit} disabled={disabled || !text.trim()} className="h-12 w-12 !p-0">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
