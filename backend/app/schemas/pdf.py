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
