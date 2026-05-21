# Atlas — Interview Q&A Prep

Questions a Gen-AI engineer interviewer is likely to ask about this project, with project-specific answers. The goal is not to have memorized talking points — it is to be able to talk through the real reasoning, trade-offs, and stumbles that show you actually built the thing.

---

## Category A — RAG Fundamentals

### **_"Walk me through your RAG pipeline end to end."_** *(common ask)*

The pipeline starts the moment a user uploads a PDF. The `POST /pdfs` endpoint validates the file type and size, writes the bytes to `./uploads/{user_id}/{pdf_id}.pdf`, creates a `pdfs` row with `status='processing'`, and enqueues `process_pdf` via FastAPI's `BackgroundTasks`. From there, `backend/app/rag/pipeline.py` runs the full ingestion.

First, `loader.py` calls `pypdf`'s `PdfReader` and iterates page by page, extracting text and returning a list of `(page_number, text)` tuples. Pages with no extractable text — image-only pages, blank pages — are skipped silently. Keeping page numbers in the tuples at this stage is critical: they flow through chunking and end up as metadata on each Chroma document, which is how citation page numbers are accurate later.

Second, `chunker.py` runs each page's text through `RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)`. The splitter returns a list of `Chunk` dataclasses — `text`, `page`, `chunk_idx`. Third, `pipeline.py` calls `embedder.embed_documents` in batches of 100 to produce the float vectors. Fourth, `vectorstore.upsert_chunks` writes all documents with their embeddings and metadata (`user_id`, `pdf_id`, `filename`, `page`, `chunk_idx`) to the `pdf_chunks` Chroma collection. On success the row flips to `status='ready'`; any exception flips it to `status='failed'` with the error message.

At query time, `chat_service.stream_chat` embeds the user's question using the same embedder, calls `vectorstore.query` with a filter on `user_id` AND `pdf_id IN [selected_ids]` to get top-5 chunks, formats them as numbered context snippets, prepends the last 6 history messages and a system instruction, calls `model.stream()`, and yields tokens as SSE events. After the generator exhausts, it persists the full answer and citations to `chat_messages` and emits the `citations` and `done` events.

---

### **"Why these chunk-size and overlap values?"**

The values — 1000 characters chunk size, 200 character overlap — are intentional but not particularly novel. The reasoning is: 1000 characters is roughly 150–200 words, which is enough to express a complete thought (a paragraph or a logical subsection) without running so long that a lot of irrelevant text dilutes the semantic signal in the embedding. With `gemini-embedding-001` producing 3072-dimensional vectors, the embedding can carry a lot of information, but the quality still degrades as chunks get longer because the embedding has to represent more competing ideas.

The 200-character overlap prevents the case where a sentence or key phrase straddles a chunk boundary and ends up on both sides as an incomplete fragment. At 20% of the chunk size, this is a standard ratio for business documents.

What I would change: the right values depend heavily on the document type. Dense technical papers with long equations or code listings need smaller chunks so the embedding isn't dominated by noise. Books with long narrative paragraphs might benefit from larger chunks to preserve context. A production system would expose these as configurable parameters per-document or per-collection, potentially with an automated sweep in the eval harness to find the optimal values for a given corpus.

**Follow-up the interviewer might press on:** "How would you determine the optimal chunk size for a new document type?" — the honest answer is to run `eval_rag.py` with varying `--top-k` and different chunk configurations over a representative sample of documents, measuring retrieval hit rate.

---

### **"How do you prevent hallucination? Show me the prompt."**

The system prompt in `backend/app/rag/chain.py` is:

```
You are a precise document Q&A assistant.
Answer ONLY using the provided context snippets.
If the answer is not in the context, say you don't have enough information.
When citing, reference snippets by their bracketed numbers like [1], [2].
Be concise.
```

The instruction "Answer ONLY using the provided context snippets" is the primary hallucination guardrail. It works because well-aligned instruction-following models like Llama 3.3 70B and GPT-4o-mini tend to respect this instruction when context is provided — they won't fabricate details that don't appear in the numbered snippets. The fallback phrase "say you don't have enough information" gives the model an explicit out for cases where the retrieved context doesn't contain the answer, rather than leaving it to invent a plausible-sounding response.

