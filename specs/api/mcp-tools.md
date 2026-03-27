# MCP Tools Specification

**Phase**: III — AI Chatbot
**Server**: Official MCP SDK (Python)
**Status**: Pending

## Overview
The MCP server exposes task operations as tools that the OpenAI Agents SDK can call. All tools are stateless — they read/write directly to Neon PostgreSQL via SQLModel. User identity is passed via context (extracted from JWT in the parent request).

## Tools

### create_task
Create a new task for the authenticated user.

**Input Schema**:
```json
{
  "title": { "type": "string", "required": true, "maxLength": 200 },
  "description": { "type": "string", "required": false, "maxLength": 1000 }
}
```

**Output**:
```json
{
  "id": 1,
  "title": "Buy groceries",
  "description": "Milk, eggs",
  "completed": false,
  "created_at": "2026-03-25T10:00:00Z"
}
```

**Errors**: Validation error if title is empty or too long

---

### list_tasks
List tasks for the authenticated user.

**Input Schema**:
```json
{
  "status": { "type": "string", "enum": ["all", "pending", "completed"], "default": "all" },
  "sort": { "type": "string", "enum": ["created", "title", "due_date"], "default": "created" }
}
```

**Output**: Array of Task objects

---

### update_task
Update an existing task.

**Input Schema**:
```json
{
  "task_id": { "type": "integer", "required": true },
  "title": { "type": "string", "required": false, "maxLength": 200 },
  "description": { "type": "string", "required": false, "maxLength": 1000 }
}
```

**Output**: Updated Task object

**Errors**: `not_found` if task doesn't exist or belongs to another user

---

### delete_task
Delete a task permanently.

**Input Schema**:
```json
{
  "task_id": { "type": "integer", "required": true }
}
```

**Output**:
```json
{ "success": true, "task_id": 1 }
```

**Errors**: `not_found` if task doesn't exist or belongs to another user

---

### toggle_complete
Toggle the completion status of a task.

**Input Schema**:
```json
{
  "task_id": { "type": "integer", "required": true }
}
```

**Output**: Updated Task object with new `completed` value

**Errors**: `not_found` if task doesn't exist or belongs to another user

---

## Context Requirements
Each tool receives a `user_id` from the MCP server context (injected by the FastAPI chat endpoint after JWT verification). Tools must filter all database queries by this `user_id`.

## Error Taxonomy

| Error Code | Description |
|-----------|-------------|
| `not_found` | Task does not exist or belongs to another user |
| `validation_error` | Input failed schema validation |
| `database_error` | Unexpected database failure |
