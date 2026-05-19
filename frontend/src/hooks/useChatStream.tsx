import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { streamChat } from "@/services/chat";
import type { Citation } from "@/types/api";

interface Streaming {
  sessionId: string;
  query: string;
  text: string;
  citations: Citation[] | null;
}

export function useChatStream() {
  const qc = useQueryClient();
  const [streaming, setStreaming] = useState<Streaming | null>(null);
  const [busy, setBusy] = useState(false);

  const send = useCallback(async (sessionId: string, query: string) => {
    setBusy(true);
    setStreaming({ sessionId, query, text: "", citations: null });
    try {
      for await (const ev of streamChat(sessionId, query)) {
        const evData = ev.data as Record<string, unknown>;
        if (ev.event === "token") setStreaming((s) => s && ({ ...s, text: s.text + ((evData.text as string) ?? "") }));
        else if (ev.event === "citations") setStreaming((s) => s && ({ ...s, citations: (evData.citations as Citation[]) ?? [] }));
        else if (ev.event === "error") throw new Error((evData.detail as string) ?? "stream error");
      }
    } finally {
      qc.invalidateQueries({ queryKey: ["session", sessionId] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
      setBusy(false);
      setStreaming(null);
    }
  }, [qc]);

  return { send, streaming, busy };
}
