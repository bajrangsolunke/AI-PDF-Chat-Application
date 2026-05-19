from dataclasses import dataclass
from langchain.text_splitter import RecursiveCharacterTextSplitter


@dataclass
class Chunk:
    text: str
    page: int
    chunk_idx: int


def chunk_pages(pages: list[tuple[int, str]], chunk_size: int = 1000, chunk_overlap: int = 200) -> list[Chunk]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
    )
    out: list[Chunk] = []
    counter = 0
    for page_num, text in pages:
        for piece in splitter.split_text(text):
            out.append(Chunk(text=piece, page=page_num, chunk_idx=counter))
            counter += 1
    return out
