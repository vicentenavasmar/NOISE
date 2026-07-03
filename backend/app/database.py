"""
Database configuration with SQLAlchemy.
SQLite for development, migratable to PostgreSQL without rewriting the data layer.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ruido.db")

# For SQLite we need check_same_thread=False for FastAPI (async)
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base class for all models."""
    pass


def get_db():
    """FastAPI dependency to inject database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
