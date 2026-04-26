from datetime import datetime

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlmodel import Session, select

from app.db import engine
from app.models import User
from app.seed import create_user_with_bulbs


router = APIRouter(prefix="/api/users", tags=["users"])


class UserCreate(BaseModel):
    login: str = Field(min_length=1, max_length=64)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    login: str
    created_at: datetime


@router.get("", response_model=list[str], summary="List all participant logins")
def list_users() -> list[str]:
    with Session(engine) as session:
        return [row for row in session.exec(select(User.login).order_by(User.login)).all()]


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new participant (with 3 default bulbs)",
)
def create_user(payload: UserCreate) -> UserRead:
    login = payload.login.strip()
    if not login:
        raise HTTPException(status_code=400, detail="login must not be blank")

    with Session(engine) as session:
        if session.get(User, login) is not None:
            raise HTTPException(status_code=409, detail=f"User '{login}' already exists")
        user = create_user_with_bulbs(session, login)
        session.commit()
        session.refresh(user)
        return UserRead.model_validate(user)


@router.delete(
    "/{login}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Delete a participant (cascades to bulbs)",
)
def delete_user(login: str) -> Response:
    with Session(engine) as session:
        user = session.get(User, login)
        if user is None:
            raise HTTPException(status_code=404, detail=f"Unknown user '{login}'")
        session.delete(user)
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
