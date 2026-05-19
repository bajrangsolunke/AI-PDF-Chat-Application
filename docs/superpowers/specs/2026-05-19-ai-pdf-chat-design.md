# AI PDF Chat Application — MVP Design Spec

**Date:** 2026-05-19
**Author:** Bajrang Solunke
**Status:** Approved for implementation
**Goal profile:** Portfolio / GitHub showcase

---

## 1. Purpose

A full-stack, RAG-powered chat application where authenticated users upload PDFs and ask
questions answered by an LLM, with streamed tokens and source citations. Built as a
vertical-slice MVP whose primary purpose is to look credible and demoable on a GitHub
portfolio, while staying close enough to production patterns to talk through in
Gen-AI engineering interviews.

## 2. Scope

### In scope (MVP)

| Area | What ships |
|---|---|
| Auth | Email + password signup/login, JWT (HS256), protected routes |
| PDF upload | Single & multi-file upload, type/size validation, local disk storage scoped per user |
| Processing | Background extract → chunk → embed → store in Chroma, status state machine |
| Chat | Server-Sent Events streaming, multi-document retrieval, citation chips with page + snippet |
| UI | Login/signup, app shell with sidebar (PDFs + chat sessions), chat surface, upload modal, dark mode, toasts |
| Persistence | SQLite via SQLAlchemy for users/pdfs/chat sessions/messages; Chroma (persistent) for vectors |
| DevOps | `docker-compose.yml` (backend + frontend dev), `.env.example`, README with screenshots |
| Bonus features (3) | Suggested questions on empty chat, typing indicator while streaming, citation chips |

### Explicitly out of scope (MVP)

- **PostgreSQL** — SQLite is used. SQLAlchemy models are written so the switch is config-only.
- **PDF preview pane & in-PDF citation highlighting** — citations are text snippets with page numbers.
- **Rate limiting, token-usage tracking, conversation summarization memory.**
- **Production Docker hardening** (multi-stage prod images, nginx, health checks beyond `/healthz`).
- **Unit-test suite for the frontend.** Backend gets pytest smoke tests only.
- **Multi-tenancy beyond per-user data scoping** (no orgs/teams).
- **Password reset, email verification, OAuth.**

## 3. Architecture

```
┌──────────────────┐     HTTP + SSE    ┌───────────────────┐
│ React + Vite     │ ◀───────────────▶ │  FastAPI Backend  │
│ TS + Tailwind    │                   │  /api/v1/auth     │
│ Zustand + RQuery │                   │  /api/v1/pdfs     │
└──────────────────┘                   │  /api/v1/chat     │
                                       │                   │
                                       │  ┌──────────────┐ │
                                       │  │ RAG Service  │ │
                                       │  │  LangChain   │ │
                                       │  └──────┬───────┘ │
                                       └─────────┼─────────┘
                                                 │
                            ┌────────────┬───────┴────────┐
                            ▼            ▼                ▼
                       ┌────────┐  ┌──────────┐    ┌────────────┐
                       │ SQLite │  │  Chroma  │    │ ./uploads  │
                       │ users  │  │ vectors  │    │ /{uid}/*pdf│
                       │ pdfs   │  │ persist  │    └────────────┘
                       │ chats  │  └──────────┘
                       │ msgs   │
                       └────────┘
```

### Boundaries & responsibilities

- **`api/v1/*`** — HTTP edge: request validation (Pydantic), auth dependency, response shaping. No business logic.
- **`services/*`** — Use cases: orchestrate models + RAG. Knows nothing about HTTP.
- **`rag/*`** — Pure RAG primitives (loader, chunker, embedder, vectorstore client, chain). No DB awareness beyond Chroma.
- **`db/*`** — SQLAlchemy session + models. Single source of truth for schemas.
- **`core/*`** — Config (pydantic-settings), security (JWT, hashing), shared deps.

Frontend mirrors this:
- **`services/`** — Axios client, typed React Query hooks. No components touch fetch directly.
- **`store/`** — Zustand slices (auth, UI). Server state lives in React Query.
- **`components/`** — Dumb UI; pages compose them.

## 4. Data model (SQLite, SQLAlchemy)

