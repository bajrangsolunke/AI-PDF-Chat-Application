import type { ChatMessage } from "@/types/api";
import { cn } from "@/lib/cn";
import { CitationsBlock, CitationInline } from "./CitationChip";
import type { Citation } from "@/types/api";

/**
 * Convert [n] markers in text to inline citation superscripts.
 * Falls back to plain text if citations array is empty/null.
 */
function renderWithCitations(
  text: string,
  citations: Citation[] | null,
): React.ReactNode {
  if (!citations || citations.length === 0) return text;

  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const idx = parseInt(match[1], 10);
      const citation = citations[idx - 1];
      if (citation) {
        return <CitationInline key={i} idx={idx} citation={citation} />;
      }
    }
    return part;
  });
}

export function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";

  return (
    <div
      className={cn(
        "flex w-full mb-2",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "whitespace-pre-wrap",
          isUser
            ? "max-w-[60ch] text-ink-muted italic font-display text-base leading-relaxed"
            : "max-w-[65ch] text-ink font-sans text-base leading-relaxed",
        )}
        style={isUser ? { fontFeatureSettings: "'opsz' 144" } : undefined}
      >
        {isUser ? (
          <span>{msg.content}</span>
        ) : (
          <>
            <span>{renderWithCitations(msg.content, msg.citations)}</span>
            {msg.citations && msg.citations.length > 0 && (
              <CitationsBlock citations={msg.citations} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Separator between messages */
export function MessageSeparator() {
  return <div className="h-px w-8 bg-rule my-6" />;
}