The retrieval filter on `user_id` and `pdf_id` prevents a different kind of hallucination: the model answering from training data about a topic that happens to share a name with the user's document. By injecting only chunks from the selected PDFs, the context block is strictly grounded in the user's material.

What this doesn't protect against: if the top-5 chunks are semantically similar to the query but factually irrelevant, the model may produce a plausible-sounding but wrong answer. That is the deeper hallucination problem, and it requires evaluating faithfulness (does the answer follow from the context?) rather than just grounding (was context provided?). The eval harness measures keyword coverage as a crude proxy, but it is not sufficient for high-stakes use cases.

---

### **_"How do you know your retrieval works? What's your eval methodology?"_** *(common ask)*

There is a retrieval evaluation harness at `backend/scripts/eval_rag.py`. It takes a PDF and a JSON file of test cases, each with a `question`, `expected_pages`, and optionally `expected_keywords`. It runs the real loader and chunker on the PDF, embeds all chunks using the configured embedder, then for each test question: embeds the question, computes cosine similarity in numpy against all chunk embeddings (without writing to or reading from the production Chroma store), ranks the chunks, and checks whether any of the top-k retrieved chunks comes from an expected page.

The primary metric is retrieval hit rate: what fraction of queries had at least one expected page in the top-k. A secondary metric is answer keyword coverage when running with LLM evaluation enabled. Both metrics are output as a markdown table.

To be honest about the limitations: this is not LLM-as-judge, it does not compute semantic similarity scores (RAGAS, BERTScore), and it does not verify that the answer is actually correct — only that expected keywords appear. A model could technically satisfy keyword coverage by including those words in an otherwise wrong sentence. The harness demonstrates that I understand the retrieval evaluation problem and built tooling for it; it is not a complete answer quality measurement system.

**Follow-up:** "What would a more rigorous eval look like?" — I would add an LLM judge step that scores faithfulness (does the answer follow from the context only?) and relevance (does it address the question?) on a 1–5 scale, build a golden dataset of 30–50 question/answer pairs verified against known source pages, and run the full eval as part of CI on any change to the chunking, embedding, or retrieval parameters.

---

### **"When would you add re-ranking? What model would you use?"**

The current system retrieves top-5 by cosine similarity on a single embedding. This is a bi-encoder setup: query and document are embedded independently, and similarity is computed as a dot product. Bi-encoders are fast (pre-computed document embeddings, single query embed at runtime) but sacrifice some precision because the query and document never "see" each other during encoding.

Re-ranking would be worth adding once there is evidence that the retrieved chunks are frequently off-target — either from the eval harness showing poor hit rate, or from users complaining that citations don't match their questions. It works as a second pass: retrieve top-20 by cosine similarity (fast, cheap), then score all 20 query-document pairs jointly with a cross-encoder and re-rank them, taking the top-5 from the re-ranked list.

The model I would reach for first is `cross-encoder/ms-marco-MiniLM-L-6-v2` from Sentence Transformers — it is small (22M parameters), fast on CPU, and performs well on passage reranking tasks. It would run locally without additional API cost. Cohere Rerank is the hosted alternative if you want zero ops overhead and don't mind the API cost.

In the Atlas codebase, the re-ranking step would slot in between `vectorstore.query` and `build_messages` in `chat_service.py`, with no other changes required.

---

### **"Why a vector database instead of full-text search?"**

Full-text search (BM25, Elasticsearch, SQLite FTS) matches on keyword overlap. If the document says "myocardial infarction" and the user asks "what happened to his heart," a keyword search returns nothing — there is no term overlap. A vector search embeds both phrases into the same semantic space and recognizes they refer to the same concept.

For document Q&A, this semantic gap between how users phrase questions and how authors phrase answers is the common case. People ask in natural language and expect the system to find the right passage even when the vocabulary doesn't match. That is exactly what dense retrieval with sentence embeddings is designed for.

The practical trade-off is cost and infrastructure: vector search requires embedding every document chunk upfront (API cost and latency), storing float vectors (storage cost), and running approximate nearest-neighbor search at query time. Full-text search is free, fast, and already available in most SQL databases. For many applications, a hybrid approach — BM25 for recall, reranking with a cross-encoder for precision — outperforms pure dense retrieval. Atlas uses only dense retrieval for the MVP; hybrid would be the next improvement.

---

## Category B — System Design / Scale

### **_"What breaks first at 10× scale? At 100×?"_** *(common ask)*

