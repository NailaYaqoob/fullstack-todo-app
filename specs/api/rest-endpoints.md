# REST API Endpoints

**Service**: FastAPI backend (`http://localhost:8000`)
**Phase**: II — Full-Stack Web Application

## Base URL
- Development: `http://localhost:8000`
- Production: `https://api.<your-domain>.com`

## Authentication
All endpoints require a valid JWT token issued by Better Auth:

```
Authorization: Bearer <token>
```

- Missing or invalid token → `401 Unauthorized`
- Token verified using shared `BETTER_AUTH_SECRET`
- `user_id` extracted from token payload; all queries filtered by it

## Error Responses

| Status | Meaning |
|--------|---------|
| `400` | Bad Request — invalid input |
| `401` | Unauthorized — missing or invalid JWT |
| `404` | Not Found — task does not exist or belongs to another user |
| `422` | Unprocessable Entity — validation error |
| `500` | Internal Server Error |

---

## Task Endpoints

### GET /api/{user_id}/tasks
List all tasks for the authenticated user.

**Auth**: Required (JWT `user_id` must match path `user_id`)

**Query Parameters**:
| Param | Type | Values | Default |
|-------|------|--------|---------|
| `status` | string | `"all"` \| `"pending"` \| `"completed"` | `"all"` |
| `sort` | string | `"created"` \| `"title"` \| `"due_date"` | `"created"` |

**Response `200`**:
```json
[
  {
    "id": 1,
    "user_id": "user_abc",
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "completed": false,
    "created_at": "2026-03-25T10:00:00Z",
    "updated_at": "2026-03-25T10:00:00Z"
  }
]
```

---

### POST /api/{user_id}/tasks
Create a new task.

**Auth**: Required

**Request Body**:
```json
{
  "title": "string (required, 1-200 chars)",
  "description": "string (optional, max 1000 chars)"
}
```

**Response `201`**: Created Task object

**Errors**: `422` if title is missing or exceeds length limit

---

### GET /api/{user_id}/tasks/{id}
Get a single task by ID.

**Auth**: Required

**Response `200`**: Task object

**Errors**: `404` if task not found or belongs to another user

---

### PUT /api/{user_id}/tasks/{id}
Update a task (full replacement).

**Auth**: Required

**Request Body**:
```json
{
  "title": "string (required)",
  "description": "string (optional)"
}
```

**Response `200`**: Updated Task object

**Errors**: `404` if not found; `422` on validation failure

---

### DELETE /api/{user_id}/tasks/{id}
Delete a task permanently.

**Auth**: Required

**Response `204`**: No Content

**Errors**: `404` if not found or belongs to another user

---

### PATCH /api/{user_id}/tasks/{id}/complete
Toggle task completion status.

**Auth**: Required

**Response `200`**: Updated Task object with flipped `completed` value

**Errors**: `404` if not found or belongs to another user

---

## Chat Endpoint (Phase III)

### POST /api/chat
Send a message to the AI Todo assistant.

**Auth**: Required

**Request Body**:
```json
{
  "message": "string (required)",
  "conversation_id": "string (optional — creates new if omitted)"
}
```

**Response `200`**:
```json
{
  "reply": "string",
  "conversation_id": "string"
}
```
