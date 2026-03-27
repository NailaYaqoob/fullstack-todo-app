# Research: Task CRUD Operations

**Feature**: `001-task-crud` | **Date**: 2026-02-25
**Depends on**: `002-user-auth` (provides `get_current_user()`, `verify_jwt()`)

No NEEDS CLARIFICATION markers remained after spec validation. Research below documents
the key design decisions made during planning.

---

## Decision 1: UUID Task IDs

**Decision**: Use `uuid.UUID` (uuid4) as the `Task` primary key.

**Rationale**: UUIDs prevent sequential ID enumeration attacks — a user cannot guess
another user's task ID by incrementing integers. Combined with the 404 response for
cross-user access (FR-009), this eliminates information leakage about task existence.

**Alternatives considered**:
- **Auto-increment integer**: Sequential; trivially enumerable; rejected.
- **ULID / cuid2**: Viable; uuid4 selected for built-in Python `uuid` module support
  and native PostgreSQL `uuid` column type without additional dependencies.

**SQLModel field**: `id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)`

---

## Decision 2: Two-Check Ownership Pattern (Principle III)

**Decision**: Implement a `_get_owned_task()` helper that returns 404 for both
non-existent AND cross-user tasks. Combined with a URL `user_id` vs JWT `user_id`
check at the route level.

**Rationale**: FR-009 requires "no information leakage about task existence." A 403
(Forbidden) response would confirm the task exists but belongs to another user. A
404 (Not Found) reveals nothing. Two separate checks satisfy both Principle III
(ownership) and FR-009 (no leakage).

**Pattern**:
```python
# Check 1 (route handler): URL param must match JWT claim
if user_id != current_user_id:
    raise HTTPException(status_code=403, detail="Forbidden")

# Check 2 (helper): task must exist AND belong to authenticated user
async def _get_owned_task(task_id: uuid.UUID, user_id: str, session) -> Task:
    task = await session.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
```

**Alternatives considered**:
- **403 for cross-user**: Reveals task existence. Rejected (FR-009).
- **Single combined query** (`WHERE id=? AND user_id=?`): Equivalent to check 2 alone;
  returns 404 correctly. Combined with check 1 for belt-and-suspenders. Accepted.

---

## Decision 3: PATCH for Partial Updates

**Decision**: Use `PATCH /api/{user_id}/tasks/{task_id}` with `TaskUpdate` (all fields
`Optional`) for title/description updates. Use a separate
`PATCH /api/{user_id}/tasks/{task_id}/toggle` for completion toggling.

**Rationale**: `PATCH` is semantically correct for partial updates. Separating toggle
into its own endpoint avoids ambiguity about whether `completed` field in a general
update should also toggle. The toggle endpoint inverts the current `completed` boolean
without requiring the client to know the current state.

**Alternatives considered**:
- **PUT with full replacement**: Requires client to send unchanged fields; fragile.
  Rejected.
- **Single PATCH with `completed` field**: Requires client to read current state first;
  toggle endpoint is simpler and idiomatic. Rejected.

---

## Decision 4: Status Filter Query Parameter

**Decision**: `GET /api/{user_id}/tasks?status=pending|completed` — optional query
parameter. Omitting `status` returns all tasks.

**Rationale**: FR-004 requires filtering by all/pending/completed. A query parameter
is REST-idiomatic for filtering a collection. `Optional[Literal["pending", "completed"]]`
with FastAPI's automatic validation rejects invalid values with 422.

**FastAPI signature**:
```python
from typing import Optional, Literal

@router.get("/api/{user_id}/tasks", response_model=list[TaskRead])
async def list_tasks(
    user_id: str,
    status: Optional[Literal["pending", "completed"]] = None,
    current_user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
```

**Alternatives considered**:
- **Separate endpoints** (`/tasks/pending`, `/tasks/completed`): More endpoints;
  harder to extend. Rejected.
- **Boolean `completed` param**: Less readable (`completed=false` vs `status=pending`).
  Rejected.

---

## Decision 5: Title Whitespace Trimming

**Decision**: Trim title whitespace in a Pydantic `field_validator` on `TaskBase`.
Reject if result is empty string (FR-001, edge case from spec).

**Rationale**: A title of "   " (all spaces) passes a non-empty length check but
violates the spec requirement for meaningful content. Trimming server-side is safer
than relying on client validation alone.

**Implementation**:
```python
from pydantic import field_validator

class TaskBase(SQLModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("title")
    @classmethod
    def title_not_whitespace(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Title must contain at least one non-whitespace character")
        return stripped
```

**Alternatives considered**:
- **Rely on `min_length=1`**: Does not catch whitespace-only strings. Rejected.
- **Frontend-only validation**: Insufficient per constitution (validate at boundaries).
  Rejected.

---

## Decision 6: `updated_at` Manual Update Strategy

**Decision**: Manually set `task.updated_at = datetime.utcnow()` in each PATCH handler
before committing.

**Rationale**: SQLModel does not support `onupdate` triggers natively. Manual assignment
in the route handler is explicit, simple, and correct for the scale (Principle VI —
no premature abstraction).

**Alternatives considered**:
- **PostgreSQL trigger**: More complex setup; overkill for Phase II. Rejected.
- **SQLAlchemy event listener**: Viable but adds abstraction layer for no gain at this
  scale. Rejected.

---

## Decision 7: Sort Order and Pagination

**Decision**: Return tasks sorted by `created_at DESC` (newest first). No pagination —
return all user tasks in a single response (up to 100 per spec Assumptions).

**Rationale**: Spec Assumptions explicitly state: "The task list does not require
server-side pagination for Phase II; loading up to 100 tasks at once is acceptable."
SC-005 requires 100-task list loads in < 2 sec, which is achievable without pagination
at Neon's connection latency.

**FastAPI query**:
```python
stmt = (
    select(Task)
    .where(Task.user_id == current_user_id)
    .order_by(Task.created_at.desc())
)
if status == "pending":
    stmt = stmt.where(Task.completed == False)
elif status == "completed":
    stmt = stmt.where(Task.completed == True)
result = await session.execute(stmt)
tasks = result.scalars().all()
```

---

## Decision 8: Frontend API Client Pattern

**Decision**: `frontend/lib/api.ts` exports six named async functions (`listTasks`,
`createTask`, `getTask`, `updateTask`, `deleteTask`, `toggleTask`). A private
`fetchWithAuth()` helper retrieves the JWT via `authClient.token()` and attaches the
`Authorization: Bearer` header.

**Rationale**: Principle IV mandates `frontend/lib/api.ts` as the single point of
contact with the backend. Named exports with TypeScript return types (`Promise<Task[]>`,
`Promise<Task>`, etc.) enforce the API contract at compile time.

**Pattern**:
```typescript
// frontend/lib/api.ts
import { authClient } from "./auth-client"

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await authClient.token()
  return fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}
```

---

## Resolved Clarifications

All 11 functional requirements in the spec were clear. Key implicit decisions:

| FR | Resolution |
|----|-----------|
| FR-001 (title 1-200, desc max-1000) | Pydantic `Field(min_length=1, max_length=200/1000)` + whitespace validator |
| FR-002 (auto-associate user) | `task.user_id = current_user_id` in `create_task` handler |
| FR-003 (only own tasks) | All queries: `WHERE task.user_id = current_user_id` |
| FR-004 (filter by status) | `?status=pending\|completed` query param |
| FR-009 (not-found for cross-user) | `_get_owned_task()` returns 404 for both missing and cross-user |
| FR-011 (creation date) | `created_at` field auto-set in `Task` model default |
