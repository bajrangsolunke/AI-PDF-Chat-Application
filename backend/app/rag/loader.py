from pathlib import Path
from pypdf import PdfReader


def load_pdf_pages(path: str | Path) -> list[tuple[int, str]]:
    """Return [(page_number_1_based, text)] for non-empty pages."""
    reader = PdfReader(str(path))
    pages: list[tuple[int, str]] = []
    for idx, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append((idx, text))
    return pages
