import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
 
from app.core.config import get_settings
 
from app.models.base import Base
 
def _build_engine():
    settings = get_settings()
    connect_args = {}
 
    if settings.database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
       
        # Ensure the directory exists
        db_path = settings.database_url.replace("sqlite:///", "")
        os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)
 
    return create_engine(
        settings.database_url,
        connect_args=connect_args,
        echo=settings.debug,
        pool_pre_ping=True,
    )
 
 
engine = _build_engine()
 
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)
 
 
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()