```
users
  id            UUID  PK
  email         TEXT  UNIQUE NOT NULL
  password_hash TEXT  NOT NULL
  created_at    TIMESTAMP

pdfs
  id            UUID  PK
  user_id       UUID  FK users.id  ON DELETE CASCADE
  filename      TEXT  NOT NULL          -- original
  storage_path  TEXT  NOT NULL          -- ./uploads/{uid}/{id}.pdf
  size_bytes    INT
  status        TEXT  CHECK IN ('processing','ready','failed')
  error         TEXT  NULL
  page_count    INT   NULL
  chunk_count   INT   NULL
  created_at    TIMESTAMP

chat_sessions
  id            UUID  PK
  user_id       UUID  FK users.id  ON DELETE CASCADE
  title         TEXT                    -- auto-set from first user message
  created_at    TIMESTAMP
  updated_at    TIMESTAMP

chat_messages
  id            UUID  PK
  session_id    UUID  FK chat_sessions.id  ON DELETE CASCADE
  role          TEXT  CHECK IN ('user','assistant')
  content       TEXT
  citations     JSON  NULL              -- [{pdf_id, page, snippet}]
  created_at    TIMESTAMP

session_pdfs
  session_id    UUID  FK chat_sessions.id  ON DELETE CASCADE
  pdf_id        UUID  FK pdfs.id           ON DELETE CASCADE
  PRIMARY KEY (session_id, pdf_id)
```

**Vector store (Chroma):** one persistent collection `pdf_chunks`. Each chunk record:
```
id        = f"{pdf_id}:{chunk_idx}"
document  = chunk text
metadata  = { user_id, pdf_id, filename, page, chunk_idx }
embedding = OpenAI text-embedding-3-small (1536-dim)
```

Retrieval queries always filter on `user_id` AND `pdf_id IN (selected_ids)` — user isolation is enforced at the vector layer, not just SQL.

## 5. RAG pipeline

1. **Upload (`POST /pdfs`)** — multipart, server validates `Content-Type == application/pdf` and `size ≤ 20 MB`. Writes file to `./uploads/{user_id}/{pdf_id}.pdf`. Creates `pdfs` row with `status='processing'`. Returns row immediately. Enqueues `process_pdf(pdf_id)` via `BackgroundTasks`.
2. **Extract** — `pypdf` reads page-by-page. Empty/garbage pages are skipped (logged, not failed).
3. **Chunk** — `RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200, separators=["\n\n","\n"," ",""])`. Each chunk carries its source page number in metadata.
4. **Embed** — `OpenAIEmbeddings(model="text-embedding-3-small")`, batched (100 per request).
5. **Store** — Upsert to Chroma. Update `pdfs.status='ready'`, set `page_count`, `chunk_count`. On any exception → `status='failed'`, `error=<msg>`.
6. **Retrieve (chat)** — `vectorstore.similarity_search(query, k=5, filter={"user_id": uid, "pdf_id": {"$in": selected_ids}})`.
7. **Inject + generate** — Prompt template includes: system instructions, last 6 chat messages, retrieved chunks (numbered `[1]…[5]` with `(filename, p.N)` labels), the new user question. Asks the model to cite using `[n]` markers.
8. **Stream** — `ChatOpenAI(model="gpt-4o-mini", streaming=True)`. Tokens forwarded over SSE. On completion, a final SSE event `citations` is emitted with the resolved citation list, then a `done` event.

**SSE wire format:**
```
event: token
data: {"text": "The"}

event: token
data: {"text": " quick"}

event: citations
data: {"citations": [{"pdf_id":"...","filename":"a.pdf","page":3,"snippet":"..."}]}

event: done
data: {}
```

Citation `snippet` is the first ~200 chars of the source chunk. Citations are de-duplicated by `(pdf_id, page)`.

## 6. API endpoints

All under `/api/v1`. JWT in `Authorization: Bearer <token>`. JSON unless noted.

