"""SQLModel database engine and session factory."""

from sqlmodel import Session, SQLModel, create_engine
from app.config import get_settings

settings = get_settings()

# SQLite with check_same_thread=False for multi-threaded FastAPI
connect_args = {"check_same_thread": False} if "sqlite" in settings.database_url else {}
engine = create_engine(settings.database_url, connect_args=connect_args, echo=settings.debug)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_db():
    with Session(engine) as session:
        yield session
