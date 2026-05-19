def _auth(client, email="u1@example.com"):
    r = client.post("/api/v1/auth/signup", json={"email": email, "password": "hunter22"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _tiny_pdf_bytes() -> bytes:
    from reportlab.pdfgen import canvas
    from io import BytesIO
    buf = BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(72, 720, "hello world test pdf")
    c.showPage(); c.save()
    return buf.getvalue()


def test_upload_and_list(client, monkeypatch):
    from app.api.v1 import pdfs as pdfs_api
    monkeypatch.setattr(pdfs_api, "_kick_processing", lambda *a, **k: None)

    headers = _auth(client)
    files = {"files": ("a.pdf", _tiny_pdf_bytes(), "application/pdf")}
    r = client.post("/api/v1/pdfs", headers=headers, files=files)
    assert r.status_code == 200, r.text
    pdfs = r.json()
    assert len(pdfs) == 1
    assert pdfs[0]["status"] == "processing"
    assert pdfs[0]["filename"] == "a.pdf"

    r = client.get("/api/v1/pdfs", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_delete_pdf_cross_user_forbidden(client, monkeypatch):
    from app.api.v1 import pdfs as pdfs_api
    monkeypatch.setattr(pdfs_api, "_kick_processing", lambda *a, **k: None)

    h1 = _auth(client, "u1@example.com")
    h2 = _auth(client, "u2@example.com")

    r = client.post("/api/v1/pdfs", headers=h1, files={"files": ("a.pdf", _tiny_pdf_bytes(), "application/pdf")})
    pdf_id = r.json()[0]["id"]

    r = client.delete(f"/api/v1/pdfs/{pdf_id}", headers=h2)
    assert r.status_code == 404


def test_upload_rejects_non_pdf(client):
    headers = _auth(client)
    r = client.post(
        "/api/v1/pdfs",
        headers=headers,
        files={"files": ("a.txt", b"hello", "text/plain")},
    )
    assert r.status_code == 415
