from sqlmodel import Session, select

from app.db import engine
from app.models import Bulb, User


PARTICIPANT_COUNT = 40
BULBS_PER_USER = 3


def _participant_login(index: int) -> str:
    return f"p{index:02d}"


def create_user_with_bulbs(session: Session, login: str) -> User:
    """Insert an ARTEMIS operator and their 3 mission-status beacons at (0, 0, 0).

    Caller is responsible for committing the session and for upstream uniqueness checks.
    """
    user = User(login=login)
    session.add(user)
    for slot in range(1, BULBS_PER_USER + 1):
        session.add(Bulb(user_login=login, slot=slot, r=0, g=0, b=0))
    return user


def seed_participants() -> int:
    """Idempotent seeding: only runs when the users table is empty.

    Seeds the 40 ARTEMIS operator consoles (p01..p40), each with
    three mission-status beacons defaulted to RGB(0,0,0). Returns the number of
    operators created (0 if already seeded).
    """
    with Session(engine) as session:
        existing = session.exec(select(User).limit(1)).first()
        if existing is not None:
            return 0

        for i in range(1, PARTICIPANT_COUNT + 1):
            create_user_with_bulbs(session, _participant_login(i))
        session.commit()
        return PARTICIPANT_COUNT
