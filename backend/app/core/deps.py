from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core import security
from app.db.models import User
from app.db.session import get_db
from app.services import auth_service

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=True)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    creds_exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")
    try:
        payload = security.decode_token(token)
    except JWTError:
        raise creds_exc
    user_id = payload.get("sub")
    if not user_id:
        raise creds_exc
    user = auth_service.get_user(db, user_id)
    if not user:
        raise creds_exc
    return user
