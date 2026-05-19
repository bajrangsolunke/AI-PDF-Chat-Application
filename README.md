# AI PDF Chat

A production-quality RAG chat application: upload PDFs, ask questions, get streamed answers with citations. Built with FastAPI, LangChain, ChromaDB, and React.

> Built as a portfolio project to demonstrate a complete vertical slice of a Gen-AI product: authentication, document ingestion, RAG pipeline, real-time token streaming, and a SaaS-quality UI.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind + Zustand + TanStack Query |
| Backend | FastAPI + SQLAlchemy + SQLite + Alembic |
| Vector DB | ChromaDB (persistent) |
| LLM | OpenAI `gpt-4o-mini` (streamed via Server-Sent Events) |
| Embeddings | OpenAI `text-embedding-3-small` |
| RAG | LangChain `RecursiveCharacterTextSplitter` + Chroma similarity search |
| Auth | JWT (HS256), bcrypt password hashing |

## Architecture

```
React (Vite + Tailwind)   ──HTTP/SSE──▶   FastAPI
                                            │
                              ┌─────────────┼──────────────┐
                              ▼             ▼              ▼
                          SQLite        Chroma         ./uploads
                        users/pdfs/   pdf_chunks         *.pdf
                         chats/msgs   (per-user)
```

See [docs/superpowers/specs/2026-05-19-ai-pdf-chat-design.md](docs/superpowers/specs/2026-05-19-ai-pdf-chat-design.md) for the full design.

## Features

- **Auth:** signup / login / current-user endpoints, JWT in `Authorization: Bearer`, persisted in `localStorage` on the client.
- **PDF upload:** multipart upload, drag-and-drop, type and size validation (20 MB), per-user storage isolation.
- **RAG pipeline (background):** extract via `pypdf` → split with `RecursiveCharacterTextSplitter` (1000/200) → embed in batches → upsert to Chroma with `{user_id, pdf_id, page, chunk_idx}` metadata.
- **Chat with streaming:** SSE token stream, citation chips with snippet preview, last-N message context window, multi-document retrieval.
- **UI:** professional SaaS look — collapsible sidebar with recent chats and PDF list, status pills (processing / ready / failed), dark mode persisted across reloads, suggested questions, typing indicator, toast notifications via sonner.

## Prerequisites

- **OpenAI account with billing enabled.** A free OpenAI account without a payment method will return `429 insufficient_quota` on the first embedding call. Add ~$5 of credit at [platform.openai.com/settings/organization/billing](https://platform.openai.com/settings/organization/billing) — that covers many demo runs of this app since `text-embedding-3-small` and `gpt-4o-mini` are inexpensive.
- Python 3.11+ and Node 20+ (for local dev), or Docker (for one-command run).

## Quick start — Docker (one command)

```bash
cp .env.example .env
# Edit .env and set OPENAI_API_KEY
docker compose up --build
```

Open [http://localhost:5173](http://localhost:5173).

## Quick start — local dev

**Backend:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env  # then set OPENAI_API_KEY
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Frontend:** (in another terminal)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Environment variables

### Backend (`backend/.env`)
| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | — (required) | Symmetric secret for HS256 JWTs |
| `OPENAI_API_KEY` | — (required) | OpenAI API key |
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` | Chat model |
| `OPENAI_EMBED_MODEL` | `text-embedding-3-small` | Embedding model |
| `DATABASE_URL` | `sqlite:///./app.db` | SQLAlchemy URL |
| `CHROMA_DIR` | `./chroma` | Chroma persistence path |
| `UPLOAD_DIR` | `./uploads` | PDF storage path |
| `MAX_UPLOAD_MB` | `20` | Per-file upload limit |
| `JWT_EXPIRES_MIN` | `60` | Token expiry in minutes |
| `CORS_ORIGINS` | `http://localhost:5173` | CSV of allowed origins |

### Frontend (`frontend/.env`)
| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Backend base URL |

## API surface

All routes under `/api/v1`. Auth via `Authorization: Bearer <jwt>` (except `/auth/signup` and `/auth/login`).

```
POST   /auth/signup          {email, password}
POST   /auth/login           {email, password}
GET    /auth/me

POST   /pdfs                 multipart files[]
GET    /pdfs
DELETE /pdfs/{id}

POST   /chat/sessions        {pdf_ids, title?}
GET    /chat/sessions
GET    /chat/sessions/{id}
POST   /chat/stream          {session_id, query}  → SSE: token, citations, done
```

Interactive docs (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs).

## Project structure

```
backend/
├── app/
│   ├── api/v1/         # FastAPI routers (auth, pdfs, chat)
│   ├── core/           # config, security (JWT, hashing), deps
│   ├── db/             # SQLAlchemy session, base, models
│   ├── schemas/        # Pydantic request/response models
│   ├── services/       # business logic (auth_service, pdf_service, chat_service)
│   ├── rag/            # loader, chunker, embedder, vectorstore, pipeline, chain
│   ├── middleware/     # logging
│   └── main.py
├── alembic/            # migrations
└── tests/              # pytest

frontend/
└── src/
    ├── components/
    │   ├── ui/         # Button, Input, Card
    │   ├── chat/       # MessageBubble, CitationChip, Composer, etc.
    │   ├── pdf/        # PdfList, UploadModal
    │   └── layout/     # Sidebar
    ├── pages/          # LoginPage, AppPage
    ├── hooks/          # useChatStream, useDarkMode
    ├── store/          # authStore, uiStore (Zustand)
    ├── services/       # api, auth, pdfs, chat (React Query hooks + SSE reader)
    ├── layouts/        # AppLayout
    ├── lib/            # cn helper
    └── types/          # shared API types
```

## Testing

```bash
cd backend && source .venv/bin/activate && pytest -v
```

16 backend smoke tests cover auth (signup, login, /me, duplicate, wrong password), DB models, RAG primitives, processing pipeline, PDF upload/list/delete with cross-user isolation, and chat session creation + SSE streaming with a fake embedder and fake LLM.

The frontend has no unit test suite for the MVP — verification is manual against the running dev servers (see the golden-path checklist in the design spec).

## What I'd add next

- Postgres + production-grade Alembic migrations.
- PDF preview pane with in-document citation highlighting.
- Per-user rate limiting (slowapi) and OpenAI token-usage tracking.
- Conversation summarization memory for long chats.
- Move PDF processing from FastAPI `BackgroundTasks` to Celery / RQ.
- Frontend unit tests (Vitest + React Testing Library).
- OAuth (Google / GitHub) and password reset flows.

## License

MIT
