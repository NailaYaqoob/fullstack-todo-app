import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# NOTE: On Windows, use `python run.py` (not `uvicorn main:app` directly).
# run.py sets WindowsSelectorEventLoopPolicy before uvicorn creates the event loop,
# which asyncpg requires on Windows.

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
BETTER_AUTH_SECRET = os.getenv("BETTER_AUTH_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set — check backend/.env")
if not BETTER_AUTH_SECRET:
    raise RuntimeError("BETTER_AUTH_SECRET is not set — check backend/.env")


@asynccontextmanager
async def lifespan(app: FastAPI):
    from db import create_db_and_tables
    await create_db_and_tables()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)

from routers.tasks import router as tasks_router              # noqa: E402
from routers.chat import router as chat_router                # noqa: E402
from routers.chat_session import router as chat_session_router  # noqa: E402
app.include_router(tasks_router)
app.include_router(chat_router)
app.include_router(chat_session_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
