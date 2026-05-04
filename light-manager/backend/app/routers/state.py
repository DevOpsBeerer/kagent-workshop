from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.db import engine
from app.models import User
from app.routers.bulbs import BulbRead


router = APIRouter(prefix="/api/state", tags=["state"])


class UserState(BaseModel):
    login: str
    bulbs: list[BulbRead]


@router.get(
    "",
    response_model=list[UserState],
    summary="Mission Control snapshot — every operator and their 3 beacons",
)
def get_state() -> list[UserState]:
    with Session(engine) as session:
        users = session.exec(
            select(User).options(selectinload(User.bulbs)).order_by(User.login)
        ).all()
        return [
            UserState(
                login=user.login,
                bulbs=[BulbRead.model_validate(b) for b in sorted(user.bulbs, key=lambda x: x.slot)],
            )
            for user in users
        ]