| Method | Path | Body / Query | Response |
|---|---|---|---|
| POST | `/auth/signup` | `{email, password}` | `{access_token, user}` |
| POST | `/auth/login` | `{email, password}` | `{access_token, user}` |
| GET  | `/auth/me` | — | `{user}` |
| POST | `/pdfs` | multipart `files[]` | `[{pdf}]` |
| GET  | `/pdfs` | — | `[{pdf}]` |
| DELETE | `/pdfs/{id}` | — | `204` |
| POST | `/chat/sessions` | `{pdf_ids[]}` | `{session}` |
| GET  | `/chat/sessions` | — | `[{session}]` |
| GET  | `/chat/sessions/{id}` | — | `{session, messages[]}` |
| POST | `/chat/stream` | `{session_id, query}` | **SSE** stream: `token`, `citations`, `done` events |
| GET  | `/healthz` | — | `{status:"ok"}` |

**Error contract:** `{detail: str, code: str}` with appropriate HTTP status. 401 for missing/expired JWT, 403 for cross-user access, 422 for validation, 500 for server.

## 7. Frontend UX

### Pages

- **`/login`** — Card with toggle between Login/Signup. Email + password fields. Submit → store JWT in `localStorage`, hydrate `authStore`, redirect to `/`.
- **`/`** (protected) — App shell.

### App shell layout

```
┌────────────────┬───────────────────────────────────────┐
│ Sidebar (280px)│ Main column                           │
│                │                                       │
│ + New chat     │ ┌─ChatHeader: session title + PDFs─┐  │
│                │ │                                  │  │
│ Recent chats   │ │  message list (auto-scroll)      │  │
│  • Q3 report   │ │   user bubble (right)            │  │
│  • Tax forms   │ │   assistant bubble (left)        │  │
│                │ │     [1] [2] citation chips       │  │
│ ─────          │ │                                  │  │
│ My PDFs        │ │  empty state: suggested Qs       │  │
│  📄 a.pdf ●    │ │                                  │  │
│  📄 b.pdf ⏳   │ │                                  │  │
│  + Upload      │ │                                  │  │
│                │ ├──────────────────────────────────┤  │
│ ─────          │ │  composer: <textarea> [Send]     │  │
│ ☾ dark mode    │ └──────────────────────────────────┘  │
│ user@email     │                                       │
└────────────────┴───────────────────────────────────────┘
```

- **Status pills next to PDFs:** ● ready (green), ⏳ processing (amber, pulses), ⚠ failed (red, tooltip with error).
- **Citation chips:** small numbered pills under each assistant message. Click → popover with filename, page #, and snippet.
- **Typing indicator:** three-dot pulse shown after user sends until first token arrives.
- **Suggested questions:** 3 generic prompts shown when chat is empty (e.g., "Summarize this document", "What are the key findings?", "List action items").
- **Toasts (sonner):** upload success/failure, processing complete, errors.
- **Dark mode:** Tailwind class strategy, toggle stored in `localStorage`, default = system preference.

### State

- **Zustand `authStore`** — `{user, token, login(), logout(), hydrate()}`.
- **Zustand `uiStore`** — `{darkMode, sidebarOpen, uploadModalOpen}`.
- **React Query** — server state: `useMe`, `usePdfs`, `useSessions`, `useSession(id)`. Mutations: `useUploadPdfs`, `useDeletePdf`, `useCreateSession`.
- **Streaming** is handled outside React Query via a custom `useChatStream(sessionId)` hook that uses `fetch` + `ReadableStream` reader to parse SSE, appending tokens to local state and invalidating `useSession` on `done`.

## 8. Folder structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, middleware, router include
│   ├── api/v1/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── pdfs.py
│   │   └── chat.py
│   ├── core/
│   │   ├── config.py            # pydantic-settings
│   │   ├── security.py          # password hash + JWT encode/decode
│   │   └── deps.py              # get_current_user, get_db
│   ├── db/
│   │   ├── session.py
│   │   ├── base.py              # Base + import all models
│   │   └── models.py            # User, Pdf, ChatSession, ChatMessage, SessionPdf
│   ├── schemas/                 # Pydantic request/response models
│   │   ├── auth.py
│   │   ├── pdf.py
│   │   └── chat.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── pdf_service.py       # upload, list, delete, kick processing
│   │   └── chat_service.py      # session CRUD, stream orchestration
│   ├── rag/
│   │   ├── loader.py            # pypdf extract → list[(page, text)]
│   │   ├── chunker.py           # text splitter wrapper
│   │   ├── embedder.py          # OpenAIEmbeddings wrapper
│   │   ├── vectorstore.py       # Chroma client (singleton)
│   │   ├── pipeline.py          # process_pdf(pdf_id) end-to-end
│   │   └── chain.py             # build_chat_chain(pdf_ids, history)
│   ├── middleware/
│   │   └── logging.py           # request log w/ request_id
│   └── utils/
│       └── ids.py
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_pdfs.py
│   └── test_chat.py             # uses fake embedder + fake LLM
├── uploads/                     # gitignored
├── chroma/                      # gitignored
├── alembic/                     # migrations (single initial migration for MVP)
├── pyproject.toml
├── Dockerfile
└── .env.example

frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx                  # router
│   ├── components/
│   │   ├── ui/                  # Button, Card, Input, Toast, Spinner
│   │   ├── chat/                # MessageList, MessageBubble, CitationChip, Composer, SuggestedQuestions, TypingIndicator
│   │   ├── pdf/                 # PdfList, PdfRow, UploadModal, DropZone
│   │   └── layout/              # Sidebar, AppLayout
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   └── AppPage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useChatStream.ts
│   │   └── useDarkMode.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   ├── services/
│   │   ├── api.ts               # axios + auth interceptor
│   │   ├── auth.ts              # login, signup, me (React Query)
│   │   ├── pdfs.ts              # upload, list, delete
│   │   └── chat.ts              # sessions + stream helper
│   ├── types/
│   │   └── api.ts
│   ├── lib/
│   │   └── sse.ts               # SSE reader utility
│   └── index.css                # Tailwind directives
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── Dockerfile
└── .env.example

docker-compose.yml
README.md
.gitignore
```

## 9. Configuration

`backend/.env.example`:
```
APP_ENV=development
JWT_SECRET=change-me
JWT_ALG=HS256
JWT_EXPIRES_MIN=60
DATABASE_URL=sqlite:///./app.db
CHROMA_DIR=./chroma
UPLOAD_DIR=./uploads
MAX_UPLOAD_MB=20
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small
CORS_ORIGINS=http://localhost:5173
```

`frontend/.env.example`:
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## 10. Testing

- **Backend pytest smoke tests** with a SQLite in-memory DB + a `FakeEmbedder` and `FakeChat` injected via dependency override:
  - `test_auth.py` — signup, login, /me, expired token rejected.
  - `test_pdfs.py` — upload → row exists in `processing`, list/delete, cross-user 403.
  - `test_chat.py` — create session, post stream, assert SSE token stream + final citations event.
- **No frontend test suite for MVP.** Verification is manual against the running dev servers.

## 11. Manual verification checklist (golden path)

Before declaring the project done, end-to-end happy path in a real browser:
1. Signup new user → land on app shell.
2. Upload a multi-page PDF → see `processing` pill → flips to `ready`.
3. Create a chat session, select the PDF, ask a question.
4. See typing indicator → tokens stream in → citation chips appear.
5. Click a citation → snippet popover shows correct page text.
6. Refresh page → session and messages persist.
7. Logout → cannot access `/`.
8. Toggle dark mode → persists across refresh.

## 12. Deliverables

- All code under `backend/` and `frontend/`.
- `docker-compose.yml` that brings up both with a single command.
- `README.md` with: architecture diagram (ASCII), setup steps, env var table, screenshots of the running app, demo GIF placeholder, and a short "what I'd add next" section.
- `.env.example` for both apps.
- This design doc preserved at `docs/superpowers/specs/2026-05-19-ai-pdf-chat-design.md`.

## 13. Risks & mitigations

| Risk | Mitigation |
|---|---|
| OpenAI API costs during dev | Use `text-embedding-3-small` + `gpt-4o-mini`; small test PDFs; cache embeddings in Chroma so re-uploads are cheap. |
| SSE buffering through dev proxies | Disable Vite proxy buffering; set `X-Accel-Buffering: no` header; verify on Chrome before declaring done. |
| Chroma metadata filter syntax drift between versions | Pin `chromadb` version in `pyproject.toml`. |
| Background task on `BackgroundTasks` blocks request lifetime if long | OK for MVP; flag as "swap to Celery/RQ for prod" in README. |
| Embedding a 200-page PDF takes > 60s | Show clear `processing` UI; chunk + batch embed; OK for portfolio demo with small PDFs. |
