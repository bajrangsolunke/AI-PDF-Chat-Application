from app.rag.chunker import chunk_pages


def test_chunker_splits_by_size():
    pages = [(1, "a" * 2500), (2, "short")]
    chunks = chunk_pages(pages, chunk_size=1000, chunk_overlap=100)
    assert len(chunks) >= 3
    assert all(c.page in (1, 2) for c in chunks)
    indices = [c.chunk_idx for c in chunks]
    assert indices == sorted(indices) and len(set(indices)) == len(indices)
