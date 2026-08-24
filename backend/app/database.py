"""SQLModel database engine and session factory."""

from sqlmodel import Session, SQLModel, create_engine
from app.config import get_settings

settings = get_settings()

# SQLite with check_same_thread=False for multi-threaded FastAPI
connect_args = {"check_same_thread": False} if "sqlite" in settings.database_url else {}
engine = create_engine(settings.database_url, connect_args=connect_args, echo=settings.debug)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    # Ensure any new columns exist on SQLite model_basic table
    try:
        with engine.begin() as conn:
            cols = [
                ("is_trained", "BOOLEAN DEFAULT 0"),
                ("trained_model_path", "VARCHAR(500)"),
                ("final_accuracy", "FLOAT"),
                ("final_loss", "FLOAT"),
                ("val_accuracy", "FLOAT"),
                ("val_loss", "FLOAT"),
                ("trained_at", "DATETIME"),
            ]
            for col_name, col_type in cols:
                try:
                    conn.exec_driver_sql(f"ALTER TABLE model_basic ADD COLUMN {col_name} {col_type}")
                except Exception:
                    pass
    except Exception:
        pass


def get_db():
    with Session(engine) as session:
        yield session
