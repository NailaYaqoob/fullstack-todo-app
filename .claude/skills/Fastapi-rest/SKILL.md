# SKILL: fastapi-rest

**Version**: FastAPI 0.115+ | **Language**: Python 3.11+ | **ORM**: SQLModel
**Integrates with**: `sqlmodel-neon`, `better-auth-jwt`, `fullstack-monorepo`

---

## Overview

FastAPI is an async-first Python web framework with automatic OpenAPI docs, Pydantic
validation, and dependency injection. This skill covers patterns for building secure,
well-structured REST API endpoints for the fullstack-todo-app.

---

## Project Structure

```
backend/
├── main.py          ← App entry point, middleware, lifespan, router registration
├── db.py            ← Neon DB engine, AsyncSession, get_session() dependency
├── models.py        ← SQLModel table models + Pydantic request/response schemas
├── auth.py          ← JWT verification — verify_jwt() and get_current_user()
├── routes/
│   ├── __init__.py
│   └── tasks.py     ← Task CRUD endpoints
└── requirements.txt
```

---

## Application Entry (`main.py`)

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    from db import create_db_and_tables
    await create_db_and_tables()
    yield

app = FastAPI(title="Todo API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

# Register feature routers
from routes.tasks import router as tasks_router
app.include_router(tasks_router)
```

---

## Dependency Injection Pattern

FastAPI's `Depends()` is the correct way to share logic across routes.

```python
# auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import os

SECRET = os.getenv("BETTER_AUTH_SECRET")
if not SECRET:
    raise RuntimeError("BETTER_AUTH_SECRET is required")

security = HTTPBearer()

async def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Verify JWT and return the decoded payload."""
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET,
            algorithms=["HS256"],
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(payload: dict = Depends(verify_jwt)) -> str:
    """Extract and return user_id from the verified JWT payload."""
    user_id: str | None = payload.get("sub") or payload.get("userId")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identifier",
        )
    return user_id
```

---

## Route Handler Pattern

**The two-check pattern**: always verify JWT AND match URL user_id.

```python
# routes/tasks.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from db import get_session
from models import Task, TaskCreate, TaskRead, TaskUpdate
from auth import get_current_user

router = APIRouter(prefix="/api/{user_id}/tasks", tags=["tasks"])

def _check_ownership(url_user_id: str, jwt_user_id: str) -> None:
    """Reject requests where URL user_id doesn't match JWT user_id."""
    if url_user_id != jwt_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

def _task_or_404(task: Task | None) -> Task:
    """Raise 404 if task is None (covers both missing and wrong-owner cases)."""
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return task

# ── GET /api/{user_id}/tasks ──────────────────────────────────────────────────
@router.get("", response_model=list[TaskRead])
async def list_tasks(
    user_id: str,
    status_filter: str | None = None,   # ?status=pending|completed
    current_user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Task]:
    _check_ownership(user_id, current_user)

    statement = select(Task).where(Task.user_id == user_id)
    if status_filter == "pending":
        statement = statement.where(Task.completed == False)
    elif status_filter == "completed":
        statement = statement.where(Task.completed == True)
    statement = statement.order_by(Task.created_at.desc())

    result = await session.exec(statement)
    return result.all()

# ── POST /api/{user_id}/tasks ─────────────────────────────────────────────────
@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    user_id: str,
    task_in: TaskCreate,
    current_user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Task:
    _check_ownership(user_id, current_user)

    task = Task(user_id=user_id, **task_in.model_dump())
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task

# ── GET /api/{user_id}/tasks/{task_id} ───────────────────────────────────────
@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    user_id: str,
    task_id: str,
    current_user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Task:
    _check_ownership(user_id, current_user)

    task = await session.get(Task, task_id)
    # Use filter to ensure user_id matches — prevents user-id enumeration
    if task is None or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

# ── PUT /api/{user_id}/tasks/{task_id} ───────────────────────────────────────
@router.put("/{task_id}", response_model=TaskRead)
async def update_task(
    user_id: str,
    task_id: str,
    task_in: TaskUpdate,
    current_user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Task:
    _check_ownership(user_id, current_user)

    task = await session.get(Task, task_id)
    if task is None or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    from datetime import datetime, timezone
    task.updated_at = datetime.now(timezone.utc)

    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task

# ── DELETE /api/{user_id}/tasks/{task_id} ────────────────────────────────────
@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    user_id: str,
    task_id: str,
    current_user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    _check_ownership(user_id, current_user)

    task = await session.get(Task, task_id)
    if task is None or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")

    await session.delete(task)
    await session.commit()

# ── PATCH /api/{user_id}/tasks/{task_id}/complete ────────────────────────────
@router.patch("/{task_id}/complete", response_model=TaskRead)
async def toggle_task(
    user_id: str,
    task_id: str,
    current_user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Task:
    _check_ownership(user_id, current_user)

    task = await session.get(Task, task_id)
    if task is None or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")

    from datetime import datetime, timezone
    task.completed = not task.completed
    task.updated_at = datetime.now(timezone.utc)

    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task
```

---

## HTTP Status Codes Reference

| Situation | Status Code | When to use |
|-----------|-------------|-------------|
| Successful read | `200 OK` | GET requests |
| Resource created | `201 Created` | POST (new resource) |
| Successful update | `200 OK` | PUT / PATCH |
| Successful delete | `204 No Content` | DELETE (no body) |
| Bad input | `400 Bad Request` | Pydantic validation failure |
| Missing/invalid token | `401 Unauthorized` | JWT missing, expired, or invalid |
| Wrong user | `403 Forbidden` | Valid token but wrong user_id |
| Resource not found | `404 Not Found` | Task doesn't exist OR belongs to another user |
| Server error | `500 Internal Server Error` | Unexpected exceptions |

> **Security rule**: Never return `403` for cross-user access — use `404` to avoid
> leaking information about the existence of other users' data.

---

## Pydantic / SQLModel Validation

FastAPI auto-validates request bodies against Pydantic models:

```python
# models.py — validation built into the schema
class TaskCreate(SQLModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)

# FastAPI returns 422 Unprocessable Entity automatically for violations
# No manual validation code needed in route handlers
```

For custom validation:
```python
from pydantic import field_validator

class TaskCreate(SQLModel):
    title: str = Field(min_length=1, max_length=200)

    @field_validator('title')
    @classmethod
    def title_not_whitespace(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Title must not be blank')
        return v.strip()
```

---

## Error Response Shape

FastAPI's default error response:
```json
{
  "detail": "Task not found"
}
```

For validation errors (422):
```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "title"],
      "msg": "String should have at least 1 character",
      "input": ""
    }
  ]
}
```

Frontend (`lib/api.ts`) should read `body.detail` for error messages.

---

## Async SQLModel Query Patterns

```python
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

