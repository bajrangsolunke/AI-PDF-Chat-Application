# AI PDF Chat MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a vertical-slice, RAG-powered AI PDF chat app: signup → upload PDF → ask question → receive streamed answer with citations.

**Architecture:** FastAPI + SQLite + Chroma backend with LangChain RAG pipeline; React + Vite + TS + Tailwind frontend with Zustand and React Query; SSE for token streaming.

**Tech Stack:** Python 3.11 + FastAPI + SQLAlchemy + Alembic + Chroma + LangChain + OpenAI; React 18 + Vite 5 + TypeScript + TailwindCSS + Zustand + TanStack Query + sonner.

**Source spec:** `docs/superpowers/specs/2026-05-19-ai-pdf-chat-design.md`

---

## Phase Overview

| Phase | Outcome | Demoable? |
|---|---|---|
| 0 | Repo scaffold (backend + frontend skeletons) | `uvicorn` + `vite` boot, return placeholders |
| 1 | Backend foundation: config, DB, models, healthcheck | `/healthz` returns 200, tables exist |
| 2 | Auth: signup/login/me with JWT | Curl signup → login → /me round-trip |
| 3 | PDF upload + RAG processing pipeline | Upload PDF → row flips processing→ready, vectors in Chroma |
| 4 | Chat: session CRUD + SSE streaming RAG | Curl streams an answer with citations |
| 5 | Frontend foundation: router, auth shell, dark mode | Login UI works against real backend |
| 6 | Frontend chat UI: sidebar, upload, chat with citations | Full end-to-end browser demo |
| 7 | Polish: Docker, README, screenshots placeholder | One-command `docker compose up` |

---

# Phase 0 — Repo Scaffold

### Task 0.1: Initialize backend Python project

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/.python-version`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/tests/__init__.py`

- [ ] **Step 1: Create `backend/pyproject.toml`**

```toml
[project]
name = "ai-pdf-chat-backend"
version = "0.1.0"
description = "AI PDF Chat backend"
requires-python = ">=3.11,<3.13"
dependencies = [
  "fastapi==0.115.0",
  "uvicorn[standard]==0.30.6",
  "pydantic==2.9.2",
  "pydantic-settings==2.5.2",
  "SQLAlchemy==2.0.35",
  "alembic==1.13.3",
  "passlib[bcrypt]==1.7.4",
  "python-jose[cryptography]==3.3.0",
  "python-multipart==0.0.12",
  "pypdf==5.0.1",
  "langchain==0.3.3",
  "langchain-openai==0.2.2",
  "langchain-community==0.3.2",
  "chromadb==0.5.13",
  "openai==1.51.2",
  "httpx==0.27.2",
  "sse-starlette==2.1.3",
]

[project.optional-dependencies]
dev = [
  "pytest==8.3.3",
  "pytest-asyncio==0.24.0",
  "ruff==0.6.9",
]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

- [ ] **Step 2: Create `backend/.python-version`**

```
3.11
```

- [ ] **Step 3: Create `backend/.env.example`**

```
APP_ENV=development
JWT_SECRET=change-me-in-prod
JWT_ALG=HS256
JWT_EXPIRES_MIN=60
DATABASE_URL=sqlite:///./app.db
CHROMA_DIR=./chroma
UPLOAD_DIR=./uploads
MAX_UPLOAD_MB=20
OPENAI_API_KEY=sk-replace-me
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small
CORS_ORIGINS=http://localhost:5173
```

- [ ] **Step 4: Create minimal `backend/app/main.py`**

```python
from fastapi import FastAPI

app = FastAPI(title="AI PDF Chat", version="0.1.0")


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 5: Create empty `backend/app/__init__.py` and `backend/tests/__init__.py`**

```bash
touch backend/app/__init__.py backend/tests/__init__.py
```

- [ ] **Step 6: Install deps and verify boot**

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000 &
sleep 2
curl -s http://localhost:8000/healthz
kill %1
```
Expected: `{"status":"ok"}`

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "chore(backend): scaffold FastAPI project with deps and healthcheck"
```

---

### Task 0.2: Initialize frontend Vite project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/index.css`
- Create: `frontend/.env.example`
- Create: `frontend/.eslintrc.cjs` (skip if not desired)

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "ai-pdf-chat-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.59.0",
    "axios": "^1.7.7",
    "clsx": "^2.1.1",
    "lucide-react": "^0.453.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.27.0",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.5.4",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.2",
    "vite": "^5.4.8"
  }
}
```

- [ ] **Step 2: Create `frontend/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: { port: 5173 },
});
```

- [ ] **Step 3: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create `frontend/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Create `frontend/tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#7c3aed",
          fg: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
    },
  },
} satisfies Config;
```

- [ ] **Step 6: Create `frontend/postcss.config.js`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 7: Create `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI PDF Chat</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { font-family: theme(fontFamily.sans); }
  body { @apply bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100; }
}
```

- [ ] **Step 9: Create `frontend/src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 10: Create placeholder `frontend/src/App.tsx`**

```tsx
export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl font-semibold">AI PDF Chat — coming online</h1>
    </div>
  );
}
```

- [ ] **Step 11: Create `frontend/.env.example`**

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

- [ ] **Step 12: Install and verify dev server**

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 &
sleep 4
curl -s http://127.0.0.1:5173/ | grep -o "AI PDF Chat"
kill %1
```
Expected: `AI PDF Chat`

- [ ] **Step 13: Commit**

```bash
git add frontend/
git commit -m "chore(frontend): scaffold Vite + React + TS + Tailwind"
```

---

# Phase 1 — Backend Foundation

### Task 1.1: Add Settings (pydantic-settings)

**Files:**
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/config.py`
- Test: `backend/tests/test_config.py`

- [ ] **Step 1: Write failing test `backend/tests/test_config.py`**

```python
import os


def test_settings_load_from_env(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "x")
    monkeypatch.setenv("OPENAI_API_KEY", "y")
    from app.core.config import Settings
    s = Settings()
    assert s.jwt_secret == "x"
    assert s.openai_api_key == "y"
    assert s.max_upload_mb == 20
    assert s.cors_origins == ["http://localhost:5173"]


def test_cors_origins_parsed_from_csv(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "x")
    monkeypatch.setenv("OPENAI_API_KEY", "y")
    monkeypatch.setenv("CORS_ORIGINS", "http://a.com,http://b.com")
    from app.core.config import Settings
    s = Settings()
    assert s.cors_origins == ["http://a.com", "http://b.com"]
```

- [ ] **Step 2: Run, expect failure**

```bash
cd backend && pytest tests/test_config.py -v
```
Expected: ModuleNotFoundError or AttributeError.

- [ ] **Step 3: Create `backend/app/core/config.py`**

```python
from functools import lru_cache
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    jwt_secret: str
    jwt_alg: str = "HS256"
    jwt_expires_min: int = 60
    database_url: str = "sqlite:///./app.db"
    chroma_dir: str = "./chroma"
    upload_dir: str = "./uploads"
    max_upload_mb: int = 20
    openai_api_key: str
    openai_chat_model: str = "gpt-4o-mini"
    openai_embed_model: str = "text-embedding-3-small"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 4: Create `backend/app/core/__init__.py`** (empty)

- [ ] **Step 5: Run tests, expect pass**

```bash
pytest tests/test_config.py -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/core backend/tests/test_config.py
git commit -m "feat(backend): add Settings with env loading and CSV CORS parsing"
```

---

### Task 1.2: Wire CORS + logging middleware + routers

**Files:**
- Create: `backend/app/middleware/__init__.py`
- Create: `backend/app/middleware/logging.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/v1/__init__.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create `backend/app/middleware/logging.py`**

```python
import logging
import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("app.request")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("x-request-id", uuid.uuid4().hex[:12])
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = (time.perf_counter() - start) * 1000
        logger.info(
            "request id=%s method=%s path=%s status=%d elapsed_ms=%.1f",
            rid, request.method, request.url.path, response.status_code, elapsed,
        )
        response.headers["x-request-id"] = rid
        return response
```

- [ ] **Step 2: Create empty `backend/app/middleware/__init__.py`, `backend/app/api/__init__.py`, `backend/app/api/v1/__init__.py`**

- [ ] **Step 3: Create `backend/app/api/v1/__init__.py` with a stub router**

```python
from fastapi import APIRouter

api_router = APIRouter(prefix="/api/v1")
```

- [ ] **Step 4: Rewrite `backend/app/main.py`**

```python
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import get_settings
from app.middleware.logging import RequestLoggingMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

