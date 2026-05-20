from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.schemas.chat import (
    ChatMessageOut, ChatSessionDetail, ChatSessionOut, CreateSessionRequest, StreamRequest, UpdateSessionRequest,
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


@router.patch("/sessions/{session_id}", response_model=ChatSessionOut)
def update_session(
    session_id: str,
    body: UpdateSessionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatSessionOut:
    session = chat_service.update_session_pdfs(db, user.id, session_id, body.pdf_ids)
    return ChatSessionOut(
        id=session.id, title=session.title, pdf_ids=body.pdf_ids,
        created_at=session.created_at, updated_at=session.updated_at,
    )


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
