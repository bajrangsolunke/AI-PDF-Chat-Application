"""RAG evaluation script for Atlas.

Runs a set of test cases through the real RAG pipeline (loader → chunker →
embedder → in-memory retrieval → LLM) and reports retrieval hit rate,
answer keyword coverage, and per-query latency.

Stays out of the production Chroma store: scoring is done with cosine
similarity in numpy so the eval is reproducible and side-effect free.

Usage:
    cd backend
    source .venv/bin/activate
    python scripts/eval_rag.py <pdf_path> <test_cases.json> [--no-llm] [--top-k 5] [--out report.md]

Test cases JSON format:
    [
      {
        "question": "What was the Q3 revenue?",
        "expected_pages": [4, 7],
        "expected_keywords": ["revenue", "Q3"]
      },
      ...
    ]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

# Make the `app.` package importable when run from project root or scripts/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings  # noqa: E402
from app.rag.chain import build_chat_model, build_messages, stream_response  # noqa: E402
from app.rag.chunker import chunk_pages  # noqa: E402
from app.rag.embedder import get_embedder  # noqa: E402
from app.rag.loader import load_pdf_pages  # noqa: E402


@dataclass
class CaseResult:
    question: str
    expected_pages: list[int]
    retrieved_pages: list[int]
    retrieval_hit: bool
    answer: str = ""
    keywords_found: list[str] = field(default_factory=list)
    keywords_missing: list[str] = field(default_factory=list)
    elapsed_ms: float = 0.0


def cosine_similarity(a: list[float], b: list[float]) -> float:
    import numpy as np

    va, vb = np.array(a), np.array(b)
    denom = float(np.linalg.norm(va) * np.linalg.norm(vb)) or 1.0
    return float(np.dot(va, vb) / denom)


def render_report(
    pdf_path: Path,
    pages: int,
    chunks: int,
    dim: int,
    results: list[CaseResult],
    top_k: int,
    eval_llm: bool,
) -> str:
    total = len(results)
    if total == 0:
        return "No test cases provided."

    retrieval_correct = sum(r.retrieval_hit for r in results)
    avg_latency = sum(r.elapsed_ms for r in results) / total
    settings = get_settings()

    out: list[str] = []
    out.append("# RAG Evaluation Report")
    out.append("")
    out.append(f"- **Document:** `{pdf_path.name}` ({pages} pages with text, {chunks} chunks)")
    out.append(f"- **Embed provider:** `{settings.embed_provider}` (dim={dim})")
    if eval_llm:
        out.append(f"- **Chat provider:** `{settings.llm_provider}`")
    out.append(f"- **Retrieval top-k:** {top_k}")
    out.append("")
    out.append("## Summary")
    out.append("")
    out.append(
        f"- **Retrieval hit rate:** {retrieval_correct}/{total} "
        f"({(100 * retrieval_correct // total) if total else 0}%) — at least one expected page in top-k"
    )
    if eval_llm:
        kw_full = sum(1 for r in results if not r.keywords_missing)
        out.append(
            f"- **Answer keyword coverage:** {kw_full}/{total} "
            f"({(100 * kw_full // total) if total else 0}%) — all expected keywords present"
        )
    out.append(f"- **Average latency per query:** {avg_latency:.0f} ms")
    out.append("")
    out.append("## Per-case results")
    out.append("")
    out.append("| # | Question | Retrieved pages | Expected | Hit | Keywords | Latency |")
    out.append("|---|---|---|---|---|---|---|")
    for i, r in enumerate(results, start=1):
        if not eval_llm:
            kw_cell = "—"
        elif not r.keywords_missing:
            kw_cell = f"all ({len(r.keywords_found)})"
        else:
            kw_cell = f"missing: {', '.join(r.keywords_missing)}"
        out.append(
            f"| {i} | {r.question[:60]}{'…' if len(r.question) > 60 else ''} | "
            f"{r.retrieved_pages} | {r.expected_pages} | "
            f"{'✅' if r.retrieval_hit else '❌'} | {kw_cell} | {r.elapsed_ms:.0f} ms |"
        )

    if eval_llm:
        out.append("")
        out.append("## Sample answers")
        out.append("")
        for i, r in enumerate(results, start=1):
            out.append(f"**Q{i}:** {r.question}")
            out.append("")
            out.append("> " + (r.answer or "(no answer)").replace("\n", "\n> "))
            out.append("")

    return "\n".join(out)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("pdf_path", type=Path, help="Path to the PDF under test")
    parser.add_argument("test_cases", type=Path, help="Path to test_cases.json")
    parser.add_argument("--top-k", type=int, default=5, help="Retrieval top-k (default 5)")
    parser.add_argument("--no-llm", action="store_true", help="Skip LLM, evaluate retrieval only")
    parser.add_argument("--out", type=Path, default=None, help="Optional markdown output path")
    args = parser.parse_args()

    if not args.pdf_path.exists():
        print(f"error: PDF not found at {args.pdf_path}", file=sys.stderr)
        return 1
    if not args.test_cases.exists():
        print(f"error: test cases not found at {args.test_cases}", file=sys.stderr)
        return 1

    print(f"→ Loading PDF: {args.pdf_path}")
    pages = load_pdf_pages(args.pdf_path)
    print(f"  {len(pages)} pages with extractable text")

    if not pages:
        print("error: no extractable text in PDF", file=sys.stderr)
        return 1

    print("→ Chunking (size=1000, overlap=200)")
    chunks = chunk_pages(pages)
    print(f"  {len(chunks)} chunks")

    print(f"→ Embedding {len(chunks)} chunks with provider={get_settings().embed_provider}")
    embedder = get_embedder()
    embed_start = time.perf_counter()
    chunk_embeddings: list[list[float]] = []
    # batch of 100 — matches the production pipeline
    for i in range(0, len(chunks), 100):
        chunk_embeddings.extend(embedder.embed_documents([c.text for c in chunks[i : i + 100]]))
    embed_elapsed = time.perf_counter() - embed_start
    dim = len(chunk_embeddings[0]) if chunk_embeddings else 0
    print(f"  dim={dim}, took {embed_elapsed:.1f}s")

    cases = json.loads(args.test_cases.read_text())
    if not isinstance(cases, list) or not all(isinstance(c, dict) for c in cases):
        print("error: test cases must be a JSON array of objects", file=sys.stderr)
        return 1

    print(f"\n→ Running {len(cases)} test cases\n")
    results: list[CaseResult] = []
    chat_model = build_chat_model() if not args.no_llm else None

    for i, case in enumerate(cases, start=1):
        q = str(case.get("question", "")).strip()
        expected_pages = list(case.get("expected_pages", []))
        expected_keywords = list(case.get("expected_keywords", []))
        if not q:
            continue

        print(f"  [{i:>2}/{len(cases)}] {q!r}")
        start = time.perf_counter()

        q_emb = embedder.embed_query(q)
        scored = [(cosine_similarity(q_emb, chunk_embeddings[j]), chunks[j]) for j in range(len(chunks))]
        scored.sort(reverse=True, key=lambda x: x[0])
        top = [c for _, c in scored[: args.top_k]]
        retrieved_pages = sorted({c.page for c in top})
        retrieval_hit = any(p in expected_pages for p in retrieved_pages)

        result = CaseResult(
            question=q,
            expected_pages=expected_pages,
            retrieved_pages=retrieved_pages,
            retrieval_hit=retrieval_hit,
        )

        if not args.no_llm and chat_model is not None:
            try:
                snippets = [
                    {
                        "text": c.text,
                        "metadata": {
                            "pdf_id": "eval",
                            "filename": args.pdf_path.name,
                            "page": c.page,
                            "chunk_idx": c.chunk_idx,
                        },
                    }
                    for c in top
                ]
                msgs = build_messages([], snippets, q)
                answer = "".join(stream_response(chat_model, msgs))
                result.answer = answer
                lower = answer.lower()
                result.keywords_found = [kw for kw in expected_keywords if kw.lower() in lower]
                result.keywords_missing = [kw for kw in expected_keywords if kw.lower() not in lower]
            except Exception as exc:  # noqa: BLE001
                result.answer = f"(error: {exc})"

        result.elapsed_ms = (time.perf_counter() - start) * 1000
        results.append(result)
        print(f"      pages={retrieved_pages} hit={'✓' if retrieval_hit else '✗'} ({result.elapsed_ms:.0f} ms)")

    report = render_report(
        pdf_path=args.pdf_path,
        pages=len(pages),
        chunks=len(chunks),
        dim=dim,
        results=results,
        top_k=args.top_k,
        eval_llm=not args.no_llm,
    )

    print("\n" + ("=" * 72))
    print(report)

    if args.out:
        args.out.write_text(report)
        print(f"\n→ Report written to {args.out}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
