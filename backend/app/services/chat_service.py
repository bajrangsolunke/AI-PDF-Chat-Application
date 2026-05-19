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
    except Exception as exc:
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
