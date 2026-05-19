def test_signup_then_login_then_me(client):
    r = client.post("/api/v1/auth/signup", json={"email": "a@b.com", "password": "hunter22"})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]

    r = client.post("/api/v1/auth/login", json={"email": "a@b.com", "password": "hunter22"})
    assert r.status_code == 200
    token = r.json()["access_token"]

    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "a@b.com"


def test_signup_duplicate(client):
    client.post("/api/v1/auth/signup", json={"email": "a@b.com", "password": "hunter22"})
    r = client.post("/api/v1/auth/signup", json={"email": "a@b.com", "password": "hunter22"})
    assert r.status_code == 409


def test_login_wrong_password(client):
    client.post("/api/v1/auth/signup", json={"email": "a@b.com", "password": "hunter22"})
    r = client.post("/api/v1/auth/login", json={"email": "a@b.com", "password": "wrong"})
    assert r.status_code == 401


def test_me_requires_auth(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401
