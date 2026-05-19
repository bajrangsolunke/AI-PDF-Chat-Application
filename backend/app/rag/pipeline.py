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
