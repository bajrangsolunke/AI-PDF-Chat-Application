def test_settings_load_from_env(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "x")
    monkeypatch.setenv("OPENAI_API_KEY", "y")
    from app.core.config import Settings
    s = Settings()
    assert s.jwt_secret == "x"
    assert s.openai_api_key == "y"
    assert s.max_upload_mb == 20
    assert s.cors_origins == ["http://localhost:5173"]


def test_cors_origins_parsed_from_csv(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "x")
    monkeypatch.setenv("OPENAI_API_KEY", "y")
    monkeypatch.setenv("CORS_ORIGINS", "http://a.com,http://b.com")
    from app.core.config import Settings
    s = Settings()
    assert s.cors_origins == ["http://a.com", "http://b.com"]
