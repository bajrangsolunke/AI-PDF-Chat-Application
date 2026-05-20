# Scripts

Operational scripts for Atlas.

## `eval_rag.py` — RAG evaluation harness

Runs a set of test cases through the real RAG pipeline and reports:

- **Retrieval hit rate** — does the top-k retrieval contain a chunk from any of the expected pages?
- **Answer keyword coverage** — does the LLM's answer contain the expected keywords?
- **Per-query latency** — wall-clock time including embedding + retrieval + generation.

Stays out of the production Chroma store: scoring is done with in-memory cosine similarity, so the eval is reproducible and side-effect free. Uses the real embedder + chat model configured via `LLM_PROVIDER` / `EMBED_PROVIDER`.

### Usage

```bash
cd backend
source .venv/bin/activate
python scripts/eval_rag.py <pdf_path> <test_cases.json> [--top-k 5] [--no-llm] [--out report.md]
```

Examples:

```bash
# Retrieval + LLM, default top-k=5
python scripts/eval_rag.py ../some_paper.pdf scripts/sample_test_cases.json

# Retrieval only (no API quota burn on the LLM half)
python scripts/eval_rag.py ../some_paper.pdf scripts/sample_test_cases.json --no-llm

# Save a markdown report
python scripts/eval_rag.py ../some_paper.pdf scripts/sample_test_cases.json --out docs/EVALUATION.md
```

### Test case format

A JSON array of objects with three keys:

```json
[
  {
    "question": "What is the document's main argument?",
    "expected_pages": [1, 2],
    "expected_keywords": ["thesis", "argument"]
  }
]
```

- `expected_pages`: 1-based page numbers. The case passes if **any** of these pages appears in the top-k retrieval.
- `expected_keywords`: case-insensitive substrings the LLM's answer should contain. The case passes only if **all** are present.

A sample set is provided at `sample_test_cases.json` — adapt it to whatever PDF you're testing against.

### Why this exists

Common interview question: *"How do you know your retrieval works?"* Without an eval, the honest answer is "I don't." This script lets you say:

> "I run 20 question-keyword pairs through the real pipeline and check that retrieval hits the expected page set and the answer contains expected terms. On my main test PDF it scores 17/20 retrieval and 14/20 keyword coverage. The misses cluster around questions that require synthesis across distant pages — that's the next thing I'd improve, probably with re-ranking or query rewriting."

Specific, honest, talks to real RAG concerns.
