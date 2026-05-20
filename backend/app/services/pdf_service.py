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
    except Exception:
        pass
    db.delete(pdf); db.commit()
