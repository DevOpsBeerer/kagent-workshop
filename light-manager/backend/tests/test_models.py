import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.db import engine, init_db
from app.models import Bulb, User


def _reset_database():
    from sqlmodel import SQLModel

    SQLModel.metadata.drop_all(engine)
    init_db()


def test_unique_constraint_user_login_slot():
    _reset_database()

    with Session(engine) as session:
        session.add(User(login="alice"))
        session.add(Bulb(user_login="alice", slot=1, r=0, g=0, b=0))
        session.commit()

        session.add(Bulb(user_login="alice", slot=1, r=128, g=128, b=128))
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()


def test_cascade_delete_removes_bulbs():
    _reset_database()

    with Session(engine) as session:
        session.add(User(login="bob"))
        for slot in (1, 2, 3):
            session.add(Bulb(user_login="bob", slot=slot, r=0, g=0, b=0))
        session.commit()

        bob = session.get(User, "bob")
        session.delete(bob)
        session.commit()

        from sqlmodel import select

        remaining = session.exec(select(Bulb).where(Bulb.user_login == "bob")).all()
        assert remaining == []