# List with filter
result = await session.exec(
    select(Task)
    .where(Task.user_id == user_id)
    .where(Task.completed == False)
    .order_by(Task.created_at.desc())
)
tasks = result.all()

# Single by primary key (fastest)
task = await session.get(Task, task_id)

# Single by non-PK field
result = await session.exec(
    select(Task).where(Task.user_id == uid).where(Task.id == tid)
)
task = result.first()  # None if not found

# Count
from sqlalchemy import func
result = await session.exec(
    select(func.count(Task.id)).where(Task.user_id == user_id)
)
count = result.one()
```

---

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Not checking `task.user_id != user_id` | Any user can access any task by ID | Always verify ownership after fetching |
| Returning `403` for wrong-owner | Leaks info about other users' data | Return `404` for cross-user access |
| Using `datetime.utcnow()` | Deprecated in Python 3.12 | Use `datetime.now(timezone.utc)` |
| Synchronous DB session | Blocks event loop | Always use `AsyncSession` + `await` |
| Missing `await session.refresh()` | Stale data returned after commit | Always refresh after commit if returning the object |
| Hardcoding `BETTER_AUTH_SECRET` | Security violation | Always `os.getenv()` |
| `session.exec()` without `await` | RuntimeError | All session operations are async |
| `model_dump()` on update with unset fields | Overwrites with `None` | Use `model_dump(exclude_unset=True)` |

---

## Testing with curl

```bash
# Assuming backend is running on :8000 and you have a JWT token

TOKEN="<your-jwt-token>"
USER_ID="<your-user-id>"

# List tasks
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/$USER_ID/tasks

# Create task
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy groceries","description":"Milk, eggs, bread"}' \
  http://localhost:8000/api/$USER_ID/tasks

# Toggle complete
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/$USER_ID/tasks/<task-id>/complete

# Delete task
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/$USER_ID/tasks/<task-id>
```

Interactive docs: `http://localhost:8000/docs`

---

## Integration Points

- **`sqlmodel-neon`**: `db.py` provides `get_session()` and `create_db_and_tables()`
- **`better-auth-jwt`**: `auth.py` `verify_jwt()` uses `BETTER_AUTH_SECRET`
- **`nextjs-app-router`**: `lib/api.ts` sends requests; endpoint paths must match exactly
- **`fullstack-monorepo`**: Lives in `backend/`; shares env vars via `.env`
