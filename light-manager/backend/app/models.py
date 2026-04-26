from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    __tablename__ = "users"

    login: str = Field(primary_key=True)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)

    bulbs: list["Bulb"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Bulb(SQLModel, table=True):
    __tablename__ = "bulbs"
    __table_args__ = (UniqueConstraint("user_login", "slot", name="uq_bulb_user_slot"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    user_login: str = Field(
        foreign_key="users.login",
        nullable=False,
        sa_column_kwargs={"name": "user_login"},
        ondelete="CASCADE",
    )
    slot: int = Field(nullable=False, ge=1, le=3)
    r: int = Field(default=0, ge=0, le=255)
    g: int = Field(default=0, ge=0, le=255)
    b: int = Field(default=0, ge=0, le=255)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)

    user: Optional[User] = Relationship(back_populates="bulbs")
