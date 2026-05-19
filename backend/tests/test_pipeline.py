from pathlib import Path

from app.db.models import User, Pdf
from app.rag.pipeline import process_pdf


class FakeEmbedder:
    def embed_documents(self, texts):
        return [[0.1, 0.2, 0.3] for _ in texts]

    def embed_query(self, text):
        return [0.1, 0.2, 0.3]


def _make_tiny_pdf(path: Path) -> None:
    from reportlab.pdfgen import canvas
    c = canvas.Canvas(str(path))
    c.drawString(72, 720, "hello world this is a test pdf for chunking")
    c.showPage()
    c.save()


def test_process_pdf_success(db_session, tmp_path, monkeypatch):
    user = User(email="a@b.com", password_hash="x")
    db_session.add(user); db_session.commit(); db_session.refresh(user)

    pdf_path = tmp_path / "sample.pdf"
    _make_tiny_pdf(pdf_path)

    pdf = Pdf(user_id=user.id, filename="sample.pdf", storage_path=str(pdf_path), size_bytes=pdf_path.stat().st_size)
    db_session.add(pdf); db_session.commit(); db_session.refresh(pdf)

    from app.rag import vectorstore as vs
    monkeypatch.setattr(vs, "upsert_chunks", lambda **kwargs: None)

    process_pdf(db_session, pdf.id, FakeEmbedder())
    db_session.refresh(pdf)
    assert pdf.status == "ready"
    assert pdf.page_count == 1
    assert pdf.chunk_count >= 1