settings = get_settings()
app = FastAPI(title="AI PDF Chat", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-request-id"],
)
app.add_middleware(RequestLoggingMiddleware)
app.include_router(api_router)


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 5: Boot, verify**

```bash
export JWT_SECRET=test OPENAI_API_KEY=sk-test
uvicorn app.main:app --port 8000 &
sleep 2
curl -s -o /dev/null -w "%{http_code} %{header_x-request-id}\n" http://localhost:8000/healthz
kill %1
```
Expected: `200 <hex id>`.

- [ ] **Step 6: Commit**

```bash
git add backend/app/main.py backend/app/middleware backend/app/api
git commit -m "feat(backend): CORS + request logging middleware + v1 router stub"
```

---

### Task 1.3: SQLAlchemy session + base + models

**Files:**
- Create: `backend/app/db/__init__.py`
- Create: `backend/app/db/session.py`
- Create: `backend/app/db/base.py`
- Create: `backend/app/db/models.py`
- Test: `backend/tests/test_db.py`

- [ ] **Step 1: Create `backend/app/db/session.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import get_settings

settings = get_settings()
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 2: Create `backend/app/db/base.py`**

```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
```

- [ ] **Step 3: Create `backend/app/db/models.py`**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _uuid() -> str:
    return uuid.uuid4().hex


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Pdf(Base):
    __tablename__ = "pdfs"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default="processing")
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    chunk_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), default="New chat")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("chat_sessions.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # user|assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SessionPdf(Base):
    __tablename__ = "session_pdfs"
    session_id: Mapped[str] = mapped_column(ForeignKey("chat_sessions.id", ondelete="CASCADE"), primary_key=True)
    pdf_id: Mapped[str] = mapped_column(ForeignKey("pdfs.id", ondelete="CASCADE"), primary_key=True)
```

- [ ] **Step 4: Create empty `backend/app/db/__init__.py`** that re-exports models so Alembic finds them:

```python
from app.db.base import Base  # noqa: F401
from app.db import models  # noqa: F401
```

- [ ] **Step 5: Write test `backend/tests/test_db.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.models import User


def test_user_roundtrip():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    with Session() as s:
        u = User(email="a@b.com", password_hash="x")
        s.add(u); s.commit(); s.refresh(u)
        assert u.id and len(u.id) == 32
        assert s.query(User).filter_by(email="a@b.com").first().id == u.id
```

- [ ] **Step 6: Run tests**

```bash
pytest tests/test_db.py -v
```
Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add backend/app/db backend/tests/test_db.py
git commit -m "feat(backend): SQLAlchemy models for users/pdfs/chats"
```

---

### Task 1.4: Alembic init + initial migration

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/0001_initial.py`

- [ ] **Step 1: Initialize alembic**

```bash
cd backend
alembic init alembic
```
This creates `alembic.ini`, `alembic/env.py`, etc.

- [ ] **Step 2: Edit `backend/alembic.ini`** — set:

```
sqlalchemy.url = sqlite:///./app.db
```

- [ ] **Step 3: Replace `backend/alembic/env.py` body so target_metadata is wired**

In the generated file, set:

```python
from app.core.config import get_settings
from app.db.base import Base
from app.db import models  # noqa: F401

config.set_main_option("sqlalchemy.url", get_settings().database_url)
target_metadata = Base.metadata
```

(Replace the existing `target_metadata = None` line and add the imports near the top after `from logging.config import fileConfig`.)

- [ ] **Step 4: Autogenerate initial migration**

```bash
export JWT_SECRET=test OPENAI_API_KEY=sk-test
alembic revision --autogenerate -m "initial"
mv alembic/versions/*_initial.py alembic/versions/0001_initial.py
```

- [ ] **Step 5: Apply and verify**

```bash
alembic upgrade head
sqlite3 app.db ".tables"
```
Expected output includes: `chat_messages chat_sessions pdfs session_pdfs users alembic_version`.

- [ ] **Step 6: Commit**

```bash
git add backend/alembic.ini backend/alembic
git commit -m "chore(backend): alembic setup + initial migration"
```

---

# Phase 2 — Auth

### Task 2.1: Password hashing + JWT utilities

**Files:**
- Create: `backend/app/core/security.py`
- Test: `backend/tests/test_security.py`

- [ ] **Step 1: Write failing test `backend/tests/test_security.py`**

```python
import time
import pytest
from jose import JWTError

from app.core import security


def test_hash_and_verify_password():
    h = security.hash_password("hunter2")
    assert h != "hunter2"
    assert security.verify_password("hunter2", h) is True
    assert security.verify_password("wrong", h) is False


def test_jwt_round_trip():
    token = security.create_access_token("user-1", expires_minutes=5)
    payload = security.decode_token(token)
    assert payload["sub"] == "user-1"


def test_jwt_expired():
    token = security.create_access_token("user-1", expires_minutes=-1)
    with pytest.raises(JWTError):
        security.decode_token(token)
```

- [ ] **Step 2: Run, expect fail**

```bash
pytest tests/test_security.py -v
```

- [ ] **Step 3: Create `backend/app/core/security.py`**

```python
from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    settings = get_settings()
    exp_minutes = expires_minutes if expires_minutes is not None else settings.jwt_expires_min
    now = datetime.now(timezone.utc)
    payload = {"sub": subject, "iat": int(now.timestamp()), "exp": int((now + timedelta(minutes=exp_minutes)).timestamp())}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_alg)


def decode_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])
```

- [ ] **Step 4: Run tests, expect pass**

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/security.py backend/tests/test_security.py
git commit -m "feat(backend): password hashing + JWT utilities"
```

---

### Task 2.2: Auth schemas, service, and endpoints

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/auth_service.py`
- Create: `backend/app/core/deps.py`
- Create: `backend/app/api/v1/auth.py`
- Modify: `backend/app/api/v1/__init__.py`
- Test: `backend/tests/conftest.py`
- Test: `backend/tests/test_auth.py`

- [ ] **Step 1: Create `backend/app/schemas/auth.py`**

```python
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
```

- [ ] **Step 2: Create `backend/app/services/auth_service.py`**

```python
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core import security
from app.db.models import User


def signup(db: Session, email: str, password: str) -> User:
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="email already registered")
    user = User(email=email, password_hash=security.hash_password(password))
    db.add(user); db.commit(); db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user or not security.verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid credentials")
    return user


def get_user(db: Session, user_id: str) -> User | None:
    return db.query(User).filter(User.id == user_id).first()
```

- [ ] **Step 3: Create `backend/app/core/deps.py`**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core import security
from app.db.models import User
from app.db.session import get_db
from app.services import auth_service

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=True)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    creds_exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")
    try:
        payload = security.decode_token(token)
    except JWTError:
        raise creds_exc
    user_id = payload.get("sub")
    if not user_id:
        raise creds_exc
    user = auth_service.get_user(db, user_id)
    if not user:
        raise creds_exc
    return user
