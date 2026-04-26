import os
from pathlib import Path

from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlmodel import SQLModel, create_engine, Session

from app import models  # noqa: F401  ensure tables are registered


_DEFAULT_DB_PATH = "./light-manager.db"


def _resolve_db_url() -> str:
    raw = os.environ.get("LIGHT_MANAGER_DB_PATH", _DEFAULT_DB_PATH)
    path = Path(raw).expanduser()
    path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{path}"


engine = create_engine(
    _resolve_db_url(),
    echo=False,
    connect_args={"check_same_thread": False},
)


@event.listens_for(Engine, "connect")
def _enable_sqlite_wal(dbapi_connection, connection_record) -> None:
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
    finally:
        cursor.close()


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Session:
    return Session(engine)
