# Implementation Plan: AI-Powered Todo Chatbot

**Branch**: `003-chatbot` | **Date**: 2026-03-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-chatbot/spec.md`

---

## Summary

Add a natural language chat interface to the todo dashboard. Users interact with an AI agent (OpenAI Agents SDK + `openai-agents` v0.13.1) that performs task CRUD operations via an MCP server (`mcp` v1.26.0 / `FastMCP`). Conversation history is persisted to a `conversation` table in Neon PostgreSQL. The frontend uses `@openai/chatkit` v1.6.0 chat UI components wired to a custom JWT-protected `POST /api/chat` endpoint.

---

## Technical Context

**Language/Version**: Python 3.11 (backend), TypeScript 5.x strict (frontend, Next.js 16+)
**Primary Dependencies**: `openai-agents` v0.13.1, `mcp` v1.26.0, `@openai/chatkit` v1.6.0, FastAPI 0.111+, SQLModel 0.0.18+, asyncpg
**Storage**: Neon Serverless PostgreSQL — new `conversation` table (append-only message rows)
**Testing**: pytest (backend), Jest / React Testing Library (frontend)
**Target Platform**: Windows (dev) / Linux (prod); Python 3.14 dev requires `WindowsSelectorEventLoopPolicy` via `run.py`
**Project Type**: Web application (Next.js frontend + FastAPI backend monorepo)
**Performance Goals**: Chat response < 10s p95 (OpenAI API latency dominates); history load < 500ms
**Constraints**: OPENAI_API_KEY required; MCP subprocess per request (acceptable for low traffic); last 20 messages in AI context window to bound token cost
**Scale/Scope**: Single-user thread per user in Phase III; multi-thread in Phase IV

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Smallest viable change | ✅ PASS | New files only; existing routes/models unchanged except adding `Conversation` model |
| No hardcoded secrets | ✅ PASS | `OPENAI_API_KEY` via `backend/.env`; never in source |
| JWT authentication | ✅ PASS | `POST /api/chat` uses `Depends(get_current_user)`; `user_id` from JWT only |
| User isolation | ✅ PASS | MCP tools receive `USER_ID` via `env=` injection, never from tool args |
| No raw exceptions exposed | ✅ PASS | Agent errors caught → `HTTP 500 "Chat service error"` |
| Async-first | ✅ PASS | All DB ops via `AsyncSession`; `Runner.run()` is async |
| Windows compatibility | ✅ PASS | Same `run.py` `WindowsSelectorEventLoopPolicy` already in place |

---

## Project Structure

### Documentation (this feature)

```text
specs/003-chatbot/
├── plan.md              ← this file
├── research.md          ← Phase 0: package decisions
├── data-model.md        ← Conversation model + request/response shapes
├── quickstart.md        ← end-to-end verification guide
├── contracts/
│   ├── chat-endpoint.md ← POST /api/chat + GET /api/chat/history
│   └── mcp-tools.md     ← 5 MCP tool contracts
└── tasks.md             ← Phase 2 output (/sp.tasks — not yet created)
```

### Source Code (repository root)

```text
backend/
├── mcp_server.py           ← NEW: FastMCP server with 5 task tools
├── routers/
│   └── chat.py             ← NEW: POST /api/chat + GET /api/chat/history
├── models.py               ← UPDATE: add Conversation SQLModel
├── main.py                 ← UPDATE: include chat router; Conversation table auto-created
├── run.py                  ← EXISTING (Windows event loop fix — no change needed)
└── .env                    ← UPDATE: add OPENAI_API_KEY

frontend/
├── components/
│   └── ChatPanel.tsx        ← NEW: @openai/chatkit UI wired to /api/chat
├── app/
│   └── dashboard/
│       └── page.tsx         ← UPDATE: render <ChatPanel /> below task list
├── lib/
│   └── api.ts               ← UPDATE: add chatApi.send() + chatApi.history()
└── types.ts                 ← UPDATE: add ChatMessage, ChatRequest, ChatResponse
```

---

## Architecture

```
User (browser)
  │
  ▼
ChatPanel.tsx  (@openai/chatkit UI)
  │  POST /api/chat  {message, conversation_id?}
  ▼
FastAPI  backend/routers/chat.py
  │  Depends(get_current_user) → user_id from JWT
  │  Load last 20 messages from conversation table
  │
  ▼