```

- [ ] **Step 4: Create `backend/app/api/v1/auth.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core import security
from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
def signup(body: SignupRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = auth_service.signup(db, body.email, body.password)
    return TokenResponse(access_token=security.create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = auth_service.authenticate(db, body.email, body.password)
    return TokenResponse(access_token=security.create_access_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)
```

- [ ] **Step 5: Wire router in `backend/app/api/v1/__init__.py`**

```python
from fastapi import APIRouter

from app.api.v1.auth import router as auth_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
```

- [ ] **Step 6: Create `backend/tests/conftest.py`**

```python
import os
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("OPENAI_API_KEY", "sk-test")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(db_session):
    def _override():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = _override
    yield TestClient(app)
    app.dependency_overrides.clear()
```

- [ ] **Step 7: Create `backend/tests/test_auth.py`**

```python
def test_signup_then_login_then_me(client):
    r = client.post("/api/v1/auth/signup", json={"email": "a@b.com", "password": "hunter22"})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]

    r = client.post("/api/v1/auth/login", json={"email": "a@b.com", "password": "hunter22"})
    assert r.status_code == 200
    token = r.json()["access_token"]

    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "a@b.com"


def test_signup_duplicate(client):
    client.post("/api/v1/auth/signup", json={"email": "a@b.com", "password": "hunter22"})
    r = client.post("/api/v1/auth/signup", json={"email": "a@b.com", "password": "hunter22"})
    assert r.status_code == 409


def test_login_wrong_password(client):
    client.post("/api/v1/auth/signup", json={"email": "a@b.com", "password": "hunter22"})
    r = client.post("/api/v1/auth/login", json={"email": "a@b.com", "password": "wrong"})
    assert r.status_code == 401


def test_me_requires_auth(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401
```

- [ ] **Step 8: Run tests, expect all pass**

```bash
pytest tests/test_auth.py -v
```

- [ ] **Step 9: Commit**

```bash
git add backend/app/schemas backend/app/services backend/app/core/deps.py \
        backend/app/api/v1 backend/tests/conftest.py backend/tests/test_auth.py
git commit -m "feat(backend): JWT auth (signup, login, me) with tests"
```

---

# Phase 3 — PDF Upload + RAG Processing

### Task 3.1: RAG primitives (loader, chunker, embedder, vectorstore)

**Files:**
- Create: `backend/app/rag/__init__.py`
- Create: `backend/app/rag/loader.py`
- Create: `backend/app/rag/chunker.py`
- Create: `backend/app/rag/embedder.py`
- Create: `backend/app/rag/vectorstore.py`
- Test: `backend/tests/test_rag_primitives.py`

- [ ] **Step 1: Create `backend/app/rag/loader.py`**

```python
from pathlib import Path
from pypdf import PdfReader


def load_pdf_pages(path: str | Path) -> list[tuple[int, str]]:
    """Return [(page_number_1_based, text)] for non-empty pages."""
    reader = PdfReader(str(path))
    pages: list[tuple[int, str]] = []
    for idx, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append((idx, text))
    return pages
```

- [ ] **Step 2: Create `backend/app/rag/chunker.py`**

```python
from dataclasses import dataclass
from langchain.text_splitter import RecursiveCharacterTextSplitter


@dataclass
class Chunk:
    text: str
    page: int
    chunk_idx: int


def chunk_pages(pages: list[tuple[int, str]], chunk_size: int = 1000, chunk_overlap: int = 200) -> list[Chunk]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
    )
    out: list[Chunk] = []
    counter = 0
    for page_num, text in pages:
        for piece in splitter.split_text(text):
            out.append(Chunk(text=piece, page=page_num, chunk_idx=counter))
            counter += 1
    return out
```

- [ ] **Step 3: Create `backend/app/rag/embedder.py`**

```python
from typing import Protocol


class Embedder(Protocol):
    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...
    def embed_query(self, text: str) -> list[float]: ...


def get_embedder() -> Embedder:
    from langchain_openai import OpenAIEmbeddings
    from app.core.config import get_settings
    settings = get_settings()
    return OpenAIEmbeddings(model=settings.openai_embed_model, api_key=settings.openai_api_key)
```

- [ ] **Step 4: Create `backend/app/rag/vectorstore.py`**

```python
from functools import lru_cache
from pathlib import Path
import chromadb

from app.core.config import get_settings

COLLECTION = "pdf_chunks"


@lru_cache
def get_chroma_client() -> chromadb.PersistentClient:
    settings = get_settings()
    Path(settings.chroma_dir).mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=settings.chroma_dir)


def get_collection():
    return get_chroma_client().get_or_create_collection(name=COLLECTION, metadata={"hnsw:space": "cosine"})


