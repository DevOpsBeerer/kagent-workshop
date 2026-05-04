from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlmodel import Session, select

from app.db import engine
from app.models import Bulb, User


router = APIRouter(prefix="/api/bulbs", tags=["bulbs"])

VALID_SLOTS = (1, 2, 3)


class BulbRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slot: int
    r: int
    g: int
    b: int
    updated_at: datetime


class BulbUpdate(BaseModel):
    r: int = Field(ge=0, le=255)
    g: int = Field(ge=0, le=255)
    b: int = Field(ge=0, le=255)


def _ensure_user_exists(session: Session, login: str) -> None:
    if session.get(User, login) is None:
        raise HTTPException(status_code=404, detail=f"Unknown user '{login}'")


def _ensure_slot_valid(slot: int) -> None:
    if slot not in VALID_SLOTS:
        raise HTTPException(
            status_code=404,
            detail=f"Invalid slot {slot}; must be one of {list(VALID_SLOTS)}",
        )


UserParam = Annotated[str, Query(min_length=1, description="ARTEMIS operator login (e.g. operator-01)")]


@router.get("", response_model=list[BulbRead], summary="Read the 3 mission beacons of an operator")
def list_user_bulbs(user: UserParam) -> list[BulbRead]:
    with Session(engine) as session:
        _ensure_user_exists(session, user)
        bulbs = session.exec(
            select(Bulb).where(Bulb.user_login == user).order_by(Bulb.slot)
        ).all()
        return [BulbRead.model_validate(b) for b in bulbs]


@router.put("/{slot}", response_model=BulbRead, summary="Set one mission beacon's RGB colour")
def update_user_bulb(slot: int, user: UserParam, payload: BulbUpdate) -> BulbRead:
    _ensure_slot_valid(slot)
    with Session(engine) as session:
        _ensure_user_exists(session, user)
        bulb = session.exec(
            select(Bulb).where(Bulb.user_login == user, Bulb.slot == slot)
        ).first()
        if bulb is None:
            raise HTTPException(
                status_code=404,
                detail=f"Bulb slot {slot} not found for user '{user}'",
            )
        bulb.r = payload.r
        bulb.g = payload.g
        bulb.b = payload.b
        bulb.updated_at = datetime.now(timezone.utc)
        session.add(bulb)
        session.commit()
        session.refresh(bulb)
        return BulbRead.model_validate(bulb)
