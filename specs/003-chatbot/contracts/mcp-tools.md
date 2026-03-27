# Contract: MCP Tools

**Feature**: `003-chatbot` | **Date**: 2026-03-25
**Location**: `backend/mcp_server.py`
**SDK**: `mcp` v1.26.0 (`FastMCP`)

---

## Overview

The MCP server exposes 5 tools. Each tool receives `user_id` from `os.environ["USER_ID"]`
(injected by the FastAPI chat endpoint via `MCPServerStdio(env={"USER_ID": ...})`).
All database queries are filtered by this `user_id` — cross-user access is structurally
impossible.

The server runs as a stdio subprocess, started per-request by the Agents SDK.

---

## Tool: `create_task`

Create a new task for the authenticated user.

**Input**:
```python
title: str          # required, 1–200 chars
description: str    # optional, default ""
```

**Output** (success):
```json
{"id": "uuid", "title": "buy groceries", "description": "", "completed": false, "created_at": "ISO"}
```

**Errors**: `{"error": "Title must be between 1 and 200 characters"}` if validation fails.

---

## Tool: `list_tasks`

List all tasks for the authenticated user.

**Input**:
```python
status: str  # "all" | "pending" | "completed", default "all"
```

**Output**:
```json
[
  {"id": "uuid", "title": "buy groceries", "completed": false, "created_at": "ISO"},
  {"id": "uuid", "title": "call doctor",   "completed": true,  "created_at": "ISO"}
]
```

Returns empty list `[]` if no tasks found — never an error.

---

## Tool: `update_task`

Update title and/or description of an existing task.

**Input**:
```python
task_id: str        # required — UUID string of the task
title: str          # optional — new title (1–200 chars)
description: str    # optional — new description
```

**Output** (success): Updated task object (same shape as `create_task` output).

**Errors**: `{"error": "Task not found"}` if task doesn't exist or belongs to another user.

---

## Tool: `delete_task`

Permanently delete a task.

**Input**:
```python
task_id: str  # required — UUID string of the task
```

**Output** (success):
```json
{"success": true, "task_id": "uuid"}
```

**Errors**: `{"error": "Task not found"}` if task doesn't exist or belongs to another user.

---

## Tool: `toggle_complete`

Toggle the completion status of a task (pending ↔ completed).

**Input**:
```python
task_id: str  # required — UUID string of the task
```

**Output** (success): Updated task object with new `completed` value.

**Errors**: `{"error": "Task not found"}` if task doesn't exist or belongs to another user.

---

## User Isolation Enforcement

```python
# In every tool handler:
user_id = os.environ["USER_ID"]   # injected by FastAPI chat endpoint

# In every query:
stmt = select(Task).where(Task.user_id == user_id, Task.id == task_id_uuid)
task = (await session.execute(stmt)).scalar_one_or_none()
if not task:
    return {"error": "Task not found"}   # same error for missing AND cross-user
```

The `USER_ID` env var is the only source of identity — it is never passed in tool
arguments by the AI agent.

---

## MCP Server Entry Point

```python
# backend/mcp_server.py
if __name__ == "__main__":
    mcp.run()   # stdio transport — read from stdin, write to stdout
```

Started per-request by the chat endpoint:
```python
MCPServerStdio(
    params={"command": "python", "args": ["mcp_server.py"]},
    env={
        "USER_ID": current_user_id,
        "DATABASE_URL": os.getenv("DATABASE_URL", ""),
    }
)
```