def upsert_chunks(
    user_id: str,
    pdf_id: str,
    filename: str,
    chunks: list[dict],
    embeddings: list[list[float]],
) -> None:
    coll = get_collection()
    ids = [f"{pdf_id}:{c['chunk_idx']}" for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [
        {"user_id": user_id, "pdf_id": pdf_id, "filename": filename, "page": c["page"], "chunk_idx": c["chunk_idx"]}
        for c in chunks
    ]
    coll.upsert(ids=ids, documents=documents, metadatas=metadatas, embeddings=embeddings)


def delete_pdf(pdf_id: str) -> None:
    get_collection().delete(where={"pdf_id": pdf_id})


def query(user_id: str, pdf_ids: list[str], query_embedding: list[float], k: int = 5) -> list[dict]:
    coll = get_collection()
    where = {"$and": [{"user_id": user_id}, {"pdf_id": {"$in": pdf_ids}}]}
    res = coll.query(query_embeddings=[query_embedding], n_results=k, where=where)
    results = []
    for i in range(len(res["ids"][0])):
        results.append({
            "id": res["ids"][0][i],
            "text": res["documents"][0][i],
            "metadata": res["metadatas"][0][i],
            "score": res["distances"][0][i],
        })
    return results
```

- [ ] **Step 5: Create `backend/tests/test_rag_primitives.py`** (chunker only; loader needs a real PDF)

```python
from app.rag.chunker import chunk_pages


def test_chunker_splits_by_size():
    pages = [(1, "a" * 2500), (2, "short")]
    chunks = chunk_pages(pages, chunk_size=1000, chunk_overlap=100)
    assert len(chunks) >= 3
    assert all(c.page in (1, 2) for c in chunks)
    indices = [c.chunk_idx for c in chunks]
    assert indices == sorted(indices) and len(set(indices)) == len(indices)
```

- [ ] **Step 6: Run, expect pass**

```bash
pytest tests/test_rag_primitives.py -v
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/rag backend/tests/test_rag_primitives.py
git commit -m "feat(backend): RAG primitives (loader, chunker, embedder, chroma)"
```

---

### Task 3.2: Processing pipeline

**Files:**
- Create: `backend/app/rag/pipeline.py`
- Test: `backend/tests/test_pipeline.py`

- [ ] **Step 1: Create `backend/app/rag/pipeline.py`**

```python
import logging
from dataclasses import asdict

from sqlalchemy.orm import Session

from app.db.models import Pdf
from app.rag import loader, chunker, vectorstore
from app.rag.embedder import Embedder

logger = logging.getLogger("app.rag.pipeline")


def process_pdf(db: Session, pdf_id: str, embedder: Embedder) -> None:
    pdf = db.query(Pdf).filter(Pdf.id == pdf_id).first()
    if not pdf:
        logger.warning("process_pdf: pdf %s missing", pdf_id)
        return
    try:
        pages = loader.load_pdf_pages(pdf.storage_path)
        if not pages:
            raise ValueError("no extractable text in PDF")

        chunks = chunker.chunk_pages(pages)
        if not chunks:
            raise ValueError("chunker returned no chunks")

        texts = [c.text for c in chunks]
        # Batch in 100s to keep embedding requests reasonable
        embeddings: list[list[float]] = []
        for i in range(0, len(texts), 100):
            embeddings.extend(embedder.embed_documents(texts[i : i + 100]))

        vectorstore.upsert_chunks(
            user_id=pdf.user_id,
            pdf_id=pdf.id,
            filename=pdf.filename,
            chunks=[asdict(c) for c in chunks],
            embeddings=embeddings,
        )

        pdf.page_count = len(pages)
        pdf.chunk_count = len(chunks)
        pdf.status = "ready"
        pdf.error = None
        db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.exception("PDF processing failed for %s", pdf_id)
        pdf.status = "failed"
        pdf.error = str(exc)[:500]
        db.commit()
```

- [ ] **Step 2: Create `backend/tests/test_pipeline.py`** (uses a fake embedder + a tiny PDF)

```python
from pathlib import Path
from pypdf import PdfWriter

from app.db.models import User, Pdf
from app.rag.pipeline import process_pdf


class FakeEmbedder:
    def embed_documents(self, texts):
        return [[0.1, 0.2, 0.3] for _ in texts]

    def embed_query(self, text):
        return [0.1, 0.2, 0.3]


def _make_tiny_pdf(path: Path) -> None:
    # pypdf cannot write text easily; use reportlab if available, else write a stub PDF with one page of synthetic text.
    from reportlab.pdfgen import canvas
    c = canvas.Canvas(str(path))
    c.drawString(72, 720, "hello world this is a test pdf for chunking")
    c.showPage()
    c.save()


def test_process_pdf_success(db_session, tmp_path, monkeypatch):
    # ensure reportlab is available; skip if not
    pytest = __import__("pytest")
    try:
        import reportlab  # noqa: F401
    except ImportError:
        pytest.skip("reportlab not installed; skipping pipeline integration test")

    user = User(email="a@b.com", password_hash="x")
    db_session.add(user); db_session.commit(); db_session.refresh(user)

    pdf_path = tmp_path / "sample.pdf"
    _make_tiny_pdf(pdf_path)

    pdf = Pdf(user_id=user.id, filename="sample.pdf", storage_path=str(pdf_path), size_bytes=pdf_path.stat().st_size)
    db_session.add(pdf); db_session.commit(); db_session.refresh(pdf)

    # avoid hitting real chroma
    from app.rag import vectorstore as vs
    monkeypatch.setattr(vs, "upsert_chunks", lambda **kwargs: None)

    process_pdf(db_session, pdf.id, FakeEmbedder())
    db_session.refresh(pdf)
    assert pdf.status == "ready"
    assert pdf.page_count == 1
    assert pdf.chunk_count >= 1
```

- [ ] **Step 3: Add reportlab to dev deps**

In `backend/pyproject.toml`, change the `dev` extras to:

```toml
dev = [
  "pytest==8.3.3",
  "pytest-asyncio==0.24.0",
  "ruff==0.6.9",
  "reportlab==4.2.5",
]
```

Then reinstall:

```bash
pip install -e ".[dev]"
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_pipeline.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/rag/pipeline.py backend/tests/test_pipeline.py backend/pyproject.toml
git commit -m "feat(backend): RAG processing pipeline + integration test"
```

---

### Task 3.3: PDF endpoints (upload/list/delete) + service

**Files:**
- Create: `backend/app/schemas/pdf.py`
- Create: `backend/app/services/pdf_service.py`
- Create: `backend/app/api/v1/pdfs.py`
- Modify: `backend/app/api/v1/__init__.py`
- Test: `backend/tests/test_pdfs.py`

- [ ] **Step 1: Create `backend/app/schemas/pdf.py`**

```python
from datetime import datetime
from pydantic import BaseModel


class PdfOut(BaseModel):
    id: str
    filename: str
    size_bytes: int
    status: str
    error: str | None = None
    page_count: int | None = None
    chunk_count: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Create `backend/app/services/pdf_service.py`**

```python
import os
from pathlib import Path
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import Pdf
from app.rag import vectorstore


def _user_dir(user_id: str) -> Path:
    base = Path(get_settings().upload_dir) / user_id
    base.mkdir(parents=True, exist_ok=True)
    return base


async def save_upload(db: Session, user_id: str, file: UploadFile) -> Pdf:
    settings = get_settings()
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=415, detail="only PDF files are accepted")

    # stream to disk while measuring size
    pdf = Pdf(user_id=user_id, filename=file.filename or "upload.pdf", storage_path="", size_bytes=0)
    db.add(pdf); db.commit(); db.refresh(pdf)

    target = _user_dir(user_id) / f"{pdf.id}.pdf"
    size = 0
    max_bytes = settings.max_upload_mb * 1024 * 1024
    with target.open("wb") as fh:
        while True:
            chunk = await file.read(64 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > max_bytes:
                fh.close(); target.unlink(missing_ok=True)
                db.delete(pdf); db.commit()
                raise HTTPException(status_code=413, detail=f"file exceeds {settings.max_upload_mb} MB")
            fh.write(chunk)

    pdf.storage_path = str(target)
    pdf.size_bytes = size
    db.commit(); db.refresh(pdf)
    return pdf


def list_user_pdfs(db: Session, user_id: str) -> list[Pdf]:
    return db.query(Pdf).filter(Pdf.user_id == user_id).order_by(Pdf.created_at.desc()).all()


def delete_pdf(db: Session, user_id: str, pdf_id: str) -> None:
    pdf = db.query(Pdf).filter(Pdf.id == pdf_id).first()
    if not pdf or pdf.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="pdf not found")
    try:
        os.remove(pdf.storage_path)
    except FileNotFoundError:
        pass
    try:
        vectorstore.delete_pdf(pdf_id)
    except Exception:  # noqa: BLE001 - chroma may be unhealthy in tests
        pass
    db.delete(pdf); db.commit()
```

- [ ] **Step 3: Create `backend/app/api/v1/pdfs.py`**

```python
from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import SessionLocal, get_db
from app.rag.embedder import get_embedder
from app.rag.pipeline import process_pdf
from app.schemas.pdf import PdfOut
from app.services import pdf_service

router = APIRouter(prefix="/pdfs", tags=["pdfs"])


def _kick_processing(pdf_id: str) -> None:
    db = SessionLocal()
    try:
        process_pdf(db, pdf_id, get_embedder())
    finally:
        db.close()


@router.post("", response_model=list[PdfOut])
async def upload_pdfs(
    background: BackgroundTasks,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PdfOut]:
    created = []
    for f in files:
        pdf = await pdf_service.save_upload(db, user.id, f)
        background.add_task(_kick_processing, pdf.id)
        created.append(PdfOut.model_validate(pdf))
    return created


@router.get("", response_model=list[PdfOut])
def list_pdfs(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[PdfOut]:
    return [PdfOut.model_validate(p) for p in pdf_service.list_user_pdfs(db, user.id)]


@router.delete("/{pdf_id}", status_code=204)
def delete_pdf(pdf_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> None:
    pdf_service.delete_pdf(db, user.id, pdf_id)
```

- [ ] **Step 4: Register router in `backend/app/api/v1/__init__.py`**

```python
from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.pdfs import router as pdfs_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(pdfs_router)
```

- [ ] **Step 5: Create `backend/tests/test_pdfs.py`**

```python
import io
from pathlib import Path


def _auth(client, email="u1@example.com"):
    r = client.post("/api/v1/auth/signup", json={"email": email, "password": "hunter22"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _tiny_pdf_bytes() -> bytes:
    # Use reportlab to generate a 1-page PDF in memory
    try:
        from reportlab.pdfgen import canvas
        from io import BytesIO
        buf = BytesIO()
        c = canvas.Canvas(buf)
        c.drawString(72, 720, "hello world test pdf")
        c.showPage(); c.save()
        return buf.getvalue()
    except ImportError:
        # Fallback: a minimal valid PDF header (will fail processing but pass upload tests)
        return b"%PDF-1.4\n%%EOF\n"


def test_upload_and_list(client, monkeypatch):
    # Make processing a no-op so tests do not hit OpenAI
    from app.api.v1 import pdfs as pdfs_api
    monkeypatch.setattr(pdfs_api, "_kick_processing", lambda *a, **k: None)

    headers = _auth(client)
    files = {"files": ("a.pdf", _tiny_pdf_bytes(), "application/pdf")}
    r = client.post("/api/v1/pdfs", headers=headers, files=files)
    assert r.status_code == 200, r.text
    pdfs = r.json()
    assert len(pdfs) == 1
    assert pdfs[0]["status"] == "processing"
    assert pdfs[0]["filename"] == "a.pdf"

    r = client.get("/api/v1/pdfs", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_delete_pdf_cross_user_forbidden(client, monkeypatch):
    from app.api.v1 import pdfs as pdfs_api
    monkeypatch.setattr(pdfs_api, "_kick_processing", lambda *a, **k: None)

    h1 = _auth(client, "u1@example.com")
    h2 = _auth(client, "u2@example.com")

    r = client.post("/api/v1/pdfs", headers=h1, files={"files": ("a.pdf", _tiny_pdf_bytes(), "application/pdf")})
    pdf_id = r.json()[0]["id"]

    r = client.delete(f"/api/v1/pdfs/{pdf_id}", headers=h2)
    assert r.status_code == 404


def test_upload_rejects_non_pdf(client):
    headers = _auth(client)
    r = client.post(
        "/api/v1/pdfs",
        headers=headers,
        files={"files": ("a.txt", b"hello", "text/plain")},
    )
    assert r.status_code == 415
```

- [ ] **Step 6: Run tests**

```bash
pytest tests/test_pdfs.py -v
```
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas/pdf.py backend/app/services/pdf_service.py \
        backend/app/api/v1/pdfs.py backend/app/api/v1/__init__.py backend/tests/test_pdfs.py
git commit -m "feat(backend): PDF upload/list/delete endpoints + tests"
```

---

# Phase 4 — Chat (RAG + Streaming)

### Task 4.1: Chat schemas + LangChain chain

**Files:**
- Create: `backend/app/schemas/chat.py`
- Create: `backend/app/rag/chain.py`

- [ ] **Step 1: Create `backend/app/schemas/chat.py`**

```python
from datetime import datetime
from pydantic import BaseModel


class CreateSessionRequest(BaseModel):
    pdf_ids: list[str]
    title: str | None = None


class ChatSessionOut(BaseModel):
    id: str
    title: str
    pdf_ids: list[str]
    created_at: datetime
    updated_at: datetime


class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    citations: list[dict] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionDetail(ChatSessionOut):
    messages: list[ChatMessageOut]


class StreamRequest(BaseModel):
    session_id: str
    query: str
```

- [ ] **Step 2: Create `backend/app/rag/chain.py`**

```python
from typing import Iterable

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_openai import ChatOpenAI

from app.core.config import get_settings

SYSTEM_PROMPT = """You are a precise document Q&A assistant.
Answer ONLY using the provided context snippets.
If the answer is not in the context, say you don't have enough information.
When citing, reference snippets by their bracketed numbers like [1], [2].
Be concise."""


def build_chat_model() -> ChatOpenAI:
    s = get_settings()
    return ChatOpenAI(model=s.openai_chat_model, api_key=s.openai_api_key, streaming=True, temperature=0.2)


def format_context(snippets: list[dict]) -> str:
    lines = []
    for i, snip in enumerate(snippets, start=1):
        meta = snip["metadata"]
        lines.append(f"[{i}] ({meta['filename']} p.{meta['page']}) {snip['text']}")
    return "\n\n".join(lines)


def build_messages(
    history: list[dict],
    snippets: list[dict],
    user_query: str,
    history_window: int = 6,
) -> list:
    msgs: list = [SystemMessage(content=SYSTEM_PROMPT)]
    recent = history[-history_window:]
    for m in recent:
        if m["role"] == "user":
            msgs.append(HumanMessage(content=m["content"]))
        else:
            msgs.append(AIMessage(content=m["content"]))
    context_block = format_context(snippets) if snippets else "(no relevant context found)"
    msgs.append(HumanMessage(content=f"Context:\n{context_block}\n\nQuestion: {user_query}"))
    return msgs


def stream_response(model: ChatOpenAI, messages: list) -> Iterable[str]:
    for chunk in model.stream(messages):
        if chunk.content:
            yield chunk.content
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/chat.py backend/app/rag/chain.py
git commit -m "feat(backend): chat schemas and LangChain chat chain"
```

---

### Task 4.2: Chat service + SSE endpoint

**Files:**
- Create: `backend/app/services/chat_service.py`
- Create: `backend/app/api/v1/chat.py`
- Modify: `backend/app/api/v1/__init__.py`
- Test: `backend/tests/test_chat.py`

- [ ] **Step 1: Create `backend/app/services/chat_service.py`**

```python
import json
import logging
from typing import AsyncIterator, Iterator

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import ChatMessage, ChatSession, Pdf, SessionPdf
from app.rag import vectorstore
from app.rag.chain import build_chat_model, build_messages, stream_response
from app.rag.embedder import get_embedder

logger = logging.getLogger("app.chat")


def create_session(db: Session, user_id: str, pdf_ids: list[str], title: str | None) -> ChatSession:
    owned = db.query(Pdf.id).filter(Pdf.user_id == user_id, Pdf.id.in_(pdf_ids)).all()
    owned_ids = {row[0] for row in owned}
    if owned_ids != set(pdf_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="one or more PDFs not found")
    session = ChatSession(user_id=user_id, title=title or "New chat")
    db.add(session); db.flush()
    for pid in pdf_ids:
        db.add(SessionPdf(session_id=session.id, pdf_id=pid))
    db.commit(); db.refresh(session)
    return session


def list_sessions(db: Session, user_id: str) -> list[ChatSession]:
    return db.query(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.updated_at.desc()).all()


def get_session_with_messages(db: Session, user_id: str, session_id: str) -> tuple[ChatSession, list[str], list[ChatMessage]]:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="session not found")
    pdf_ids = [row[0] for row in db.query(SessionPdf.pdf_id).filter(SessionPdf.session_id == session_id).all()]
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at).all()
    return session, pdf_ids, messages


