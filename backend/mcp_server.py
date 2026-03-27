"""
backend/mcp_server.py — FastMCP stdio server for todo task operations.

Started per-request by backend/routers/chat.py via MCPServerStdio.
Receives USER_ID and DATABASE_URL from the parent process via environment variables.
"""
import os
import sys
import uuid
from datetime import datetime, timezone

from mcp.server.fastmcp import FastMCP

# Windows asyncio compatibility — set before any event loop creation.
# asyncpg requires SelectorEventLoop on Windows; this subprocess has its own loop.
if sys.platform == "win32":
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlmodel import select

mcp = FastMCP("Todo Tools")

# ---------------------------------------------------------------------------
# Database session factory — lazily initialised from DATABASE_URL env var
# ---------------------------------------------------------------------------
_session_factory = None


def _get_session_factory():
    global _session_factory
    if _session_factory is None:
        database_url = os.environ.get("DATABASE_URL", "")
        if not database_url:
            raise RuntimeError("DATABASE_URL not set in MCP subprocess environment")
        engine = create_async_engine(
            database_url,
            echo=False,
            pool_pre_ping=True,
            connect_args={"ssl": True},
        )
        _session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return _session_factory


# ---------------------------------------------------------------------------
# Tool: create_task  (US1)
# ---------------------------------------------------------------------------
@mcp.tool()
async def create_task(title: str, description: str = "") -> dict:
    """Create a new task for the authenticated user.

    Args:
        title: Task title (1-200 characters, required)
        description: Optional task description
    """
    from models import Task  # local import — avoids circular deps at module load

    user_id = os.environ["USER_ID"]
    title = title.strip()
    if not title or len(title) > 200:
        return {"error": "Title must be between 1 and 200 characters"}

    async with _get_session_factory()() as session:
        task = Task(title=title, description=description or None, user_id=user_id)
        session.add(task)
        await session.commit()
        await session.refresh(task)
        return {
            "id": str(task.id),
            "title": task.title,
            "description": task.description,
            "completed": task.completed,
            "created_at": task.created_at.isoformat(),
        }


# ---------------------------------------------------------------------------
# Tool: list_tasks  (US2)
# ---------------------------------------------------------------------------
@mcp.tool()
async def list_tasks(status: str = "all") -> list:
    """List tasks for the authenticated user.

    Args:
        status: Filter by status — "all", "pending", or "completed"
    """
    from models import Task

    user_id = os.environ["USER_ID"]
    async with _get_session_factory()() as session:
        stmt = (
            select(Task)
            .where(Task.user_id == user_id)
            .order_by(Task.created_at.desc())
        )
        if status == "pending":
            stmt = stmt.where(Task.completed == False)  # noqa: E712
        elif status == "completed":
            stmt = stmt.where(Task.completed == True)   # noqa: E712
        result = await session.execute(stmt)
        tasks = result.scalars().all()
        return [
            {
                "id": str(t.id),
                "title": t.title,
                "completed": t.completed,
                "created_at": t.created_at.isoformat(),
            }
            for t in tasks
        ]


# ---------------------------------------------------------------------------
# Tool: toggle_complete  (US3)
# ---------------------------------------------------------------------------
@mcp.tool()
async def toggle_complete(task_id: str) -> dict:
    """Toggle the completion status of a task (pending ↔ completed).

    Args:
        task_id: UUID string of the task to toggle
    """
    from models import Task

    user_id = os.environ["USER_ID"]
    try:
        task_uuid = uuid.UUID(task_id)
    except ValueError:
        return {"error": "Invalid task ID format"}

    async with _get_session_factory()() as session:
        stmt = select(Task).where(Task.user_id == user_id, Task.id == task_uuid)
        task = (await session.execute(stmt)).scalar_one_or_none()
        if not task:
            return {"error": "Task not found"}
        task.completed = not task.completed
        task.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        session.add(task)
        await session.commit()
        await session.refresh(task)
        return {
            "id": str(task.id),
            "title": task.title,
            "completed": task.completed,
            "created_at": task.created_at.isoformat(),
        }


# ---------------------------------------------------------------------------
# Tool: update_task  (US4)
# ---------------------------------------------------------------------------
@mcp.tool()
async def update_task(task_id: str, title: str = None, description: str = None) -> dict:
    """Update the title and/or description of an existing task.

    Args:
        task_id: UUID string of the task to update
        title: New title (1-200 characters, optional)
        description: New description (optional)
    """
    from models import Task

    user_id = os.environ["USER_ID"]
    try:
        task_uuid = uuid.UUID(task_id)
    except ValueError:
        return {"error": "Invalid task ID format"}

    if title is not None:
        title = title.strip()
        if not title or len(title) > 200:
            return {"error": "Title must be between 1 and 200 characters"}

    async with _get_session_factory()() as session:
        stmt = select(Task).where(Task.user_id == user_id, Task.id == task_uuid)
        task = (await session.execute(stmt)).scalar_one_or_none()
        if not task:
            return {"error": "Task not found"}
        if title is not None:
            task.title = title
        if description is not None:
            task.description = description
        task.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        session.add(task)
        await session.commit()
        await session.refresh(task)
        return {
            "id": str(task.id),
            "title": task.title,
            "description": task.description,
            "completed": task.completed,
            "created_at": task.created_at.isoformat(),
        }


# ---------------------------------------------------------------------------
# Tool: delete_task  (US5)
# ---------------------------------------------------------------------------
@mcp.tool()
async def delete_task(task_id: str) -> dict:
    """Permanently delete a task.

    Args:
        task_id: UUID string of the task to delete
    """
    from models import Task

    user_id = os.environ["USER_ID"]
    try:
        task_uuid = uuid.UUID(task_id)
    except ValueError:
        return {"error": "Invalid task ID format"}

    async with _get_session_factory()() as session:
        stmt = select(Task).where(Task.user_id == user_id, Task.id == task_uuid)
        task = (await session.execute(stmt)).scalar_one_or_none()
        if not task:
            return {"error": "Task not found"}
        await session.delete(task)
        await session.commit()
        return {"success": True, "task_id": task_id}


# ---------------------------------------------------------------------------
# Entry point — stdio transport
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    mcp.run()