At 10× (say 1,000 concurrent users), the first failure is PDF processing. FastAPI's `BackgroundTasks` runs the embedding pipeline in the same process as the HTTP server. Each `process_pdf` call makes multiple batched calls to the Gemini Embeddings API, each of which takes 0.5–2 seconds per batch. With many concurrent uploads, these tasks accumulate in memory and compete for the same worker slots as incoming HTTP requests. The fix is a proper job queue — Celery with Redis — where `process_pdf` becomes a Celery task and the API worker just enqueues it and returns. This is documented in the README as the top priority addition.

The second failure at 10× is SQLite's write lock. SQLite supports concurrent reads well but serializes writes. Under concurrent chat requests, each of which writes `chat_messages` rows, the write lock contention becomes noticeable. The migration to Postgres is a `DATABASE_URL` change; the SQLAlchemy models require no modification.

At 100× (10,000+ users, potentially millions of documents), Chroma's embedded single-process architecture becomes the bottleneck. It runs in-process with the FastAPI application, which means it cannot be scaled horizontally by adding more API instances — each instance would have its own Chroma state. The migration path is Qdrant (self-hosted cluster) or pgvector (if already on Postgres). Additionally, local disk storage for uploaded PDFs cannot be shared across multiple API instances; S3-compatible object storage replaces `./uploads`.

---

### **"How would you move PDF processing off FastAPI's BackgroundTasks?"**

The `process_pdf` function in `backend/app/rag/pipeline.py` already has the right shape: it takes `db`, `pdf_id`, and `embedder` as parameters and has no HTTP concerns — no `Request`, no `Response`, no FastAPI dependencies. That makes it queue-ready with minimal changes.

The migration would be:
1. Add Celery to `pyproject.toml` and create a `backend/app/worker.py` that initializes a `Celery` app pointing at a Redis broker.
2. Decorate `process_pdf` as a `@celery.task`.
3. In `pdf_service.py`, replace `background_tasks.add_task(process_pdf, ...)` with `process_pdf.delay(pdf_id)`.
4. Run a separate `celery worker` process alongside the API server.
5. Add a Redis service to `docker-compose.yml`.

