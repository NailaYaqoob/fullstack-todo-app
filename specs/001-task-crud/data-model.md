# Data Model: Task CRUD Operations

**Feature**: `001-task-crud` | **Date**: 2026-02-25
**Depends on**: `002-user-auth` data model (User entity owned by Better Auth)

---

## Entities

### Task *(SQLModel — `table=True`, owned by this feature)*

The primary entity for this feature. SQLModel manages the `task` table in Neon PostgreSQL.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PRIMARY KEY, default: uuid4 | UUID prevents sequential enumeration |
| user_id | string | NOT NULL, INDEX | FK ref to Better Auth `user.id`; no SQLModel FK constraint (see data-model.md for 002-user-auth) |
| title | string | NOT NULL, 1–200 chars | Trimmed; must contain ≥1 non-whitespace char |
| description | string? | NULLABLE, max 1,000 chars | Optional extended notes |
| completed | boolean | NOT NULL, default: False | False = pending; True = completed |
| created_at | datetime | NOT NULL, default: utcnow() | Auto-set on insert; never updated |
| updated_at | datetime | NOT NULL, default: utcnow() | Manually updated on every PATCH |

**State machine** (completed field):
```
pending (completed=False)
  ──[toggle]──► completed (completed=True)
  ──[update]──► pending (title/description updated; completed unchanged)

completed (completed=True)
  ──[toggle]──► pending (completed=False)
  ──[update]──► completed (title/description updated; completed unchanged)

any state ──[delete]──► (row removed permanently)
```

**Validation rules**:
- `title`: trimmed whitespace; rejected if empty after trim; max 200 chars
- `description`: optional; max 1,000 chars; `None` is valid
- `completed`: only changed via `/toggle` endpoint — not accepted in `TaskUpdate`

---

### User *(reference only — managed by Better Auth)*

Referenced by `task.user_id`. Not defined as a SQLModel `table=True` model in this
feature. See `specs/002-user-auth/data-model.md` for full definition.

| Field | Used by Task Feature | Notes |
|-------|---------------------|-------|
| id | task.user_id | String; assigned from JWT `sub` claim |

---

## SQLModel Definitions (backend/models.py)

```python
import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from pydantic import field_validator


class TaskBase(SQLModel):
    """Shared validation for create and update operations."""
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("title")
    @classmethod
    def title_not_whitespace(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Title must contain at least one non-whitespace character")
        return stripped


class Task(TaskBase, table=True):
    """Database table — managed by SQLModel / create_db_and_tables()."""
    __tablename__ = "task"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: str = Field(index=True)         # References Better Auth user.id
    completed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TaskCreate(TaskBase):
    """Request body for POST /tasks. Inherits title + description validation."""
    pass


class TaskRead(TaskBase):
    """Response shape for all task endpoints."""
    id: uuid.UUID
    user_id: str
    completed: bool
    created_at: datetime
    updated_at: datetime


class TaskUpdate(SQLModel):
    """Request body for PATCH /tasks/{id}. All fields optional."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("title")
    @classmethod
    def title_not_whitespace(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        stripped = v.strip()
        if not stripped:
            raise ValueError("Title must contain at least one non-whitespace character")
        return stripped
```

---

## TypeScript Interfaces (frontend/lib/types.ts)

```typescript
export interface Task {
  id: string           // UUID as string
  userId: string
  title: string
  description: string | null
  completed: boolean
  createdAt: string    // ISO 8601 datetime string
  updatedAt: string
}

export interface TaskCreate {
  title: string
  description?: string
}

export interface TaskUpdate {
  title?: string
  description?: string
}
```

*Note*: Backend uses `snake_case` field names; frontend uses `camelCase`. FastAPI returns
`snake_case` JSON (`created_at`, `user_id`). Map in `frontend/lib/api.ts` response
handling or configure SQLModel `alias_generator` — see contracts for exact field names.

---

## Entity Relationships

```
Better Auth (002-user-auth):
  User (1) ──────────── (N) Task
    user.id  ←→  task.user_id  [string reference, no FK constraint]

This feature:
  Task (N) ──────────── (1) User  [user owns many tasks]
```

---

## Database Table Created by This Feature

SQLModel's `create_db_and_tables()` (in `backend/db.py`) will create:

| Table | Owner | Created By |
|-------|-------|-----------|
| `task` | SQLModel (this feature) | `create_db_and_tables()` at startup |
| `user` | Better Auth | Better Auth startup migration (do NOT recreate) |
| `session` | Better Auth | Better Auth startup migration (do NOT recreate) |

**Critical**: `backend/models.py` must NOT define `User` or `Session` with `table=True`
— Better Auth owns those tables. Only `Task` has `table=True`.
