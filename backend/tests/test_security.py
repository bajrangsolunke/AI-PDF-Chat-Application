import pytest
from jose import JWTError

from app.core import security


def test_hash_and_verify_password():
    h = security.hash_password("hunter2")
    assert h != "hunter2"
    assert security.verify_password("hunter2", h) is True
    assert security.verify_password("wrong", h) is False


def test_jwt_round_trip():
    token = security.create_access_token("user-1", expires_minutes=5)
    payload = security.decode_token(token)
    assert payload["sub"] == "user-1"


def test_jwt_expired():
    token = security.create_access_token("user-1", expires_minutes=-1)
    with pytest.raises(JWTError):
        security.decode_token(token)
