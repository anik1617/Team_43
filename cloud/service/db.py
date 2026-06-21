"""SQLite engine + session for the Kyro Cloud Service. SQLite keeps deploy 'not complicated'
(single file, no DB server) — fine for the MVP; swap the URL for Postgres later if needed."""
from __future__ import annotations

import os

from sqlmodel import Session, SQLModel, create_engine

_HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("KYRO_DB", os.path.join(_HERE, "kyro_service.db"))

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},   # FastAPI accesses the session across threads
)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