def stream_chat(
    db: Session,
    user_id: str,
    session_id: str,
    query: str,
    *,
    embedder=None,
    chat_model=None,
) -> Iterator[tuple[str, dict]]:
    """Yields (event_name, data_dict) tuples to be serialized as SSE."""
    session, pdf_ids, messages = get_session_with_messages(db, user_id, session_id)
    history = [{"role": m.role, "content": m.content} for m in messages]

    db.add(ChatMessage(session_id=session_id, role="user", content=query))
    db.commit()

    embedder = embedder or get_embedder()
    chat_model = chat_model or build_chat_model()

    query_emb = embedder.embed_query(query)
    snippets = vectorstore.query(user_id=user_id, pdf_ids=pdf_ids, query_embedding=query_emb, k=5) if pdf_ids else []

    msgs = build_messages(history, snippets, query)
    full_text_parts: list[str] = []
    try:
        for token in stream_response(chat_model, msgs):
            full_text_parts.append(token)
            yield "token", {"text": token}
    except Exception as exc:  # noqa: BLE001
        logger.exception("chat streaming failed")
        yield "error", {"detail": str(exc)[:300]}
        return

    full_text = "".join(full_text_parts)
    seen: set[tuple[str, int]] = set()
    citations: list[dict] = []
    for s in snippets:
        key = (s["metadata"]["pdf_id"], s["metadata"]["page"])
        if key in seen:
            continue
        seen.add(key)
        citations.append({
            "pdf_id": s["metadata"]["pdf_id"],
            "filename": s["metadata"]["filename"],
            "page": s["metadata"]["page"],
            "snippet": s["text"][:200],
        })

    db.add(ChatMessage(session_id=session_id, role="assistant", content=full_text, citations=citations))
    if not session.title or session.title == "New chat":
        session.title = query[:60]
    db.commit()

    yield "citations", {"citations": citations}
    yield "done", {}


