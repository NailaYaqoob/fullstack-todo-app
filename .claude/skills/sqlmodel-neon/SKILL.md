# SKILL: sqlmodel-neon

**ORM**: SQLModel 0.0.21+ | **Database**: Neon Serverless PostgreSQL | **Driver**: asyncpg
**Integrates with**: `fastapi-rest`, `better-auth-jwt`, `fullstack-monorepo`

---

## Overview

SQLModel combines SQLAlchemy (ORM engine) and Pydantic (validation) into one library.
Models with `table=True` are database tables. Models without are Pydantic schemas
(request/response bodies). Neon is a serverless PostgreSQL — it requires SSL and
uses short-lived connections that need `pool_pre_ping`.

---

## Installation

```bash
pip install sqlmodel asyncpg python-dotenv
# Add to requirements.txt:
# sqlmodel==0.0.21
# asyncpg==0.29.0
# python-dotenv==1.0.1
```

---

## Database Connection (`db.py`)

```python
# backend/db.py
import os
from typing import AsyncGenerator
from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is required. "
        "Format: postgresql+asyncpg://user:pass@host/db?sslmode=require"
    )

engine = create_async_engine(
    DATABASE_URL,
    echo=False,          # Set True only for SQL query debugging
    pool_size=5,         # Neon free tier: max 5 concurrent connections
    max_overflow=10,
    pool_pre_ping=True,  # Detect dead connections (critical for serverless)
    pool_recycle=300,    # Recycle connections every 5 minutes
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Keep objects accessible after commit
)

async def create_db_and_tables() -> None:
    """Idempotent schema init — called at app startup.
    Uses CREATE TABLE IF NOT EXISTS semantics.
    """
    # Import all models before create_all so metadata knows about them
    import models  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields one session per HTTP request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
```

---

## Model Definitions (`models.py`)

### The Three-Layer Pattern

```
TaskBase       ← shared fields (title, description)
  ├── Task     ← database table (table=True) — adds id, user_id, timestamps
  ├── TaskCreate  ← POST request body (no extra fields)
  ├── TaskRead    ← API response (all fields including id + timestamps)
  └── TaskUpdate  ← PUT/PATCH body (all fields Optional)
```

```python
# backend/models.py
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Index
from typing import Optional
from datetime import datetime, timezone
import uuid

# ── Helpers ───────────────────────────────────────────────────────────────────

def utcnow() -> datetime:
    """timezone-aware UTC now (datetime.utcnow() is deprecated in Python 3.12)"""
    return datetime.now(timezone.utc)

def new_uuid() -> uuid.UUID:
    return uuid.uuid4()

# ── User ─────────────────────────────────────────────────────────────────────
# Better Auth manages this table; define here only for FK relationships.

class User(SQLModel, table=True):
    __tablename__ = "user"  # Better Auth expects "user", not "users"

    id: str = Field(primary_key=True)
    email: str = Field(unique=True, index=True)
    name: Optional[str] = None
    email_verified: bool = Field(default=False)
    image: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    tasks: list["Task"] = Relationship(back_populates="owner")

# ── Task ──────────────────────────────────────────────────────────────────────

class TaskBase(SQLModel):
    """Shared validated fields. No table, no id."""
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)

class Task(TaskBase, table=True):
    """Database table. Inherits validation from TaskBase."""
    __tablename__ = "task"

    id: uuid.UUID = Field(default_factory=new_uuid, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    completed: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    owner: Optional[User] = Relationship(back_populates="tasks")

    # Composite index for common query pattern
    __table_args__ = (
        Index("ix_task_user_completed", "user_id", "completed"),
    )

class TaskCreate(TaskBase):
    """POST /tasks request body — no extra fields needed."""
    pass

class TaskRead(TaskBase):
    """GET response — all fields exposed to the client."""
    id: uuid.UUID
    user_id: str
    completed: bool
    created_at: datetime
    updated_at: datetime

class TaskUpdate(SQLModel):
    """PUT /tasks/{id} — all fields optional for partial updates."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
```

---

## Neon Connection String

```
postgresql+asyncpg://user:password@ep-XXXXX.region.aws.neon.tech/dbname?sslmode=require
                     │              │                               │
                     └─ credentials └─ Neon endpoint hostname       └─ required for Neon
```

**Driver prefix**: `postgresql+asyncpg://` (not `postgresql://` or `postgres://`)
**SSL**: `?sslmode=require` is mandatory — Neon rejects plain connections.

```bash
# backend/.env
DATABASE_URL=postgresql+asyncpg://neondb_owner:abc123@ep-cool-tree-123.us-east-1.aws.neon.tech/neondb?sslmode=require
```

---

## CRUD Query Patterns

