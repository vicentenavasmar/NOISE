"""
Shared pytest configuration.
Uses an in-memory SQLite database for tests.
"""

import os

# Set the test DATABASE_URL BEFORE importing the app
os.environ["DATABASE_URL"] = "sqlite:///./test_ruido.db"
os.environ["WATSONX_APIKEY"] = "test-apikey"
os.environ["WATSONX_PROJECT_ID"] = "test-project-id"
os.environ["WATSONX_URL"] = "https://eu-de.ml.cloud.ibm.com"

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app


# Create the test engine
TEST_DATABASE_URL = "sqlite:///./test_ruido.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    """Override of the DB dependency for tests."""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Override of the DB dependency
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True, scope="session")
def crear_tablas():
    """Create tables before running the tests, drop them afterwards."""
    import app.models.obra  # noqa: F401
    import app.models.certificado  # noqa: F401

    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    # On Windows, SQLite may keep the file locked,
    # so we close the connections explicitly
    test_engine.dispose()
