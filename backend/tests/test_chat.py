from app.db.models import Pdf
from app.services import chat_service


class FakeEmbedder:
    def embed_documents(self, texts): return [[0.1, 0.2, 0.3] for _ in texts]
    def embed_query(self, text): return [0.1, 0.2, 0.3]


class FakeChatModel:
    def stream(self, messages):
        class Chunk:
            def __init__(self, c): self.content = c
        for piece in ["The ", "answer ", "is ", "42."]:
            yield Chunk(piece)


def _auth(client, email="u@example.com"):
    r = client.post("/api/v1/auth/signup", json={"email": email, "password": "hunter22"})
    return r.json()["access_token"], r.json()["user"]["id"]


def _ready_pdf(db, user_id) -> str:
    p = Pdf(user_id=user_id, filename="a.pdf", storage_path="/tmp/x.pdf", status="ready", size_bytes=10, page_count=1, chunk_count=1)
    db.add(p); db.commit(); db.refresh(p)
    return p.id


def test_create_session_and_stream(client, db_session, monkeypatch):
    token, user_id = _auth(client)
    pdf_id = _ready_pdf(db_session, user_id)

    real_stream = chat_service.stream_chat
    def _patched(db, uid, sid, query, **_):
        return real_stream(db, uid, sid, query, embedder=FakeEmbedder(), chat_model=FakeChatModel())
    monkeypatch.setattr(chat_service, "stream_chat", _patched)

    from app.rag import vectorstore as vs
    monkeypatch.setattr(vs, "query", lambda **kwargs: [
        {"id": "x:0", "text": "The answer to life is 42.", "metadata": {"pdf_id": pdf_id, "filename": "a.pdf", "page": 1, "chunk_idx": 0}, "score": 0.1}
    ])

    r = client.post("/api/v1/chat/sessions", json={"pdf_ids": [pdf_id]}, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    sid = r.json()["id"]

    with client.stream("POST", "/api/v1/chat/stream", json={"session_id": sid, "query": "what is the answer?"}, headers={"Authorization": f"Bearer {token}"}) as resp:
        assert resp.status_code == 200
        events = list(resp.iter_lines())

    text = "\n".join(events)
    assert "event: token" in text
    assert "event: citations" in text
    assert "event: done" in text
    assert "42" in text
