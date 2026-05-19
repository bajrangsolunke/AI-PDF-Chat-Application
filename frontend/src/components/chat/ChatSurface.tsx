import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSession, useCreateSession } from "@/services/chat";
import { usePdfs } from "@/services/pdfs";
import { useChatStream } from "@/hooks/useChatStream";
import { MessageBubble, MessageSeparator } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { Composer } from "./Composer";
import { CitationsBlock } from "./CitationChip";

interface Props {
  sessionId: string | null;
  selectedPdfIds: string[];
  onSessionCreated: (id: string) => void;
}

export function ChatSurface({ sessionId, selectedPdfIds, onSessionCreated }: Props) {
  const { data: session } = useSession(sessionId);
  const { data: allPdfs = [] } = usePdfs();
  const createSession = useCreateSession();
  const { send, streaming, busy } = useChatStream();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [session?.messages.length, streaming?.text]);

  async function handleSend(text: string) {
    try {
      let id = sessionId;
      if (!id) {
        if (selectedPdfIds.length === 0) {
          toast.error("Select at least one PDF first");
          return;
        }
        const s = await createSession.mutateAsync(selectedPdfIds);
        id = s.id;
        onSessionCreated(id);
      }
      await send(id, text);
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Chat failed");
    }
  }

  const empty = !sessionId || (session && session.messages.length === 0);

  // Build a reading context label from session pdf_ids
  const readingPdfs = session?.pdf_ids
    ? allPdfs.filter((p) => session.pdf_ids.includes(p.id))
    : [];
  const readingLabel =
    readingPdfs.length > 0
      ? readingPdfs.map((p) => p.filename).join(", ")
      : selectedPdfIds.length > 0
        ? `${selectedPdfIds.length} document${selectedPdfIds.length === 1 ? "" : "s"} selected`
        : null;

  return (
    <div className="flex flex-col h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-rule px-8 py-4 bg-surface">
        <h2
          className="font-display text-xl text-ink leading-tight truncate"
          style={{ fontFeatureSettings: "'opsz' 144" }}
        >
          {session?.title ?? "New chat"}
        </h2>
        {readingLabel && (
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-ink-soft mt-0.5">
            READING · {readingLabel}
          </p>
        )}
      </header>

      {/* Message area */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-3xl">
          {empty && (
            <div className="pt-4">
              <h3
                className="font-display text-3xl text-ink leading-tight"
                style={{ fontFeatureSettings: "'opsz' 144" }}
              >
                Read first, then ask.
              </h3>
              <p className="mt-3 text-base text-ink-muted leading-relaxed max-w-xl">
                Atlas reads the documents you upload and cites every claim. Pick
                a document from the library, then ask your first question.
              </p>
              <SuggestedQuestions onPick={handleSend} />
            </div>
          )}

          {session?.messages.map((m, i) => (
            <div key={m.id}>
              {i > 0 && <MessageSeparator />}
              <MessageBubble msg={m} />
            </div>
          ))}

          {streaming && (
            <>
              {(session?.messages.length ?? 0) > 0 && <MessageSeparator />}
              <MessageBubble
                msg={{
                  id: "u-pending",
                  role: "user",
                  content: streaming.query,
                  citations: null,
                  created_at: "",
                }}
              />
              <MessageSeparator />
              {streaming.text ? (
                <div className="max-w-[65ch] text-ink font-sans text-base leading-relaxed whitespace-pre-wrap">
                  {streaming.text.split(/(\s+)/).map((chunk, i) => (
                    <span key={i} className="ink-fade">
                      {chunk}
                    </span>
                  ))}
                  {streaming.citations && streaming.citations.length > 0 && (
                    <CitationsBlock citations={streaming.citations} />
                  )}
                </div>
              ) : (
                <TypingIndicator />
              )}
            </>
          )}
        </div>
      </div>

      <Composer onSend={handleSend} disabled={busy} />
    </div>
  );
}