openai-agents Runner.run()
  │  MCPServerStdio(env={"USER_ID": user_id, "DATABASE_URL": ...})
  ▼
backend/mcp_server.py  (FastMCP stdio subprocess)
  │  create_task / list_tasks / update_task / delete_task / toggle_complete
  ▼
Neon PostgreSQL  (task table — user_id filtered)
  │
  ◄── tool result ──
  ◄── assistant reply ──
  │
FastAPI persists {user_msg, assistant_reply} to conversation table
  │
  ▼
ChatPanel.tsx displays reply; stores conversation_id for next request
```

---

## Key Design Decisions

### 1. MCPServerStdio per request
Each `POST /api/chat` spawns a fresh MCP subprocess via `async with MCPServerStdio(...)`. Simple, stateless, no pooling complexity. Acceptable for Phase III traffic. Phase IV can upgrade to persistent `MCPServerSSE` if needed.

### 2. USER_ID injected via environment variable
`MCPServerStdio(env={"USER_ID": user_id})` — MCP tools read `os.environ["USER_ID"]`. The AI agent never passes user_id as a tool argument, making cross-user access structurally impossible.

### 3. Single conversation thread per user (Phase III)
Backend checks for an existing thread before creating a new one. Simplifies frontend state management. Multi-thread support deferred to Phase IV.

### 4. @openai/chatkit wired to custom backend
ChatKit provides the UI layer (message list, input box). The submit handler calls our `fetchWithAuth(POST /api/chat)` instead of the OpenAI Responses API directly. Exact component API (`<Thread>`, `<MessageInput>`, or unified `<ChatKit>`) verified from `node_modules/@openai/chatkit` TypeScript types at implementation time.

### 5. Context window capped at 20 messages
Last 20 messages loaded from DB per request (10 turns). Keeps token cost bounded. Full history still displayed in UI via `GET /api/chat/history` (no cap).

---

## Environment Variables

| Variable | Location | Required | Notes |
|----------|----------|----------|-------|
| `OPENAI_API_KEY` | `backend/.env` | ✅ | OpenAI API key for Agents SDK |
| `DATABASE_URL` | `backend/.env` | ✅ (existing) | Passed to MCP subprocess env |
| `BETTER_AUTH_SECRET` | `backend/.env` | ✅ (existing) | JWT verification |

No new frontend env vars required (chat calls go to `NEXT_PUBLIC_API_URL` which already exists).

---

## API Surface

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/chat` | Bearer JWT | Send message, get AI reply |
| GET | `/api/chat/history` | Bearer JWT | Load all conversation messages |

Full contracts: [chat-endpoint.md](./contracts/chat-endpoint.md)

---

## MCP Tools Surface

| Tool | Input | Output |
|------|-------|--------|
| `create_task` | `title, description?` | task object |
| `list_tasks` | `status?` ("all"/"pending"/"completed") | task array |
| `update_task` | `task_id, title?, description?` | updated task |
| `delete_task` | `task_id` | `{success: true, task_id}` |
| `toggle_complete` | `task_id` | updated task |

Full contracts: [mcp-tools.md](./contracts/mcp-tools.md)

---

## Data Model Changes

New table: `conversation` (append-only message rows).
No changes to existing `task` table.

Full schema: [data-model.md](./data-model.md)

---

## Dependencies to Install

### Backend
```bash
cd backend
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install openai-agents mcp
```

### Frontend
```bash
cd frontend
npm install @openai/chatkit
```

---

## Phase 1 Post-Design Constitution Check

All gates pass (see table above). No complexity violations. No NEEDS CLARIFICATION items remain. Feature is ready for `/sp.tasks`.

---

## Risks

1. **@openai/chatkit API surface**: Exact component names and props require verification from installed package TypeScript types. Mitigation: implementation falls back to a simple custom React component (~60 lines) if wiring is not straightforward.
2. **MCP subprocess startup time**: Each request spawns a Python subprocess. Cold start adds ~200–500ms. Mitigation: acceptable for Phase III; documented in quickstart.
3. **OpenAI API unavailability**: If `OPENAI_API_KEY` is missing or invalid, all chat requests fail with HTTP 500. Mitigation: clear error in quickstart; env var check on startup.