```python
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import Task, TaskCreate, TaskUpdate
from datetime import datetime, timezone

# ── Create ────────────────────────────────────────────────────────────────────
async def create_task(
    session: AsyncSession, user_id: str, data: TaskCreate
) -> Task:
    task = Task(user_id=user_id, **data.model_dump())
    session.add(task)
    await session.commit()
    await session.refresh(task)  # Reload from DB (gets server-side defaults)
    return task

# ── List ──────────────────────────────────────────────────────────────────────
async def list_tasks(
    session: AsyncSession,
    user_id: str,
    completed: bool | None = None,
) -> list[Task]:
    stmt = select(Task).where(Task.user_id == user_id)
    if completed is not None:
        stmt = stmt.where(Task.completed == completed)
    stmt = stmt.order_by(Task.created_at.desc())
    result = await session.exec(stmt)
    return list(result.all())

# ── Get by ID (user-scoped) ───────────────────────────────────────────────────
async def get_task(
    session: AsyncSession, user_id: str, task_id: str
) -> Task | None:
    task = await session.get(Task, task_id)
    if task is None or task.user_id != user_id:
        return None  # Caller raises 404
    return task

# ── Update ────────────────────────────────────────────────────────────────────
async def update_task(
    session: AsyncSession,
    task: Task,
    data: TaskUpdate,
) -> Task:
    update_fields = data.model_dump(exclude_unset=True)  # Only set fields
    for field, value in update_fields.items():
        setattr(task, field, value)
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task

# ── Delete ────────────────────────────────────────────────────────────────────
async def delete_task(session: AsyncSession, task: Task) -> None:
    await session.delete(task)
    await session.commit()

# ── Toggle ────────────────────────────────────────────────────────────────────
async def toggle_task(session: AsyncSession, task: Task) -> Task:
    task.completed = not task.completed
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task
```

---

## Schema Evolution (Phase II Approach)

For Phase II, use the **drop-and-recreate** approach for schema changes:

```python
# Reset schema (development only — destroys all data)
async def reset_db_and_tables() -> None:
    import models  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)
```

For production, use Alembic migrations. For Phase II hackathon: drop-and-recreate is acceptable.

---

## Neon-Specific Behavior

| Behavior | Explanation | Mitigation |
|----------|-------------|------------|
| **Autosuspend** | Neon pauses after 5 min inactivity | `pool_pre_ping=True` tests connection before use |
| **Cold start** | First query after pause takes ~1-2s | Expected; no mitigation needed for Phase II |
| **Connection limits** | Free tier: 10 max connections | Keep `pool_size=5`, `max_overflow=10` |
| **SSL required** | Plain TCP connections rejected | Always include `?sslmode=require` |
| **Branching** | Neon supports DB branches | Useful for staging/testing environments |

---

## Verifying the Connection

```bash
# From backend/ directory
python -c "
import asyncio
from db import create_db_and_tables
asyncio.run(create_db_and_tables())
print('✅ Connected and schema initialized')
"

# Inspect created tables
python -c "
import asyncio
from sqlalchemy import text
from db import engine

async def check():
    async with engine.connect() as conn:
        result = await conn.execute(text(\"SELECT tablename FROM pg_tables WHERE schemaname='public'\"))
        for row in result:
            print(' -', row[0])

asyncio.run(check())
"
```

---

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| `postgresql://` prefix | asyncpg won't load | Use `postgresql+asyncpg://` |
| No `?sslmode=require` | Connection refused by Neon | Always include SSL param |
| `datetime.utcnow()` | DeprecationWarning in Python 3.12 | Use `datetime.now(timezone.utc)` |
| `expire_on_commit=True` | Objects become invalid after commit | Set `expire_on_commit=False` |
| No `await session.refresh()` | Stale data after commit | Always refresh after writes |
| `model_dump()` on partial update | Overwrites with `None` | Use `model_dump(exclude_unset=True)` |
| `SQLModel.metadata.create_all` without importing models | Tables not registered | `import models` before `create_all` |
| `table=True` on request/response schemas | Creates unwanted tables | Only DB table models use `table=True` |
| Concurrent pool exhaustion | `TimeoutError` on high load | Raise `pool_size` or add connection wait timeout |

---

## Better Auth Co-existence

Better Auth's tables are created by the Better Auth library itself — do NOT try to create them via SQLModel. Only define the `User` model in `models.py` for foreign key references:

```python
# CORRECT — minimal User for FK
class User(SQLModel, table=True):
    __tablename__ = "user"  # Must match Better Auth's table name
    id: str = Field(primary_key=True)
    email: str = Field(unique=True, index=True)
    # Only fields needed for FK relationships — don't add auth fields

# WRONG — don't try to manage auth fields
class User(SQLModel, table=True):
    password_hash: str  # ❌ Better Auth manages this
    session_token: str  # ❌ Better Auth manages this
```

---

## Integration Points

- **`fastapi-rest`**: `get_session()` is a FastAPI dependency injected into route handlers
- **`better-auth-jwt`**: `User` model's `__tablename__` must match Better Auth's `user` table
- **`fullstack-monorepo`**: `DATABASE_URL` env var shared via `backend/.env`
