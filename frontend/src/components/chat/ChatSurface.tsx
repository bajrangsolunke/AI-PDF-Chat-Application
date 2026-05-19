import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSession, useCreateSession } from "@/services/chat";
import { useChatStream } from "@/hooks/useChatStream";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { Composer } from "./Composer";
import { CitationChip } from "./CitationChip";

interface Props {
  sessionId: string | null;
  selectedPdfIds: string[];
  onSessionCreated: (id: string) => void;
}

export function ChatSurface({ sessionId, selectedPdfIds, onSessionCreated }: Props) {
  const { data: session } = useSession(sessionId);
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

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-slate-200 dark:border-slate-800 px-6 py-3">
        <h2 className="font-semibold truncate">{session?.title ?? "New chat"}</h2>
        <p className="text-xs text-slate-500">
          {sessionId
            ? `${session?.pdf_ids?.length ?? 0} document${(session?.pdf_ids?.length ?? 0) === 1 ? "" : "s"}`
            : selectedPdfIds.length > 0
              ? `${selectedPdfIds.length} document${selectedPdfIds.length === 1 ? "" : "s"} selected`
              : "Select PDFs from the sidebar to start"}
        </p>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto">
          {empty && (
            <div className="text-center mt-10">
              <h3 className="text-xl font-semibold">Ask anything about your documents</h3>
              <p className="text-sm text-slate-500 mt-1">Try one of these to get started:</p>
              <SuggestedQuestions onPick={handleSend} />
            </div>
          )}

          {session?.messages.map((m) => <MessageBubble key={m.id} msg={m} />)}

          {streaming && (
            <>
              <MessageBubble msg={{ id: "u-pending", role: "user", content: streaming.query, citations: null, created_at: "" }} />
              {streaming.text ? (
                <div className="flex w-full mb-4 justify-start">
                  <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap bg-slate-100 dark:bg-slate-800">
                    {streaming.text}
                    {streaming.citations && streaming.citations.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {streaming.citations.map((c, i) => <CitationChip key={i} idx={i + 1} citation={c} />)}
                      </div>
                    )}
                  </div>
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
