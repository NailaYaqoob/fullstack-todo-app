# Contract: Task REST Endpoints

**Feature**: `001-task-crud` | **Date**: 2026-02-25

All endpoints require `Authorization: Bearer <jwt>` header (Principle II).
All endpoints enforce URL `user_id` == JWT `user_id` (Principle III).
Base URL: `http://localhost:8000` (dev)

**Auth dependency** (on every endpoint):
```python
current_user_id: str = Depends(get_current_user)  # from backend/dependencies.py
```

**Ownership helper** (on every single-task endpoint):
```python
async def _get_owned_task(task_id: uuid.UUID, user_id: str, session) -> Task:
    task = await session.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
```

---

## GET /api/{user_id}/tasks

List all tasks for the authenticated user. Supports optional status filter.

**Query parameters**:
| Param | Type | Values | Default |
|-------|------|--------|---------|
| status | string (optional) | `"pending"` \| `"completed"` | all tasks |

**Responses**:
| Status | Body | Condition |
|--------|------|-----------|
| 200 OK | `[TaskRead, ...]` | Success (empty array if no tasks — SC-004) |
| 401 | `{"detail": "Invalid or expired token"}` | Missing/invalid JWT |
| 403 | `{"detail": "Forbidden"}` | URL `user_id` ≠ JWT `user_id` |
| 422 | FastAPI validation error | Invalid `status` value |

**Sorting**: `created_at DESC` (newest first — spec Assumptions).

**Implementation**:
```python
@router.get("/api/{user_id}/tasks", response_model=list[TaskRead])
async def list_tasks(
    user_id: str,
    status: Optional[Literal["pending", "completed"]] = None,
    current_user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    stmt = select(Task).where(Task.user_id == current_user_id).order_by(Task.created_at.desc())
    if status == "pending":
        stmt = stmt.where(Task.completed == False)
    elif status == "completed":
        stmt = stmt.where(Task.completed == True)
    result = await session.execute(stmt)
    return result.scalars().all()
```

---

## POST /api/{user_id}/tasks

Create a new task owned by the authenticated user.

**Request body** (`TaskCreate`):
```json
{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread"
}
```

**Responses**:
| Status | Body | Condition |
|--------|------|-----------|
| 201 Created | `TaskRead` | Task created successfully |
| 401 | `{"detail": "Invalid or expired token"}` | Missing/invalid JWT |
| 403 | `{"detail": "Forbidden"}` | URL `user_id` ≠ JWT `user_id` |
| 422 | `{"detail": [...]}` | Empty title, whitespace-only title, title > 200 chars, description > 1000 chars |

**Implementation**:
```python
@router.post("/api/{user_id}/tasks", response_model=TaskRead, status_code=201)
async def create_task(
    user_id: str,
    body: TaskCreate,
    current_user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    task = Task(**body.model_dump(), user_id=current_user_id)
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task
```

---

## GET /api/{user_id}/tasks/{task_id}

Retrieve a single task by ID.

**Path parameters**: `user_id` (str), `task_id` (UUID)

**Responses**:
| Status | Body | Condition |
|--------|------|-----------|
| 200 OK | `TaskRead` | Task found and owned by user |
| 401 | `{"detail": "Invalid or expired token"}` | Missing/invalid JWT |
| 403 | `{"detail": "Forbidden"}` | URL `user_id` ≠ JWT `user_id` |
| 404 | `{"detail": "Task not found"}` | Task doesn't exist OR belongs to another user (FR-009) |

**Implementation**:
```python
@router.get("/api/{user_id}/tasks/{task_id}", response_model=TaskRead)
async def get_task(
    user_id: str,
    task_id: uuid.UUID,
    current_user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return await _get_owned_task(task_id, current_user_id, session)
```

---

## PATCH /api/{user_id}/tasks/{task_id}

Update a task's title and/or description. `completed` is NOT accepted here — use `/toggle`.

**Request body** (`TaskUpdate` — all fields optional):
```json
{
  "title": "Updated title",
  "description": "Updated description"
}
```

**Responses**:
| Status | Body | Condition |
|--------|------|-----------|
| 200 OK | `TaskRead` | Task updated |
| 401 | `{"detail": "Invalid or expired token"}` | Missing/invalid JWT |
| 403 | `{"detail": "Forbidden"}` | URL `user_id` ≠ JWT `user_id` |
| 404 | `{"detail": "Task not found"}` | Task missing or cross-user (FR-009) |
| 422 | `{"detail": [...]}` | Empty/whitespace title, field too long |

**Implementation**:
```python
@router.patch("/api/{user_id}/tasks/{task_id}", response_model=TaskRead)
async def update_task(
    user_id: str,
    task_id: uuid.UUID,
    body: TaskUpdate,
    current_user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    task = await _get_owned_task(task_id, current_user_id, session)
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    task.updated_at = datetime.utcnow()
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task
```

---

## DELETE /api/{user_id}/tasks/{task_id}

Permanently delete a task. Irreversible (spec Assumptions: no soft-delete).

**Responses**:
| Status | Body | Condition |
|--------|------|-----------|
| 204 No Content | (empty) | Task deleted |
| 401 | `{"detail": "Invalid or expired token"}` | Missing/invalid JWT |
| 403 | `{"detail": "Forbidden"}` | URL `user_id` ≠ JWT `user_id` |
| 404 | `{"detail": "Task not found"}` | Task missing or cross-user (FR-009) |

**Implementation**:
```python
@router.delete("/api/{user_id}/tasks/{task_id}", status_code=204)
async def delete_task(
    user_id: str,
    task_id: uuid.UUID,
    current_user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    task = await _get_owned_task(task_id, current_user_id, session)
    await session.delete(task)
    await session.commit()
```

---

## PATCH /api/{user_id}/tasks/{task_id}/toggle

Flip `completed` from `False → True` or `True → False`. No request body needed.

**Responses**:
| Status | Body | Condition |
|--------|------|-----------|
| 200 OK | `TaskRead` | Status toggled |
| 401 | `{"detail": "Invalid or expired token"}` | Missing/invalid JWT |
| 403 | `{"detail": "Forbidden"}` | URL `user_id` ≠ JWT `user_id` |
| 404 | `{"detail": "Task not found"}` | Task missing or cross-user (FR-009) |

**Implementation**:
```python
@router.patch("/api/{user_id}/tasks/{task_id}/toggle", response_model=TaskRead)
async def toggle_task(
    user_id: str,
    task_id: uuid.UUID,
    current_user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    task = await _get_owned_task(task_id, current_user_id, session)
    task.completed = not task.completed
    task.updated_at = datetime.utcnow()
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task
```

---

## Frontend API Client (frontend/lib/api.ts)

```typescript
const USER_ID = /* extracted from authClient session */ ""

export async function listTasks(userId: string, status?: "pending" | "completed"): Promise<Task[]>
export async function createTask(userId: string, data: TaskCreate): Promise<Task>
export async function getTask(userId: string, taskId: string): Promise<Task>
export async function updateTask(userId: string, taskId: string, data: TaskUpdate): Promise<Task>
export async function deleteTask(userId: string, taskId: string): Promise<void>
export async function toggleTask(userId: string, taskId: string): Promise<Task>
```

**Error handling**: Check `response.ok`; throw with `response.statusText` or parsed
`detail` field; dashboard components handle 401 by redirecting to `/login`.
