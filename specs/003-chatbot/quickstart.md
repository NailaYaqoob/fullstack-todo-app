# Quickstart: AI-Powered Todo Chatbot

**Feature**: `003-chatbot` | **Date**: 2026-03-25

---

## Prerequisites

- Phase II fully working: backend `python run.py` starts, frontend `npm run dev` starts
- Neon PostgreSQL connected; `task` table exists
- `OPENAI_API_KEY` added to `backend/.env`

---

## 1. Install Dependencies

### Backend
```bash
cd backend
source .venv/bin/activate
pip install openai-agents mcp
```

### Frontend
```bash
cd frontend
npm install @openai/chatkit
```

---

## 2. Add Environment Variable

### `backend/.env` — add:
```
OPENAI_API_KEY=sk-...
```

---

## 3. Start Services

```bash
# Terminal 1 — Backend (conversation table auto-created at startup)
cd backend
python run.py

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Expected:
- Backend: `INFO: Application startup complete.` (conversation table created)
- Frontend: `Ready on http://localhost:3000`

---

## 4. Verify Chat Endpoint

### Get a JWT token (sign in first)
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "Token: ${TOKEN:0:40}..."
```

### Send first chat message (no conversation_id)
```bash
RESPONSE=$(curl -s -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Add a task: buy groceries"}')
echo $RESPONSE | python -m json.tool
CONV_ID=$(echo $RESPONSE | python -c "import sys,json; print(json.load(sys.stdin)['conversation_id'])")
echo "Conversation ID: $CONV_ID"
```
Expected: `200` with `reply` confirming task creation and `conversation_id`.

### Continue the conversation
```bash
curl -s -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Show my tasks\",\"conversation_id\":\"$CONV_ID\"}" \
  | python -m json.tool
```
Expected: `200` with assistant listing tasks including "buy groceries".

### Load conversation history
```bash
curl -s http://localhost:8000/api/chat/history \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```
Expected: `200` with `messages` array showing all turns.

---

## 5. MCP Tools Verification

```bash
# Toggle a task (get task id first)
TASK_ID=$(curl -s "http://localhost:8000/api/$USER_ID/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  | python -c "import sys,json; tasks=json.load(sys.stdin); print(tasks[0]['id']) if tasks else print('no tasks')")

curl -s -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Mark buy groceries as done\",\"conversation_id\":\"$CONV_ID\"}" \
  | python -m json.tool
```
Expected: assistant confirms completion; task list shows `completed: true`.

---

## 6. Browser End-to-End

1. Sign in at `http://localhost:3000/login`
2. Land on dashboard — chat panel visible below task list
3. Type "Add a task: read a book" → task created (shown in reply)
4. Type "Show my tasks" → assistant lists tasks
5. Type "Mark read a book as done" → task toggled
6. Refresh page → chat history reloads (FR-009)

---

## 7. Security Checks

```bash
# No token → 403
curl -s -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}' | python -m json.tool

# Verify cross-user isolation is impossible:
# User2's token cannot see or modify User1's tasks via chat,
# because MCP tools filter by user_id from JWT (not from chat message)
```

---

## 8. Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `500 Chat service error` | `OPENAI_API_KEY` missing or invalid | Check `backend/.env`; verify key is valid |
| MCP subprocess fails to start | `mcp` not installed or PATH issue | Run `pip install mcp` in venv |
| `conversation` table missing | Backend not restarted after adding Conversation model | Restart `python run.py` |
| ChatKit component not rendering | `@openai/chatkit` not installed | Run `npm install @openai/chatkit` |
| Slow responses | Cold start on Neon serverless + OpenAI API latency | Normal for first request; subsequent requests faster |
