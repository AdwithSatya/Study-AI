from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine,async_sessionmaker
from dotenv import load_dotenv
from models import Base
import os

load_dotenv()  # must run before os.getenv so .env values are available

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL is None:
    raise RuntimeError("DATABASE_URL environment variable is not set.")

engine = create_async_engine(DATABASE_URL)


async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
async def init_db():
    async with engine.begin() as conn:
        # run_sync routes the synchronous create_all call safely
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with async_session() as db:
        yield db
