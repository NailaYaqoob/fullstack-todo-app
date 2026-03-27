# Quickstart: Task CRUD Operations

**Feature**: `001-task-crud` | **Date**: 2026-02-25

---

## Prerequisites

- Authentication feature (`002-user-auth`) fully implemented and working
- `backend/db.py` with `create_db_and_tables()` (from `/db-setup`)
- `backend/auth.py` and `backend/dependencies.py` (from `002-user-auth`)
- Neon PostgreSQL connected; `task` table created at startup
- Both services running: backend on `http://localhost:8000`, frontend on `http://localhost:3000`

---

## 1. Start Services

```bash
# Terminal 1 — Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Expected:
- Backend: `INFO: Application startup complete.` (task table created)
- Frontend: `Ready on http://localhost:3000`

---

## 2. Get a JWT Token

```bash
# Sign in (assumes test account created via /signup page or sign-up curl)
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['token'])")

USER_ID=$(curl -s -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['user']['id'])")

echo "USER_ID: $USER_ID"
echo "TOKEN: ${TOKEN:0:40}..."
```

---

## 3. Verify Endpoints with curl

### Create a task
```bash
curl -s -X POST "http://localhost:8000/api/$USER_ID/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy groceries","description":"Milk, eggs, bread"}' \
  | python -m json.tool
```
Expected: `201` with `TaskRead` JSON including `id`, `completed: false`, `created_at`.

### List tasks
```bash
curl -s "http://localhost:8000/api/$USER_ID/tasks" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```
Expected: `200` with array containing the created task.

### Filter by status
```bash
curl -s "http://localhost:8000/api/$USER_ID/tasks?status=pending" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```
Expected: same task (still pending).

### Toggle completion
```bash
TASK_ID=<id from create response>
curl -s -X PATCH "http://localhost:8000/api/$USER_ID/tasks/$TASK_ID/toggle" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```
Expected: `200` with `"completed": true`.

```bash
# Filter completed — should now appear
curl -s "http://localhost:8000/api/$USER_ID/tasks?status=completed" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```

### Update task
```bash
curl -s -X PATCH "http://localhost:8000/api/$USER_ID/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy groceries and snacks"}' \
  | python -m json.tool
```
Expected: `200` with updated `title` and new `updated_at`.

### Get single task
```bash
curl -s "http://localhost:8000/api/$USER_ID/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```

### Delete task
```bash
curl -s -X DELETE "http://localhost:8000/api/$USER_ID/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}"
```
Expected: `204`.

```bash
# Confirm gone — should return 404
curl -s "http://localhost:8000/api/$USER_ID/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```

---

## 4. Verify Security (Principle III)

### Cross-user access returns 404
```bash
# Get a second user's token (create a second account first)
TOKEN2=<token for user2>
# Try to access user1's task with user2's token
curl -s "http://localhost:8000/api/$USER_ID/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN2" | python -m json.tool
```
Expected: `404 Task not found` (not 403 — no information leakage, FR-009).

### URL user_id mismatch returns 403
```bash
# Use correct token but wrong user_id in URL
curl -s "http://localhost:8000/api/wrong-user-id/tasks" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```
Expected: `403 Forbidden`.

### No token returns 403
```bash
curl -s "http://localhost:8000/api/$USER_ID/tasks" | python -m json.tool
```
Expected: `403` (HTTPBearer default when no Authorization header).

---

## 5. Browser End-to-End

1. Sign in at `http://localhost:3000/login`
2. Land on `http://localhost:3000/dashboard` — see empty state message (SC-004)
3. Create a task using the form — task appears immediately (SC-001)
4. Click toggle on the task — status changes visually
5. Click edit — update title; confirm change
6. Click delete — task removed from list
7. Use filter tabs to switch between All / Pending / Completed views

---

## 6. Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `404` on any task endpoint | `task` table not created | Check `create_db_and_tables()` runs on startup |
| `401` on task endpoints | Expired or mismatched JWT | Re-sign-in to get fresh token |
| `422` on task create | Title too long, empty, or whitespace-only | Trim and validate on frontend before submit |
| `500` on startup | `DATABASE_URL` or `BETTER_AUTH_SECRET` missing | Check `backend/.env` |
| Tasks from another user visible | Principle III violation | Verify all queries filter by `user_id` |
