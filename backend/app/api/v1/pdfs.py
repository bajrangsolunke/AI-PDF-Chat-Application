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
