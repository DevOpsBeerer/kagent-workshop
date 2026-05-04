from sqlmodel import Session, select

from app.db import engine, init_db
from app.models import Bulb, User
from app.seed import BULBS_PER_USER, PARTICIPANT_COUNT, seed_participants


def _reset_database():
    from sqlmodel import SQLModel

    SQLModel.metadata.drop_all(engine)
    init_db()


def test_seed_creates_40_users_with_3_bulbs_each():
    _reset_database()

    created = seed_participants()
    assert created == PARTICIPANT_COUNT

    with Session(engine) as session:
        users = session.exec(select(User)).all()
        bulbs = session.exec(select(Bulb)).all()

    assert len(users) == PARTICIPANT_COUNT
    assert len(bulbs) == PARTICIPANT_COUNT * BULBS_PER_USER
    logins = {u.login for u in users}
    assert "operator-01" in logins
    assert "operator-40" in logins
    assert all(bulb.r == 0 and bulb.g == 0 and bulb.b == 0 for bulb in bulbs)


def test_seed_is_idempotent_on_second_run():
    _reset_database()

    first = seed_participants()
    second = seed_participants()
    third = seed_participants()

    assert first == PARTICIPANT_COUNT
    assert second == 0
    assert third == 0

    with Session(engine) as session:
        users = session.exec(select(User)).all()
        bulbs = session.exec(select(Bulb)).all()

    assert len(users) == PARTICIPANT_COUNT
    assert len(bulbs) == PARTICIPANT_COUNT * BULBS_PER_USER


def test_sqlite_journal_mode_is_wal():
    _reset_database()

    with engine.connect() as conn:
        mode = conn.exec_driver_sql("PRAGMA journal_mode").scalar()

    assert (mode or "").lower() == "wal"
