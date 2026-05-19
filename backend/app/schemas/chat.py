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
