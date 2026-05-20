from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.models import User


def test_user_roundtrip():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    with Session() as s:
        u = User(email="a@b.com", password_hash="x")
        s.add(u); s.commit(); s.refresh(u)
        assert u.id and len(u.id) == 32
        assert s.query(User).filter_by(email="a@b.com").first().id == u.id