def _sse_format(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def stream_chat_sse(db, user_id, session_id, query, *, embedder=None, chat_model=None) -> AsyncIterator[str]:
    async def _gen():
        for event, data in stream_chat(db, user_id, session_id, query, embedder=embedder, chat_model=chat_model):
            yield _sse_format(event, data)
    return _gen()
```

- [ ] **Step 2: Create `backend/app/api/v1/chat.py`**

```python
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.schemas.chat import (
    ChatMessageOut, ChatSessionDetail, ChatSessionOut, CreateSessionRequest, StreamRequest,
)
from app.services import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/sessions", response_model=ChatSessionOut)
def create_session(body: CreateSessionRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> ChatSessionOut:
    session = chat_service.create_session(db, user.id, body.pdf_ids, body.title)
    return ChatSessionOut(
        id=session.id, title=session.title, pdf_ids=body.pdf_ids,
        created_at=session.created_at, updated_at=session.updated_at,
    )


@router.get("/sessions", response_model=list[ChatSessionOut])
def list_sessions(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[ChatSessionOut]:
    sessions = chat_service.list_sessions(db, user.id)
    out = []
    for s in sessions:
        _, pdf_ids, _ = chat_service.get_session_with_messages(db, user.id, s.id)
        out.append(ChatSessionOut(id=s.id, title=s.title, pdf_ids=pdf_ids, created_at=s.created_at, updated_at=s.updated_at))
    return out


@router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
def get_session(session_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> ChatSessionDetail:
    session, pdf_ids, messages = chat_service.get_session_with_messages(db, user.id, session_id)
    return ChatSessionDetail(
        id=session.id, title=session.title, pdf_ids=pdf_ids,
        created_at=session.created_at, updated_at=session.updated_at,
        messages=[ChatMessageOut.model_validate(m) for m in messages],
    )


@router.post("/stream")
async def stream(body: StreamRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    gen = chat_service.stream_chat_sse(db, user.id, body.session_id, body.query)
    return StreamingResponse(
        gen,
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

- [ ] **Step 3: Register chat router in `backend/app/api/v1/__init__.py`**

```python
from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.api.v1.pdfs import router as pdfs_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(pdfs_router)
api_router.include_router(chat_router)
```

- [ ] **Step 4: Create `backend/tests/test_chat.py`** with fake embedder + fake LLM

```python
import io
import json

import pytest
from sqlalchemy import select

from app.db.models import Pdf
from app.services import chat_service


class FakeEmbedder:
    def embed_documents(self, texts): return [[0.1, 0.2, 0.3] for _ in texts]
    def embed_query(self, text): return [0.1, 0.2, 0.3]


class FakeChatModel:
    def stream(self, messages):
        class Chunk:
            def __init__(self, c): self.content = c
        for piece in ["The ", "answer ", "is ", "42."]:
            yield Chunk(piece)


def _auth(client, email="u@example.com"):
    r = client.post("/api/v1/auth/signup", json={"email": email, "password": "hunter22"})
    return r.json()["access_token"], r.json()["user"]["id"]


def _ready_pdf(db, user_id) -> str:
    p = Pdf(user_id=user_id, filename="a.pdf", storage_path="/tmp/x.pdf", status="ready", size_bytes=10, page_count=1, chunk_count=1)
    db.add(p); db.commit(); db.refresh(p)
    return p.id


def test_create_session_and_stream(client, db_session, monkeypatch):
    token, user_id = _auth(client)
    pdf_id = _ready_pdf(db_session, user_id)

    # Force chat_service.stream_chat to use fakes
    real_stream = chat_service.stream_chat
    def _patched(db, uid, sid, query, **_):
        return real_stream(db, uid, sid, query, embedder=FakeEmbedder(), chat_model=FakeChatModel())
    monkeypatch.setattr(chat_service, "stream_chat", _patched)

    # Stub vectorstore.query so we don't need real Chroma
    from app.rag import vectorstore as vs
    monkeypatch.setattr(vs, "query", lambda **kwargs: [
        {"id": "x:0", "text": "The answer to life is 42.", "metadata": {"pdf_id": pdf_id, "filename": "a.pdf", "page": 1, "chunk_idx": 0}, "score": 0.1}
    ])

    r = client.post("/api/v1/chat/sessions", json={"pdf_ids": [pdf_id]}, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    sid = r.json()["id"]

    with client.stream("POST", "/api/v1/chat/stream", json={"session_id": sid, "query": "what is the answer?"}, headers={"Authorization": f"Bearer {token}"}) as resp:
        assert resp.status_code == 200
        events = list(resp.iter_lines())

    text = "\n".join(events)
    assert "event: token" in text
    assert "event: citations" in text
    assert "event: done" in text
    assert "42" in text
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_chat.py -v
```

- [ ] **Step 6: Manual smoke (optional, uses real OpenAI)**

Skip in CI / when API key absent.

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/chat_service.py backend/app/api/v1/chat.py backend/app/api/v1/__init__.py backend/tests/test_chat.py
git commit -m "feat(backend): chat sessions + SSE streaming chat endpoint"
```

---

# Phase 5 — Frontend Foundation

### Task 5.1: Routing + protected routes + auth store

**Files:**
- Create: `frontend/src/store/authStore.ts`
- Create: `frontend/src/store/uiStore.ts`
- Create: `frontend/src/services/api.ts`
- Create: `frontend/src/services/auth.ts`
- Create: `frontend/src/hooks/useDarkMode.ts`
- Create: `frontend/src/types/api.ts`
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/AppPage.tsx`
- Create: `frontend/src/components/ui/Button.tsx`
- Create: `frontend/src/components/ui/Input.tsx`
- Create: `frontend/src/components/ui/Card.tsx`
- Create: `frontend/src/lib/cn.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `frontend/src/types/api.ts`**

```ts
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
```

- [ ] **Step 2: Create `frontend/src/lib/cn.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create `frontend/src/store/authStore.ts`**

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/api";

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: "pdf-chat-auth" },
  ),
);
```

- [ ] **Step 4: Create `frontend/src/store/uiStore.ts`**

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  darkMode: boolean;
  uploadOpen: boolean;
  toggleDarkMode: () => void;
  setUploadOpen: (v: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      darkMode: typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches,
      uploadOpen: false,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setUploadOpen: (v) => set({ uploadOpen: v }),
    }),
    { name: "pdf-chat-ui" },
  ),
);
```

- [ ] **Step 5: Create `frontend/src/services/api.ts`**

```ts
import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) useAuthStore.getState().logout();
    return Promise.reject(err);
  },
);

export const apiBaseUrl = baseURL;
```

- [ ] **Step 6: Create `frontend/src/services/auth.ts`**

```ts
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { AuthResponse, User } from "@/types/api";
import { useAuthStore } from "@/store/authStore";

export const useSignup = () =>
  useMutation({
    mutationFn: async (vars: { email: string; password: string }) =>
      (await api.post<AuthResponse>("/auth/signup", vars)).data,
    onSuccess: (data) => useAuthStore.getState().setAuth(data.access_token, data.user),
  });

export const useLogin = () =>
  useMutation({
    mutationFn: async (vars: { email: string; password: string }) =>
      (await api.post<AuthResponse>("/auth/login", vars)).data,
    onSuccess: (data) => useAuthStore.getState().setAuth(data.access_token, data.user),
  });

export const useMe = () =>
  useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<User>("/auth/me")).data,
    enabled: !!useAuthStore.getState().token,
  });
```

- [ ] **Step 7: Create `frontend/src/hooks/useDarkMode.ts`**

```ts
import { useEffect } from "react";
import { useUiStore } from "@/store/uiStore";

export function useDarkMode() {
  const dark = useUiStore((s) => s.darkMode);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
}
```

- [ ] **Step 8: Create UI primitives**

`frontend/src/components/ui/Button.tsx`:

```tsx
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant }

const styles: Record<Variant, string> = {
  primary: "bg-brand text-brand-fg hover:opacity-90",
  secondary: "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700",
  ghost: "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

export const Button = forwardRef<HTMLButtonElement, Props>(({ variant = "primary", className, ...rest }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      styles[variant], className,
    )}
    {...rest}
  />
));
Button.displayName = "Button";
```

`frontend/src/components/ui/Input.tsx`:

```tsx
import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...rest }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900",
      "px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand",
      className,
    )}
    {...rest}
  />
));
Input.displayName = "Input";
```

`frontend/src/components/ui/Card.tsx`:

```tsx
import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm",
        className,
      )}
      {...rest}
    />
  );
}
```

- [ ] **Step 9: Create `frontend/src/pages/LoginPage.tsx`**

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLogin, useSignup } from "@/services/auth";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const signup = useSignup();
  const navigate = useNavigate();

  const isSubmitting = login.isPending || signup.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (mode === "login") await login.mutateAsync({ email, password });
      else await signup.mutateAsync({ email, password });
      navigate("/");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Something went wrong");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-2xl font-semibold">{mode === "login" ? "Welcome back" : "Create account"}</h1>
        <p className="text-sm text-slate-500 mt-1">AI PDF Chat</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Working..." : mode === "login" ? "Log in" : "Sign up"}
          </Button>
        </form>
        <button
          className="mt-4 text-sm text-brand hover:underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
        </button>
      </Card>
    </div>
  );
}
```

- [ ] **Step 10: Create placeholder `frontend/src/pages/AppPage.tsx`** (real version in Phase 6)

```tsx
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";

export default function AppPage() {
  const { user, logout } = useAuthStore();
  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Hello, {user?.email}</h1>
        <Button variant="ghost" onClick={logout}>Log out</Button>
      </div>
      <p className="mt-4 text-slate-500">Chat UI coming in Phase 6…</p>
    </div>
  );
}
```

- [ ] **Step 11: Replace `frontend/src/App.tsx`**

```tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import LoginPage from "@/pages/LoginPage";
import AppPage from "@/pages/AppPage";
import { useAuthStore } from "@/store/authStore";
import { useDarkMode } from "@/hooks/useDarkMode";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  useDarkMode();
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Protected><AppPage /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 12: Verify dev server works end-to-end against backend**

Start backend in one terminal:
```bash
cd backend && source .venv/bin/activate
export $(grep -v '^#' .env | xargs)  # if .env populated; otherwise export individually
uvicorn app.main:app --reload --port 8000
```
Start frontend in another:
```bash
cd frontend && npm run dev
```
Open http://localhost:5173, sign up with `test@example.com` / `password123`, expect redirect to `/`.

- [ ] **Step 13: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): auth flow with routing, stores, dark mode, UI primitives"
```

---

# Phase 6 — Frontend Chat UI

### Task 6.1: App layout shell + sidebar

**Files:**
- Create: `frontend/src/layouts/AppLayout.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/pdf/PdfList.tsx`
- Create: `frontend/src/services/pdfs.ts`
- Create: `frontend/src/services/chat.ts`

- [ ] **Step 1: Create `frontend/src/services/pdfs.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Pdf } from "@/types/api";

export const usePdfs = (refetchMs = 4000) =>
  useQuery({
    queryKey: ["pdfs"],
    queryFn: async () => (await api.get<Pdf[]>("/pdfs")).data,
    refetchInterval: (q) => {
      const data = q.state.data;
      return data?.some((p) => p.status === "processing") ? refetchMs : false;
    },
  });

export const useUploadPdfs = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]) => {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      return (await api.post<Pdf[]>("/pdfs", fd, { headers: { "Content-Type": "multipart/form-data" } })).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pdfs"] }),
  });
};

export const useDeletePdf = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/pdfs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pdfs"] }),
  });
};
```

- [ ] **Step 2: Create `frontend/src/services/chat.ts`**

```ts
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

