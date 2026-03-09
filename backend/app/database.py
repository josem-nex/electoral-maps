"""Database configuration and session management."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

try:
    from app.config import settings
except ModuleNotFoundError:
    from config import settings


connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Provide a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize database schema."""
    try:
        from app import db_models  # noqa: F401
    except ModuleNotFoundError:
        import db_models  # type: ignore # noqa: F401

    Base.metadata.create_all(bind=engine)
