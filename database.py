"""
database.py
────────────────────────────────────────────────────────────────────────────────
Database engine, session factory, and initialisation helpers.

SQLAlchemy async setup:
  - create_async_engine  → connection pool backed by asyncpg
  - async_sessionmaker   → factory that produces AsyncSession objects
  - get_db               → FastAPI dependency that yields a session per request
  - init_db              → called once at startup to create tables if missing
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from dotenv import load_dotenv
from models import Base
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL is None:
    raise RuntimeError("DATABASE_URL environment variable is not set.")

engine = create_async_engine(DATABASE_URL, echo=False)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Create all tables on startup if they don't already exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """FastAPI dependency — yields a DB session per request, closes it after."""
    async with async_session() as session:
        yield session