export async function* streamChat(sessionId: string, query: string): AsyncGenerator<{ event: string; data: any }> {
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
```

- [ ] **Step 3: Create `frontend/src/components/pdf/PdfList.tsx`**

```tsx
import { FileText, Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDeletePdf, usePdfs } from "@/services/pdfs";
import { cn } from "@/lib/cn";

export function PdfList({
  selectedIds, onToggle,
}: { selectedIds: string[]; onToggle: (id: string) => void }) {
  const { data: pdfs = [], isLoading } = usePdfs();
  const del = useDeletePdf();

  if (isLoading) return <div className="text-xs text-slate-500 px-3">Loading…</div>;
  if (pdfs.length === 0)
    return <div className="text-xs text-slate-500 px-3 py-2">No PDFs yet. Upload one to get started.</div>;

  return (
    <ul className="space-y-1">
      {pdfs.map((p) => {
        const selected = selectedIds.includes(p.id);
        return (
          <li
            key={p.id}
            className={cn(
              "group flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer",
              "hover:bg-slate-100 dark:hover:bg-slate-800",
              selected && "bg-slate-100 dark:bg-slate-800",
            )}
            onClick={() => p.status === "ready" && onToggle(p.id)}
            title={p.status === "ready" ? "Click to toggle" : p.status === "failed" ? p.error ?? "failed" : "Processing"}
          >
            <FileText className="size-4 shrink-0 text-slate-400" />
            <span className="flex-1 truncate">{p.filename}</span>
            {p.status === "processing" && <Loader2 className="size-3.5 animate-spin text-amber-500" />}
            {p.status === "ready" && <CheckCircle2 className={cn("size-3.5", selected ? "text-brand" : "text-emerald-500")} />}
            {p.status === "failed" && <AlertCircle className="size-3.5 text-red-500" />}
            <button
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete ${p.filename}?`)) {
                  del.mutate(p.id, { onSuccess: () => toast.success("Deleted") });
                }
              }}
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Create `frontend/src/components/layout/Sidebar.tsx`**

```tsx
import { Plus, Upload, Moon, Sun, LogOut } from "lucide-react";
import { useSessions } from "@/services/chat";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { PdfList } from "@/components/pdf/PdfList";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface SidebarProps {
  activeSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  selectedPdfIds: string[];
  onTogglePdf: (id: string) => void;
}

export function Sidebar({ activeSessionId, onSelectSession, selectedPdfIds, onTogglePdf }: SidebarProps) {
  const { data: sessions = [] } = useSessions();
  const { user, logout } = useAuthStore();
  const { darkMode, toggleDarkMode, setUploadOpen } = useUiStore();

  return (
    <aside className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen">
      <div className="p-3">
        <Button className="w-full justify-start gap-2" onClick={() => onSelectSession(null)}>
          <Plus className="size-4" /> New chat
        </Button>
      </div>

      <div className="px-3 pt-2 pb-1 text-xs uppercase tracking-wide text-slate-500">Recent chats</div>
      <ul className="px-2 space-y-0.5 max-h-48 overflow-y-auto">
        {sessions.map((s) => (
          <li
            key={s.id}
            className={cn(
              "px-2 py-1.5 rounded-lg text-sm truncate cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800",
              activeSessionId === s.id && "bg-slate-100 dark:bg-slate-800",
            )}
            onClick={() => onSelectSession(s.id)}
          >
            {s.title}
          </li>
        ))}
        {sessions.length === 0 && (
          <li className="px-2 py-1.5 text-xs text-slate-500">No chats yet.</li>
        )}
      </ul>

      <div className="mt-3 px-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-slate-500">My PDFs</span>
        <button className="text-xs text-brand hover:underline inline-flex items-center gap-1" onClick={() => setUploadOpen(true)}>
          <Upload className="size-3" /> Upload
        </button>
      </div>
      <div className="px-1 flex-1 overflow-y-auto">
        <PdfList selectedIds={selectedPdfIds} onToggle={onTogglePdf} />
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between">
        <span className="text-xs text-slate-500 truncate">{user?.email}</span>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" onClick={toggleDarkMode} title="Toggle theme">
            {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" onClick={logout} title="Log out">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 5: Create `frontend/src/layouts/AppLayout.tsx`**

```tsx
import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";

interface Props {
  activeSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  selectedPdfIds: string[];
  onTogglePdf: (id: string) => void;
  children: ReactNode;
}

export function AppLayout(props: Props) {
  return (
    <div className="flex h-screen">
      <Sidebar
        activeSessionId={props.activeSessionId}
        onSelectSession={props.onSelectSession}
        selectedPdfIds={props.selectedPdfIds}
        onTogglePdf={props.onTogglePdf}
      />
      <main className="flex-1 flex flex-col min-w-0">{props.children}</main>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/pdfs.ts frontend/src/services/chat.ts \
        frontend/src/components/pdf frontend/src/components/layout frontend/src/layouts
git commit -m "feat(frontend): app layout shell, sidebar, PDF list, chat/pdfs query hooks"
```

---

### Task 6.2: Upload modal

**Files:**
- Create: `frontend/src/components/pdf/UploadModal.tsx`

- [ ] **Step 1: Create `frontend/src/components/pdf/UploadModal.tsx`**

```tsx
import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useUiStore } from "@/store/uiStore";
import { useUploadPdfs } from "@/services/pdfs";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function UploadModal() {
  const { uploadOpen, setUploadOpen } = useUiStore();
  const upload = useUploadPdfs();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!uploadOpen) return null;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files).filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (list.length === 0) {
      toast.error("Only PDFs are accepted");
      return;
    }
    try {
      await upload.mutateAsync(list);
      toast.success(`${list.length} file${list.length === 1 ? "" : "s"} queued`);
      setUploadOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Upload failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setUploadOpen(false)}>
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload PDFs</h2>
          <button onClick={() => setUploadOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="size-5" /></button>
        </div>

        <div
          className={cn(
            "mt-4 border-2 border-dashed rounded-2xl p-8 text-center transition-colors",
            dragging ? "border-brand bg-brand/5" : "border-slate-300 dark:border-slate-700",
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        >
          <Upload className="size-8 mx-auto text-slate-400" />
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Drag PDFs here, or</p>
          <Button variant="secondary" className="mt-2" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? "Uploading…" : "Browse files"}
          </Button>
          <input ref={inputRef} type="file" accept="application/pdf" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
          <p className="mt-3 text-xs text-slate-500">Max 20 MB each</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/pdf/UploadModal.tsx
git commit -m "feat(frontend): upload modal with drag-and-drop"
```

---

### Task 6.3: Chat surface (messages, composer, streaming, citations)

**Files:**
- Create: `frontend/src/components/chat/MessageBubble.tsx`
- Create: `frontend/src/components/chat/CitationChip.tsx`
- Create: `frontend/src/components/chat/TypingIndicator.tsx`
- Create: `frontend/src/components/chat/SuggestedQuestions.tsx`
- Create: `frontend/src/components/chat/Composer.tsx`
- Create: `frontend/src/components/chat/ChatSurface.tsx`
- Create: `frontend/src/hooks/useChatStream.ts`
- Modify: `frontend/src/pages/AppPage.tsx`

- [ ] **Step 1: Create `frontend/src/hooks/useChatStream.ts`**

```ts
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
        if (ev.event === "token") setStreaming((s) => s && ({ ...s, text: s.text + (ev.data.text ?? "") }));
        else if (ev.event === "citations") setStreaming((s) => s && ({ ...s, citations: ev.data.citations ?? [] }));
        else if (ev.event === "error") throw new Error(ev.data.detail ?? "stream error");
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
```

- [ ] **Step 2: Create `frontend/src/components/chat/CitationChip.tsx`**

```tsx
import { useState } from "react";
import type { Citation } from "@/types/api";
import { cn } from "@/lib/cn";

export function CitationChip({ idx, citation }: { idx: number; citation: Citation }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md text-xs font-medium",
          "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
          "hover:bg-brand hover:text-white transition-colors",
        )}
        title={`${citation.filename} (p.${citation.page})`}
      >
        {idx}
      </button>
      {open && (
        <div className="absolute z-20 left-0 top-7 w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-lg text-xs">
          <div className="font-medium truncate">{citation.filename}</div>
          <div className="text-slate-500">Page {citation.page}</div>
          <p className="mt-1 text-slate-700 dark:text-slate-300 line-clamp-6">{citation.snippet}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/components/chat/MessageBubble.tsx`**

```tsx
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
```

- [ ] **Step 4: Create `frontend/src/components/chat/TypingIndicator.tsx`**

```tsx
export function TypingIndicator() {
  return (
    <div className="flex w-full mb-4 justify-start">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
        <div className="flex gap-1">
          <span className="size-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="size-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="size-2 rounded-full bg-slate-400 animate-bounce" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/src/components/chat/SuggestedQuestions.tsx`**

```tsx
const SUGGESTIONS = [
  "Summarize this document in 3 bullet points.",
  "What are the key findings?",
  "List the action items mentioned.",
];

export function SuggestedQuestions({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="grid sm:grid-cols-3 gap-2 mt-6">
      {SUGGESTIONS.map((q) => (
        <button
          key={q}
          onClick={() => onPick(q)}
          className="text-left text-sm rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create `frontend/src/components/chat/Composer.tsx`**

```tsx
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
```

- [ ] **Step 7: Create `frontend/src/components/chat/ChatSurface.tsx`**

```tsx
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
    } catch (err: any) {
      toast.error(err?.message ?? "Chat failed");
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
```

- [ ] **Step 8: Replace `frontend/src/pages/AppPage.tsx`**

```tsx
import { useState } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { ChatSurface } from "@/components/chat/ChatSurface";
import { UploadModal } from "@/components/pdf/UploadModal";

export default function AppPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedPdfIds, setSelectedPdfIds] = useState<string[]>([]);

  return (
    <>
      <AppLayout
        activeSessionId={activeSessionId}
        onSelectSession={(id) => { setActiveSessionId(id); if (id === null) setSelectedPdfIds([]); }}
        selectedPdfIds={selectedPdfIds}
        onTogglePdf={(id) => setSelectedPdfIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
      >
        <ChatSurface
          sessionId={activeSessionId}
          selectedPdfIds={selectedPdfIds}
          onSessionCreated={setActiveSessionId}
        />
      </AppLayout>
      <UploadModal />
    </>
  );
}
```

- [ ] **Step 9: End-to-end manual verification (golden path)**

With both servers running and a real OpenAI key set:

1. Sign up → land on app shell.
2. Click "Upload" → drop a small PDF (1-2 pages) → see processing pill → flips to ready.
3. Click the PDF row to select (chip turns brand color).
4. Send "What is this document about?" → typing indicator → tokens stream → citation chips appear.
5. Hover a citation chip → snippet popover.
6. Refresh page → session and messages persist; click recent chat to reopen.
7. Toggle dark mode → applies and persists across refresh.
8. Log out → cannot return to `/`.

- [ ] **Step 10: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): chat surface with streaming, citations, suggestions, typing indicator"
```

---

# Phase 7 — Polish: Docker, README

### Task 7.1: Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

- [ ] **Step 1: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir -e .

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

- [ ] **Step 2: Create `backend/.dockerignore`**

```
.venv
__pycache__
*.pyc
.pytest_cache
tests
uploads
chroma
app.db
.env
```

---

### Task 7.2: Frontend Dockerfile

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/.dockerignore`

- [ ] **Step 1: Create `frontend/Dockerfile`** (dev image for compose)

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

- [ ] **Step 2: Create `frontend/.dockerignore`**

```
node_modules
dist
.vite
.env
```

---

### Task 7.3: docker-compose.yml

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      JWT_SECRET: ${JWT_SECRET:-change-me-in-prod}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      OPENAI_CHAT_MODEL: ${OPENAI_CHAT_MODEL:-gpt-4o-mini}
      OPENAI_EMBED_MODEL: ${OPENAI_EMBED_MODEL:-text-embedding-3-small}
      DATABASE_URL: sqlite:///./app.db
      CHROMA_DIR: ./chroma
      UPLOAD_DIR: ./uploads
      CORS_ORIGINS: http://localhost:5173
    volumes:
      - backend_data:/app/uploads
      - backend_chroma:/app/chroma
      - backend_db:/app/db
    healthcheck:
      test: ["CMD", "curl", "-fs", "http://localhost:8000/healthz"]
      interval: 5s
      timeout: 3s
      retries: 10

  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    environment:
      VITE_API_BASE_URL: http://localhost:8000/api/v1
    depends_on:
      backend:
        condition: service_healthy

volumes:
  backend_data:
  backend_chroma:
  backend_db:
```

- [ ] **Step 2: Verify**

```bash
docker compose config
```
Expected: parses without errors. Skip `docker compose up` here if Docker not available; manual run is in README.

- [ ] **Step 3: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore frontend/Dockerfile frontend/.dockerignore docker-compose.yml
git commit -m "feat: Docker setup for backend + frontend with compose"
```

---

### Task 7.4: README + .env.example at root

**Files:**
- Create: `README.md`
- Create: `.env.example`

- [ ] **Step 1: Create root `.env.example`**

```
# Root-level .env.example for docker-compose
JWT_SECRET=change-me-in-prod
OPENAI_API_KEY=sk-replace-me
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small
```

- [ ] **Step 2: Create `README.md`**

````markdown
# AI PDF Chat

A production-quality RAG chat app: upload PDFs, ask questions, get streamed answers with citations. Built with FastAPI, LangChain, ChromaDB, and React.

![screenshot placeholder](docs/screenshots/chat.png)

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind + Zustand + TanStack Query |
| Backend | FastAPI + SQLAlchemy + SQLite + Alembic |
| Vector DB | ChromaDB (persistent) |
| LLM | OpenAI `gpt-4o-mini` (streamed via SSE) |
| Embeddings | OpenAI `text-embedding-3-small` |
| RAG | LangChain `RecursiveCharacterTextSplitter` + Chroma similarity search |

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

See `docs/superpowers/specs/2026-05-19-ai-pdf-chat-design.md` for the full design.

## Quick start (Docker)

```bash
cp .env.example .env  # then set OPENAI_API_KEY
docker compose up --build
```

Open http://localhost:5173.

## Quick start (local dev)

Backend:
```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env  # then set OPENAI_API_KEY
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Frontend:
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
| `JWT_EXPIRES_MIN` | `60` | Token expiry |
| `CORS_ORIGINS` | `http://localhost:5173` | CSV of allowed origins |

### Frontend (`frontend/.env`)
| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Backend base URL |

## API surface

All routes under `/api/v1`. Auth via `Authorization: Bearer <jwt>`.

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
POST   /chat/stream          {session_id, query}   → SSE: token, citations, done
```

Interactive docs: http://localhost:8000/docs

## What I'd add next

- Postgres + Alembic migrations for prod
- Citation highlighting inside an embedded PDF preview
- Per-user rate limiting (slowapi) and OpenAI usage tracking
- Conversation summarization memory for long chats
- Move PDF processing from FastAPI BackgroundTasks to Celery/RQ
- Frontend unit tests (Vitest + React Testing Library)

## License

MIT
````

- [ ] **Step 3: Commit**

```bash
git add README.md .env.example
git commit -m "docs: README with quick-start, architecture, env reference"
```

---

## Final Verification Checklist

- [ ] `cd backend && pytest -v` → all tests pass
- [ ] `docker compose up --build` boots both services
- [ ] Golden-path manual flow (sign up → upload → chat → citations) works in browser
- [ ] Dark mode toggle persists
- [ ] Logging out clears auth and redirects to /login
- [ ] `git push` succeeds (already verified)

---

## Self-Review Notes

**Spec coverage check (against design doc sections):**

- Auth (signup/login/me, JWT) → Phase 2 ✓
- PDF upload + processing → Phase 3 ✓
- RAG pipeline (load/chunk/embed/store/retrieve/inject/stream) → Phase 3 + 4 ✓
- Chat with streaming + multi-doc retrieval → Phase 4 + 6 ✓
- SSE wire format (token/citations/done) → Task 4.2 (chat_service._sse_format) ✓
- Citation chips, typing indicator, suggested questions → Phase 6 ✓
- Sidebar with recent chats + PDF list + status pills → Phase 6 ✓
- Dark mode + localStorage persistence → Phase 5 (useDarkMode + zustand persist) ✓
- Docker + compose + README + .env.example → Phase 7 ✓
- pytest backend smoke tests (auth, pdfs, chat) → Phases 2, 3, 4 ✓
- Manual frontend verification → Task 6.3 Step 9 ✓

**Type consistency:** `Pdf`, `ChatSession`, `Citation`, `ChatMessage`, `AuthResponse` consistent across backend Pydantic schemas, frontend types, and React Query hooks.

**Placeholders:** none — every step contains real content.

**Scope:** large but cohesive single MVP, organized into 7 phases each with its own checkpoint.
