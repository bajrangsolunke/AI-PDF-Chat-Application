from functools import lru_cache
from pathlib import Path
import chromadb

from app.core.config import get_settings

COLLECTION = "pdf_chunks"


@lru_cache
def get_chroma_client() -> chromadb.PersistentClient:
    settings = get_settings()
    Path(settings.chroma_dir).mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=settings.chroma_dir)


def get_collection():
    return get_chroma_client().get_or_create_collection(name=COLLECTION, metadata={"hnsw:space": "cosine"})


def upsert_chunks(
    user_id: str,
    pdf_id: str,
    filename: str,
    chunks: list[dict],
    embeddings: list[list[float]],
) -> None:
    coll = get_collection()
    ids = [f"{pdf_id}:{c['chunk_idx']}" for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [
        {"user_id": user_id, "pdf_id": pdf_id, "filename": filename, "page": c["page"], "chunk_idx": c["chunk_idx"]}
        for c in chunks
    ]
    coll.upsert(ids=ids, documents=documents, metadatas=metadatas, embeddings=embeddings)


def delete_pdf(pdf_id: str) -> None:
    get_collection().delete(where={"pdf_id": pdf_id})


def query(user_id: str, pdf_ids: list[str], query_embedding: list[float], k: int = 5) -> list[dict]:
    coll = get_collection()
    where = {"$and": [{"user_id": user_id}, {"pdf_id": {"$in": pdf_ids}}]}
    res = coll.query(query_embeddings=[query_embedding], n_results=k, where=where)
    results = []
    for i in range(len(res["ids"][0])):
        results.append({
            "id": res["ids"][0][i],
            "text": res["documents"][0][i],
            "metadata": res["metadatas"][0][i],
            "score": res["distances"][0][i],
        })
    return results
