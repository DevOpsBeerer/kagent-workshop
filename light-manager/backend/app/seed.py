from sqlmodel import Session, select

from app.db import engine
from app.models import Bulb, User


PARTICIPANT_COUNT = 40
BULBS_PER_USER = 3


def _participant_login(index: int) -> str:
    return f"participant-{index:02d}"


def seed_participants() -> int:
    """Idempotent seeding: only runs when the users table is empty.

    Returns the number of users created (0 if already seeded).
    """
    with Session(engine) as session:
        existing = session.exec(select(User).limit(1)).first()
        if existing is not None:
            return 0

        for i in range(1, PARTICIPANT_COUNT + 1):
            login = _participant_login(i)
            session.add(User(login=login))
            for slot in range(1, BULBS_PER_USER + 1):
                session.add(Bulb(user_login=login, slot=slot, r=0, g=0, b=0))
        session.commit()
        return PARTICIPANT_COUNT
