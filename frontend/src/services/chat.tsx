import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiBaseUrl } from "./api";
import type { ChatSession, ChatSessionDetail } from "@/types/api";
import { useAuthStore } from "@/store/authStore";

export const useSessions = () =>
  useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await api.get<ChatSession[]>("/chat/sessions")).data,
  });

export const useSession = (id: string | null) =>
  useQuery({
    queryKey: ["session", id],
    enabled: !!id,
    queryFn: async () => (await api.get<ChatSessionDetail>(`/chat/sessions/${id}`)).data,
  });

export const useCreateSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pdf_ids: string[]) => (await api.post<ChatSession>("/chat/sessions", { pdf_ids })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
};

export const useUpdateSessionPdfs = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { sessionId: string; pdf_ids: string[] }) =>
      (await api.patch<ChatSession>(`/chat/sessions/${vars.sessionId}`, { pdf_ids: vars.pdf_ids })).data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["session", vars.sessionId] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
};

export async function* streamChat(sessionId: string, query: string): AsyncGenerator<{ event: string; data: unknown }> {
  const token = useAuthStore.getState().token;
  const resp = await fetch(`${apiBaseUrl}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ session_id: sessionId, query }),
  });
  if (!resp.ok || !resp.body) throw new Error(`stream failed: ${resp.status}`);

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    while (true) {
      const sep = buf.indexOf("\n\n");
      if (sep === -1) break;
      const block = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      let event = "message";
      let data = "{}";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data = line.slice(5).trim();
      }
      try { yield { event, data: JSON.parse(data) }; }
      catch { yield { event, data: {} }; }
    }
  }
}
