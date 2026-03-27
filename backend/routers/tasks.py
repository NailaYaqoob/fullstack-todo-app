import uuid
from datetime import datetime, timezone
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from db import get_session
from dependencies import get_current_user
from models import Task, TaskCreate, TaskRead, TaskUpdate

router = APIRouter()


# ---------------------------------------------------------------------------
# Ownership helper — returns 404 for both missing AND cross-user tasks (FR-009)
# ---------------------------------------------------------------------------
async def _get_owned_task(
    task_id: uuid.UUID,
    user_id: str,
    session: AsyncSession,
) -> Task:
    task = await session.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


# ---------------------------------------------------------------------------
# US1 — Create and View Tasks
# ---------------------------------------------------------------------------
@router.get("/api/{user_id}/tasks", response_model=list[TaskRead])
async def list_tasks(
    user_id: str,
    status: Optional[Literal["pending", "completed"]] = None,
    current_user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    stmt = (
        select(Task)
        .where(Task.user_id == current_user_id)
        .order_by(Task.created_at.desc())
    )
    if status == "pending":
        stmt = stmt.where(Task.completed == False)  # noqa: E712
    elif status == "completed":
        stmt = stmt.where(Task.completed == True)  # noqa: E712
    result = await session.execute(stmt)
    return result.scalars().all()


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


# ---------------------------------------------------------------------------
# US2 — Toggle Task Completion
# ---------------------------------------------------------------------------
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
    task.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


# ---------------------------------------------------------------------------
# US3 — Update Task Details
# ---------------------------------------------------------------------------
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
    task.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


# ---------------------------------------------------------------------------
# US4 — Delete a Task
# ---------------------------------------------------------------------------
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
    session.delete(task)
    await session.commit()
