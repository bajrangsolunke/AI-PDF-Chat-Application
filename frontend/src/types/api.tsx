export interface User { id: string; email: string; created_at: string }

export interface AuthResponse { access_token: string; token_type: string; user: User }

export interface Pdf {
  id: string;
  filename: string;
  size_bytes: number;
  status: "processing" | "ready" | "failed";
  error: string | null;
  page_count: number | null;
  chunk_count: number | null;
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  pdf_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface Citation { pdf_id: string; filename: string; page: number; snippet: string }

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[] | null;
  created_at: string;
}

export interface ChatSessionDetail extends ChatSession { messages: ChatMessage[] }