With Celery you get automatic retries on failure, task status visibility (which you'd surface in the `pdfs.status` field via a Celery result backend), worker autoscaling, and separation of the compute-heavy embedding work from the latency-sensitive HTTP layer.

---

### **"Walk me through your data model. Why those tables, and what changes for Postgres?"**

The model is in `backend/app/db/models.py`. Five tables: `users`, `pdfs`, `chat_sessions`, `chat_messages`, and `session_pdfs`.

`users` and `pdfs` are straightforward ownership tables with a CASCADE delete — deleting a user removes all their PDFs. `chat_sessions` records a conversation, with `title` auto-populated from the first user message (truncated at 60 characters). `chat_messages` stores the full conversation history with a `citations` JSON column on assistant messages — this means the frontend can reconstruct the full annotated conversation on reload without re-querying Chroma.

`session_pdfs` is a join table solving the many-to-many between sessions and PDFs. A session can query across multiple PDFs simultaneously, and the same PDF can appear in multiple sessions. `PATCH /chat/sessions/{id}` replaces the entire `session_pdfs` set atomically when the user changes their PDF selection mid-session.

For Postgres, the main changes would be: replace `String(32)` UUIDs with native `UUID` type for indexing efficiency; replace the `JSON` column on `chat_messages.citations` with `JSONB` for queryability; add an explicit index on `pdfs.user_id` and `chat_messages.session_id` (SQLite auto-creates these from FK constraints, but Postgres requires explicit index declarations for query planning on large tables); and replace `datetime.utcnow` with `func.now()` which is timezone-aware in Postgres.

---

### **"How do you guarantee per-user data isolation?"**

Isolation is enforced at two independent layers.

At the SQL layer, every query in the service layer filters on `user_id`. `list_user_pdfs` queries `Pdf.user_id == user_id`. `get_session_with_messages` verifies `session.user_id == user_id` before returning data. `delete_pdf` checks `pdf.user_id != user_id` and raises a 404 rather than a 403 — a deliberate choice that avoids revealing whether the resource exists for another user.

At the vector layer, `vectorstore.query` in `backend/app/rag/vectorstore.py` always constructs a Chroma `where` filter as `{"$and": [{"user_id": user_id}, {"pdf_id": {"$in": pdf_ids}}]}`. Even if a caller passed the wrong `pdf_ids` due to a service-layer bug, the `user_id` filter would prevent returning another user's chunks. This is defense-in-depth — the vector store enforces isolation independently of the SQL layer.

Files on disk are stored at `./uploads/{user_id}/{pdf_id}.pdf`. The `user_id` segment is an opaque UUID hex string, not a username, so the path is not guessable. File access never goes through the frontend directly (no file download endpoint exists in the MVP), so path traversal via a crafted URL is not a concern.

---

### **"How would you add file preview with in-document citation highlighting?"**

This is out of scope for the MVP, but the architecture supports it. The cleanest approach is to use `pdf.js` (Mozilla's JavaScript PDF renderer) in the frontend. The flow would be:

1. Add a `GET /pdfs/{id}/file` endpoint that streams the PDF bytes from disk after verifying ownership. Set `Content-Type: application/pdf` and stream with appropriate range-request support.
2. Render the PDF in a split-panel view using `react-pdf` (the React wrapper around `pdf.js`).
3. When the user clicks a citation, pass the `page` number to `react-pdf`'s `PDFViewer` to scroll to that page.
4. For text highlighting: the snippet text from the citation would need to be matched against the extracted text at that page. `pdf.js`'s text layer exposes text positions, so the highlight could be applied as a CSS overlay. This is the non-trivial part — the snippet text may differ slightly from the PDF's text layer due to normalization in `pypdf`, so a fuzzy string match would be necessary.

On the backend, nothing needs to change — all the data is already there. The `page` field on each citation is stored in `chat_messages.citations` and is already returned in the API response.

---

## Category C — Streaming and UX

### **_"Walk me through one chat request, from button click to last token."_** *(common ask)*

The user types a message in `Composer.tsx` and presses Enter. `ChatSurface` calls `useChatStream().send(sessionId, query)`. The `send` function in `frontend/src/hooks/useChatStream.tsx` sets `streaming` state to `{sessionId, query, text: "", citations: null}` and calls `streamChat(sessionId, query)` from `services/chat.tsx`.

`streamChat` is an async generator. It makes a `fetch` POST to `/chat/stream` with `Authorization: Bearer <token>` and `Content-Type: application/json`. The response body is a `ReadableStream`. The generator reads chunks from the stream with `reader.read()`, appends them to a string buffer, and splits on double-newline separators to extract SSE blocks. Each block is parsed into `{event, data}` and yielded.

Back in `useChatStream`, each `token` event appends `data.text` to the `streaming.text` string, which React re-renders as an in-flight message bubble. When a `citations` event arrives, `streaming.citations` is populated. When `error` arrives, the promise rejects.

On the backend, `POST /chat/stream` calls `chat_service.stream_chat_sse`, which wraps `stream_chat` (a synchronous generator) in an async generator using `_gen()`. `stream_chat` embeds the query, retrieves top-5 chunks from Chroma, builds the message list, and iterates `model.stream()` — each yielded token becomes a `"token"` SSE frame. After the last token, it persists the full assistant message and citations to SQLite, then yields `"citations"` and `"done"` frames.

Back in the browser, when the async generator in `streamChat` is exhausted, the `finally` block in `useChatStream` runs: `await qc.refetchQueries({queryKey: ["session", sessionId], exact: true})` fetches the now-persisted message from the API, then `setStreaming(null)` clears the in-flight bubble. The chat surface renders the persisted message with full citation annotations.

---

### **"Why Server-Sent Events instead of WebSockets?"**

SSE is simpler for a unidirectional streaming use case. In the Atlas architecture, the data flow is one-way: the server streams tokens to the browser; the browser sends a standard HTTP POST to start a stream and then just listens. SSE is HTTP-native — it works with standard `fetch`, respects the same CORS rules as regular requests, and works through HTTP/2 multiplexing without protocol upgrades. FastAPI's `StreamingResponse` handles it with no additional library.

WebSockets are the right choice when the browser and server need to send messages to each other over the same connection — for example, a collaborative document editor where both sides push updates. For document Q&A, where the interaction is request-response with a long streaming response, SSE is the lower-complexity option. The tradeoff: SSE is HTTP/1.1 connection-per-stream (though HTTP/2 solves this), and browser reconnection on drop requires manual handling — the browser's `EventSource` API has built-in reconnect, but the custom `fetch`-based SSE reader in `services/chat.tsx` does not.

---

### **"How do you handle the case where the connection drops mid-stream?"**

Honestly, not gracefully in the current implementation. The `streamChat` generator in `services/chat.tsx` uses a plain `fetch` with a `ReadableStream` reader. If the connection drops, the `reader.read()` call either rejects or returns `{done: true}` without a proper error distinction. The `useChatStream` hook's `finally` block runs regardless, which means it will attempt to refetch the session — but the assistant message was only persisted to SQLite after the full stream completed, so a dropped mid-stream connection leaves the user message written but no corresponding assistant response.

The correct fix has two parts. On the backend: persist each token chunk to a temporary store (Redis, or an `in_progress` message row) so that on reconnect, the client can resume or receive the partial answer. On the frontend: detect the error, show a "Connection interrupted — retry?" UI, and optionally resend the last message.

For the MVP this is an acceptable gap for a demo application where network reliability is assumed. In a production system, the fact that user messages are persisted before streaming begins is at least a foundation — the user can see their message was received and can ask again.

---

### **"How do citations work end to end? Show me the schema."**

Citations flow from retrieval to storage to render in several steps.

During retrieval, `vectorstore.query` returns chunks with `metadata` including `pdf_id`, `filename`, `page`, and `chunk_idx`. `chat_service.stream_chat` collects all returned snippets. After streaming completes, it deduplicates by `(pdf_id, page)` — if two chunks came from the same page, one citation is emitted — and truncates each snippet to 200 characters. The citation list is persisted to `chat_messages.citations` as a JSON column:

```json
[
  {"pdf_id": "abc123", "filename": "annual-report.pdf", "page": 7, "snippet": "Revenue for Q3 was..."},
  {"pdf_id": "abc123", "filename": "annual-report.pdf", "page": 12, "snippet": "The board approved..."}
]
```

The same list is emitted in the `citations` SSE event, so the frontend receives citations before the stream has technically ended (before `done`), allowing the UI to render them slightly before the final `done` clears the in-flight state.

On the frontend, `MessageBubble` calls `renderWithCitations(text, citations)`, which splits the assistant's response on `[n]` markers using the regex `/(\[\d+\])/g`. Each `[1]` or `[2]` is replaced with a `CitationInline` component — a superscript in Geist Mono that shows a hover tooltip with the filename and snippet, and opens the `SourcePanel` on click.

Below the message body, `CitationsBlock` renders a footnote list separated from the body text by an 8px rule — a direct reference to academic marginalia conventions. Each footnote is a `CitationFootnote` button that also opens `SourcePanel` when clicked.

`SourcePanel` is a fixed right-side drawer that reads `activeCitation` and `activeCitationIdx` from `uiStore`. It renders the filename as a display heading, the page as monospaced metadata, and the snippet as a blockquote in Fraunces italic.

---

### **"Tell me about a frontend rendering bug you fixed."**

The most interesting one was a message-disappearing flicker at the end of every chat stream. When the user sent a message, the in-flight state — `streaming.text` rendered as a ghost bubble — built up correctly during streaming. But at the moment streaming ended, there was a visible flash where all messages briefly disappeared before the persisted responses reappeared.

The root cause was the ordering in `useChatStream`'s `finally` block. The original code called `qc.invalidateQueries({queryKey: ["session", sessionId]})` and then immediately called `setStreaming(null)`. `invalidateQueries` marks the query as stale and triggers a background refetch, but does not wait for it to complete. By the time `setStreaming(null)` ran, the cached session data had been invalidated but the fresh data had not yet arrived. The component unmounted the streaming bubble and briefly had no persisted messages to render because the cache was empty.

The fix was switching from `invalidateQueries` to `await qc.refetchQueries({queryKey: ["session", sessionId], exact: true})`. `refetchQueries` returns a promise that resolves when the actual network request completes and the new data is in the cache. Only after that resolves does `setStreaming(null)` run — so the persisted messages are in the cache before the streaming bubble is removed, and the transition is seamless.

The `exact: true` flag is necessary because without it, React Query refetches all queries whose key starts with `"session"`, including the sessions list, which is more work than needed and might cause a different race condition on the list invalidation.

---

## Category D — Architecture and Code Quality

### **"Why FastAPI? Why not Django or Express?"**

FastAPI fits the specific requirements of this project: async support for streaming responses, automatic OpenAPI documentation, pydantic-native request/response validation, and a clean dependency injection system for things like `get_current_user` and `get_db`. The `StreamingResponse` with an async generator is a first-class primitive — implementing SSE in FastAPI is four lines.

Django's ORM and admin are excellent for CRUD-heavy applications, but its synchronous request/response cycle and heavier framework conventions are friction for a streaming-first API. Django REST Framework adds more layers. For a small, well-bounded API where I own the entire schema, Django's batteries would mostly be in the way.

Express would require choosing a validation library (Zod or Joi), an ORM (Drizzle or Prisma), and wiring them together. Python was also a pragmatic choice: the entire RAG and LLM ecosystem — LangChain, ChromaDB, pypdf, langchain-groq — is Python-native; using a Node.js backend would mean either calling out to a Python sidecar or reimplementing the RAG logic.

---

### **"Walk me through your provider abstraction. What does `LLM_PROVIDER` do?"**

`LLM_PROVIDER` is an env var read by `pydantic_settings` in `backend/app/core/config.py`. It can be `"groq"`, `"gemini"`, or `"openai"`. `EMBED_PROVIDER` can be `"gemini"` or `"openai"`.

When `build_chat_model()` in `backend/app/rag/chain.py` is called, it reads `get_settings().llm_provider`, branches on the value, imports the appropriate LangChain integration lazily (inside the `if` block), and returns the configured model object. `stream_response` calls `model.stream(messages)` — it doesn't know or care which provider is behind that method.

The same pattern in `get_embedder()` in `backend/app/rag/embedder.py`. The `Embedder` protocol (structural typing via `Protocol`) is what gives this correctness guarantees: any object with `embed_documents` and `embed_query` satisfying the right signatures can be passed into the pipeline. The tests exploit this directly — `conftest.py` defines a `FakeEmbedder` that returns fixed-length zero vectors, allowing the full pipeline to run in tests without any API keys.

Switching the entire stack is a one-line change: `LLM_PROVIDER=openai EMBED_PROVIDER=openai` in `.env`. No code changes. One caveat: the embedding dimension must be consistent with what is already stored in Chroma — Gemini embeddings are 3072-dimensional, OpenAI's `text-embedding-3-small` is 1536-dimensional, and Chroma's collection enforces dimensional consistency at query time. Changing `EMBED_PROVIDER` after documents are already indexed requires dropping and recreating the Chroma collection.

---

### **"How do you test code that calls external APIs?"**

The test suite in `backend/tests/` uses FastAPI's dependency override system. In `conftest.py`, the `get_embedder` and `build_chat_model` dependencies are overridden with fakes before any test runs:

```python
app.dependency_overrides[get_embedder] = lambda: FakeEmbedder()
```

`FakeEmbedder` returns fixed-dimension zero vectors for any input. The fake chat model yields a predefined list of token strings. This means the full `POST /chat/stream` → SSE response path is exercised in the test suite without any real API calls, without any API keys in the test environment, and with deterministic responses.

For testing the processing pipeline (`test_pdfs.py`), the tests upload a real minimal PDF (a tiny fixture file) and trigger `process_pdf` synchronously — calling it directly rather than through `BackgroundTasks`. This exercises the real `pypdf` extraction and real `RecursiveCharacterTextSplitter` chunking, with only the embedder replaced.

For the RAG evaluation script (`eval_rag.py`), the approach is different: it builds a self-contained in-memory embedding index using numpy, so it uses the real embedder but avoids writing to the production Chroma store. This is side-effect-free and reproducible.

What is not tested: the actual embedding quality and the LLM response quality. Those are properties of the external API, not the application code, and are assessed through the eval harness rather than unit tests.

---

### **_"Why Zustand and React Query instead of Redux Toolkit Query?"_** *(common ask)*

Redux Toolkit Query is excellent for teams that are already using Redux and want server-state management integrated into the same store. For this project, it would add significant overhead: a Redux store, a Redux provider, slice definitions, and RTK Query's API definition syntax — all for a codebase where the state surface is small and well-bounded.

React Query (TanStack Query) covers exactly what is needed for server state: caching, background refetching, loading/error states, and query invalidation. The mental model matches the problem: "this query key maps to this remote data." No reducers, no action creators, no selectors.

Zustand covers exactly what is needed for client state: a small number of ephemeral or persisted UI flags (`darkMode`, `uploadOpen`, `activeCitation`). The store definition is a plain object with actions colocated — the entire `uiStore` is 25 lines. Zustand's `persist` middleware handles `localStorage` serialization with one line of config.

The combination is lighter, more readable for a solo reviewer, and maps more directly to how the data actually flows in the application. Redux would be the right choice if the project grew to multiple developers needing predictable state history, time-travel debugging, or a complex shared state graph.

---

### **"What's the responsibility split between `chat_service.py`, `chain.py`, and `pipeline.py`?"**

These three files have distinct scopes that are deliberately kept from bleeding into each other.

`backend/app/rag/pipeline.py` handles document ingestion only: given a `pdf_id` and an `Embedder`, it loads, chunks, embeds, and stores the document, then updates the `pdfs` row status. It knows about the SQLAlchemy session and the Chroma vectorstore but knows nothing about HTTP, sessions, or chat. It is the "document processor."

`backend/app/rag/chain.py` handles prompt construction and model invocation only: `build_chat_model` instantiates the LLM, `build_messages` formats history and context into a message list, `stream_response` wraps the streaming call. It has no database awareness whatsoever — it receives Python objects and returns token strings. It is the "LLM adapter."

`backend/app/services/chat_service.py` is the orchestrator. It owns the chat use cases: creating sessions, updating session PDFs, and streaming chat responses. `stream_chat` calls `get_embedder`, calls `vectorstore.query`, calls `chain.build_messages`, calls `chain.stream_response`, persists messages, and yields SSE events. It knows about both the SQLAlchemy session and the RAG primitives, but it delegates to them rather than implementing their logic.

The API router (`backend/app/api/v1/chat.py`) does only HTTP: validates the request via Pydantic, calls the service, wraps the response. No business logic lives there.

---

## Category E — Behavioral / Open-ended

### **"What was the hardest bug?"**

The worst debugging session was the `text-embedding-004` / `gemini-embedding-001` dimensionality crisis.

Early in development the codebase used `text-embedding-004` as the Gemini embedding model, passed as `model="models/text-embedding-004"` to `GoogleGenerativeAIEmbeddings`. The application started fine, PDFs processed without errors, and chat queries returned results. Then, after a day of development, everything stopped working: queries to Chroma started throwing dimensionality mismatch errors. Chunks already in the collection had been stored with 768-dimensional vectors (the output dimension of `text-embedding-004`), but new query vectors were coming in at 3072 dimensions.

The trigger was a version bump in `langchain-google-genai`. Somewhere between the pinned version and the latest, the library changed how it resolved model names — `text-embedding-004` started routing to a different underlying API endpoint and returning 3072-dimensional vectors instead of 768. The model name was the same; the output shape was not.

Diagnosing it took longer than it should have, because the error was thrown by Chroma's HNSW index at query time, not at embed time, and the error message mentioned "query dimension 3072 does not match index dimension 768" — which looks like a config problem, not an upstream library change. The first assumption was that `get_embedder()` was returning the wrong model on query versus index. After logging both embed calls and confirming they were using identical settings, I ran a one-off script to check the actual dimension of a new embedding: 3072.

The fix was two-fold: migrate to `gemini-embedding-001` (the stable, explicitly named model that the API docs recommend for production use), and drop and recreate the Chroma collection to clear the 768-dimensional stored vectors. The model is now set via the `GEMINI_EMBED_MODEL` env var with a default of `"models/gemini-embedding-001"`, and `.env.example` documents the provider-switching constraint explicitly.

The lesson: embedding dimension is a load-bearing contract between the indexing step and the query step. Model name is not a reliable proxy for output shape. Any change to the embedding model or library version needs a compatibility check and a Chroma collection wipe, which is not obviously documented in most getting-started guides.

---

### **"What did you cut from the MVP, and why?"**

Several things were cut after the initial design spec for clarity of purpose.

PDF preview pane with in-document citation highlighting was the most requested-looking feature that got cut. The implementation complexity — integrating `pdf.js`, building a split-panel layout, fuzzy-matching snippet text against the PDF text layer for highlighting — would have taken longer than building the rest of the feature set combined, for a feature that doesn't improve the core RAG evaluation story. The current citation system (page number + snippet text + source panel) conveys the same information at a fraction of the complexity.

Postgres was specified in early planning notes but was explicitly scoped out in the design spec. SQLAlchemy models are written to be Postgres-compatible (no SQLite-specific constructs), so the migration is a `DATABASE_URL` config change. The tradeoff is that the demo runs with zero dependencies, which matters for a portfolio project where a reviewer needs to get it running quickly.

Rate limiting and token usage tracking were cut because they are operational concerns rather than feature concerns. They do not demonstrate anything interesting about the RAG architecture, and adding `slowapi` + a token counter would have been noise in the codebase.

The frontend unit test suite was cut explicitly. Verification was done manually against the running dev servers. This is honest about the tradeoff: test coverage on a solo portfolio project with a time budget is better spent on the backend business logic (where the interesting invariants live) than on component tests that would mostly assert that React renders what you told it to render.

---

### **"If you had two more weeks, what would you build next and why?"**

In rough priority order:

**Celery job queue for PDF processing** is the most important architectural improvement because it is the first thing that breaks under real load. The `pipeline.py` function is already queue-ready; the change is purely infrastructure. Without this, the project cannot handle concurrent uploads without degrading API responsiveness.

**Evaluation improvement** would be the highest value thing for the RAG quality story. Specifically: building a 30-case golden dataset with verified correct answers, adding LLM-as-judge for faithfulness scoring, and running the eval harness as a CI check on any change to chunking parameters, retrieval k, or the system prompt. Right now the eval exists but its metrics are too coarse to make confident decisions about RAG parameter changes.

**Postgres migration with Alembic cleanup** — not because SQLite is currently causing problems, but because showing that the migration is literally a config change (and the migrations still apply cleanly) is a stronger portfolio signal than describing it as a future plan.

I would not prioritize the PDF preview pane yet, because the implementation complexity is high relative to what it demonstrates about the RAG architecture. It is a frontend engineering problem, not a Gen-AI engineering problem, and the evaluation improvements are more directly relevant to what interviewers in this space care about.

---

### **"What did this project teach you?"**

The biggest thing was how many non-obvious contracts exist in a RAG system that are invisible until they break. Embedding dimension is one — the contract between the indexing step and the query step is stricter than any type system enforces. Model API stability is another — `text-embedding-004` routing differently between library versions was something I would not have anticipated before it happened.

The streaming architecture was also non-trivial in practice. The conceptual model of "stream tokens to the client and then persist the full message" has a subtle ordering problem at the boundary: the frontend optimistic UI depends on the streaming state, but the authoritative state lives in the React Query cache. The `await refetchQueries` fix was a good reminder that "invalidate and refetch" are two different operations with different promises.

More broadly: the project confirmed that the interesting engineering decisions in a RAG application are mostly about the boundaries — between the SQL store and the vector store, between the streaming state and the persisted state, between the embedding model contract and the storage schema. The LangChain integration itself is fairly thin; the hard parts are what happens around it.

---

### **"Walk me through a decision where you had a strong opinion and were wrong — or right against the obvious choice."**

The provider abstraction was the decision where I had a strong opinion that paid off. Early in the project it would have been faster to just hardcode Groq for chat and Gemini for embeddings — no factory function, no protocol, no env var branching. That is the obvious choice for an MVP.

The argument against it was: embedding dimension varies by provider, and that constraint already forced me to document the "you must wipe Chroma if you switch" requirement. If I was already documenting that, I might as well make the switch cost zero code changes rather than "edit three files." The factory function in `chain.py` and `embedder.py` took maybe two hours to write. It made the tests dramatically cleaner — the `FakeEmbedder` pattern works because the `Embedder` protocol is a real abstraction. And it made the `text-embedding-004` → `gemini-embedding-001` migration easier because changing the model was a `.env` change, not a code change.

Where I was genuinely wrong: I initially implemented the citation deduplication in the frontend, matching `[n]` markers against the citation list and deduplicating on the client. When I later moved the deduplication to the backend — deduplicate by `(pdf_id, page)` before emitting the `citations` SSE event — I realized the frontend deduplication had been unnecessary complexity that also introduced a subtle ordering bug (the frontend was deduplicating before all citation events had arrived). The backend is the right place for that logic because the backend knows which chunks were retrieved; the frontend should only render what it receives.
