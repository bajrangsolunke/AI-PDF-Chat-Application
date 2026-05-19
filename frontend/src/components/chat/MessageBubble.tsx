import type { ChatMessage } from "@/types/api";
import { cn } from "@/lib/cn";
import { CitationChip } from "./CitationChip";

export function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex w-full mb-4", isUser ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
        isUser ? "bg-brand text-brand-fg" : "bg-slate-100 dark:bg-slate-800",
      )}>
        {msg.content}
        {!isUser && msg.citations && msg.citations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {msg.citations.map((c, i) => <CitationChip key={i} idx={i + 1} citation={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}
