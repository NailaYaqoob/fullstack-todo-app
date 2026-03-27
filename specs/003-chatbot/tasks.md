# Tasks: AI-Powered Todo Chatbot

**Input**: Design documents from `/specs/003-chatbot/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not explicitly requested in spec — no test tasks generated. Implementation tasks are structured so each phase produces a manually verifiable increment.

**Organization**: Tasks grouped by user story; each phase is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete sibling tasks)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Dependencies & Environment)

**Purpose**: Install required packages and configure environment variables. Must complete before any implementation.

- [x] T001 Install backend Python packages: `pip install openai-agents mcp` in `backend/` (activate `.venv` first)
- [x] T002 [P] Install frontend npm package: `npm install @openai/chatkit` in `frontend/`
- [x] T003 [P] Add `OPENAI_API_KEY=sk-...` placeholder to `backend/.env` and document in `backend/.env.example`

**Checkpoint**: `python -c "import agents; import mcp"` succeeds; `node -e "require('@openai/chatkit')"` succeeds from `frontend/node_modules`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure shared by ALL user stories. No story work can begin until this phase is complete.

**⚠️ CRITICAL**: Complete in order — T004 before T005; T006 and T007 can run parallel to each other and to T004/T005.

- [x] T004 Add `Conversation` SQLModel class to `backend/models.py` — fields: `id` (uuid PK), `conversation_id` (str, indexed), `user_id` (str, indexed), `role` (str), `content` (str), `created_at` (datetime utcnow); also add `ChatRequest` and `ChatResponse` Pydantic models
- [x] T005 Update `backend/main.py` to include the chat router (`from routers.chat import router as chat_router`; `app.include_router(chat_router)`) and ensure `Conversation` is imported so `SQLModel.metadata.create_all` creates the table at startup
- [x] T006 [P] Add TypeScript interfaces to `frontend/types.ts`: `ChatMessage { role, content, created_at }`, `ChatRequest { message, conversation_id? }`, `ChatResponse { reply, conversation_id }`
- [x] T007 [P] Add `chatApi` object to `frontend/lib/api.ts` with two functions: `send(req: ChatRequest): Promise<ChatResponse>` calling `POST /api/chat` with Bearer JWT, and `history(): Promise<{ conversation_id: string | null; messages: ChatMessage[] }>` calling `GET /api/chat/history` with Bearer JWT

**Checkpoint**: Backend restarts without errors; `conversation` table visible in Neon console; TypeScript compiles without errors (`npx tsc --noEmit`)

---

## Phase 3: User Story 1 — Create Task via Chat (Priority: P1) 🎯 MVP

**Goal**: User types "Add a task: buy groceries" → AI creates the task → confirmation reply displayed in chat panel.

**Independent Test**: Start backend (`python run.py`), start frontend (`npm run dev`). Sign in, open dashboard. Type "Add a task: buy milk" in the chat input, click Send. Assert: assistant reply confirms creation; task "buy milk" appears in the task list (after manual refresh).

- [x] T008 Create `backend/mcp_server.py`: initialize `FastMCP("Todo Tools")`; set up async `get_session()` using `DATABASE_URL` from `os.environ`; implement `create_task(title: str, description: str = "") -> dict` tool — reads `user_id = os.environ["USER_ID"]`, validates title length (1–200 chars), inserts `Task` row, returns task dict; add `if __name__ == "__main__": mcp.run()` entry point
- [x] T009 Create `backend/routers/chat.py`: define `POST /api/chat` endpoint with `Depends(get_current_user)` and `Depends(get_session)`; implement `_get_or_create_conversation(user_id, session)` (SELECT existing or generate new UUID); implement `_load_history(conv_id, session)` (last 20 DESC, reversed); implement `_run_agent(user_id, history, message)` using `async with MCPServerStdio(params={"command": "python", "args": ["mcp_server.py"]}, env={"USER_ID": user_id, "DATABASE_URL": os.getenv("DATABASE_URL","")})` + `Agent` + `Runner.run()`; persist user + assistant messages; return `ChatResponse`; catch all agent exceptions → `HTTP 500 "Chat service error"`
- [x] T010 [P] Create `frontend/components/ChatPanel.tsx`: inspect `node_modules/@openai/chatkit` TypeScript types to identify correct component API; wire submit handler to `chatApi.send()` storing `conversation_id` in `useState`; display message history in order (user messages right-aligned, assistant left-aligned); show loading state while awaiting reply; if `@openai/chatkit` requires direct OpenAI API access (not custom endpoint), fall back to a minimal custom React component (~60 lines) with the same props and behaviour
- [x] T011 Update `frontend/app/dashboard/page.tsx` to import `ChatPanel` and render `<ChatPanel />` below the existing task list, inside the authenticated layout

**Checkpoint**: `curl -X POST http://localhost:8000/api/chat -H "Authorization: Bearer $TOKEN" -d '{"message":"Add a task: buy groceries"}' | python -m json.tool` → `200` with `reply` and `conversation_id`; task visible in Neon `task` table.

---

## Phase 4: User Story 2 — View Tasks via Chat (Priority: P2)

**Goal**: User types "Show my tasks" → assistant lists all tasks with titles and completion status.

**Independent Test**: User with 3 tasks types "Show my tasks". Assert: reply lists all 3 tasks. User with no tasks types "What are my tasks?" → reply says no tasks found.

- [x] T012 Add `list_tasks(status: str = "all") -> list[dict]` tool to `backend/mcp_server.py`: reads `user_id` from env; queries `Task` table filtered by `user_id`; applies status filter (`all` | `pending` → `completed=False` | `completed` → `completed=True`); returns list of task dicts; returns `[]` (never raises) if no tasks found

**Checkpoint**: Chat message "Show my tasks" returns a list; "Show pending tasks" returns only incomplete tasks. Verify via `curl` or browser chat panel.

---

## Phase 5: User Story 3 — Toggle Complete via Chat (Priority: P3)

**Goal**: User types "Mark buy groceries as done" → task toggled to completed → confirmation reply.

**Independent Test**: User with pending task "buy groceries" sends "Mark buy groceries as done". Assert: task in DB now has `completed=true`; assistant reply confirms.

- [x] T013 Add `toggle_complete(task_id: str) -> dict` tool to `backend/mcp_server.py`: parses `task_id` as UUID; queries `Task` filtered by `user_id` AND `id`; if not found returns `{"error": "Task not found"}`; flips `task.completed`; commits; returns updated task dict

**Checkpoint**: Chat message "Mark buy groceries as done" → reply confirms; verify `completed=true` in Neon. "Reopen buy groceries" → `completed=false`.

---

## Phase 6: User Story 4 — Update Task via Chat (Priority: P4)

**Goal**: User types "Rename buy groceries to buy groceries and snacks" → task title updated → confirmation reply.

**Independent Test**: User with task "buy groceries" sends "Rename buy groceries to buy groceries and snacks". Assert: task title updated in DB; reply confirms.

- [x] T014 Add `update_task(task_id: str, title: str = None, description: str = None) -> dict` tool to `backend/mcp_server.py`: parses `task_id` as UUID; queries `Task` filtered by `user_id` AND `id`; if not found returns `{"error": "Task not found"}`; validates new title length if provided (1–200 chars); applies changes; commits; returns updated task dict

**Checkpoint**: Chat message "Rename buy groceries to buy groceries and snacks" → reply confirms updated title; verify in Neon.

---

## Phase 7: User Story 5 — Delete Task via Chat (Priority: P5)

**Goal**: User types "Delete buy groceries" → task permanently removed → confirmation reply.

**Independent Test**: User with task "buy groceries" sends "Delete buy groceries". Assert: task no longer in DB; reply confirms deletion.

- [x] T015 Add `delete_task(task_id: str) -> dict` tool to `backend/mcp_server.py`: parses `task_id` as UUID; queries `Task` filtered by `user_id` AND `id`; if not found returns `{"error": "Task not found"}`; deletes row; commits; returns `{"success": true, "task_id": str(task_id)}`

**Checkpoint**: Chat message "Delete buy groceries" → reply confirms; task row gone from Neon `task` table.

---

## Phase 8: User Story 6 — Conversation History (Priority: P6)

**Goal**: On page load (and after refresh), the full conversation history for the authenticated user is displayed in the chat panel.

**Independent Test**: Send 3 messages, refresh page. Assert: all 3 user messages and 3 assistant replies appear in order in the chat panel.

- [x] T016 Add `GET /api/chat/history` endpoint to `backend/routers/chat.py`: `Depends(get_current_user)` + `Depends(get_session)`; SELECT all `Conversation` rows for `user_id` ordered by `created_at ASC`; if none found return `{"conversation_id": null, "messages": []}`; otherwise return `{"conversation_id": conv_id, "messages": [{role, content, created_at}...]}`
- [x] T017 [P] Update `frontend/components/ChatPanel.tsx` to call `chatApi.history()` in a `useEffect` on mount; populate the message list state with the returned messages; set `conversationId` state from `history.conversation_id` so subsequent sends reuse the same thread

**Checkpoint**: `curl http://localhost:8000/api/chat/history -H "Authorization: Bearer $TOKEN"` → `200` with full message array; page refresh shows prior messages in chat panel.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Edge case handling, UI guards, and security verification.

- [x] T018 Add pending/loading state to `frontend/components/ChatPanel.tsx`: disable the send button (`disabled={isPending}`) and show a loading indicator while `chatApi.send()` is in-flight (FR-014)
- [x] T019 Add 2000-character input limit to `frontend/components/ChatPanel.tsx`: show visible character counter (e.g. "1847 / 2000"); disable send button when input is empty or over 2000 characters; client-side only, matches backend 422 validation
- [x] T020 [P] Security smoke-test: verify `curl -X POST http://localhost:8000/api/chat -d '{"message":"hello"}'` (no token) returns `403`; verify sending "Show my tasks" as User A does not return User B's tasks (USER_ID env injection enforces isolation structurally)

---

## Dependency Graph

```
T001 → T008 → T009 → T011
T002 ↗           ↗
T003 ↗    T010 ↗
T004 → T005
T006 → T007 → T010
            ↘ T011

Story sequence (all depend on Phase 2):
Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6 (US4) → Phase 7 (US5)
Phase 3 (US1) → Phase 8 (US6) [T016 depends on T009 for router; T017 on T016]

Phase 9 depends on all stories complete.
```

## Parallel Execution Opportunities

| Phase | Parallel Group |
|-------|---------------|
| Phase 1 | T002, T003 can run in parallel after T001 |
| Phase 2 | T006, T007 can run in parallel with T004, T005 |
| Phase 3 | T009 (backend) + T010 (frontend) run in parallel |
| Phase 9 | T019, T020 run in parallel after T018 |

## Implementation Strategy

**MVP** (ship after Phase 3): User can create tasks via chat. Core value delivered.

**Increment 2** (Phases 4–7): All 5 CRUD operations available via chat.

**Increment 3** (Phase 8): Conversation history persists across sessions.

**Increment 4** (Phase 9): Polish, edge case hardening, security verification.

## Summary

| Phase | Stories | Tasks | Parallel? |
|-------|---------|-------|-----------|
| Phase 1: Setup | — | T001–T003 | T002, T003 ∥ |
| Phase 2: Foundation | — | T004–T007 | T006, T007 ∥ |
| Phase 3: US1 Create | P1 🎯 | T008–T011 | T009, T010 ∥ |
| Phase 4: US2 List | P2 | T012 | — |
| Phase 5: US3 Toggle | P3 | T013 | — |
| Phase 6: US4 Update | P4 | T014 | — |
| Phase 7: US5 Delete | P5 | T015 | — |
| Phase 8: US6 History | P6 | T016–T017 | T017 ∥ |
| Phase 9: Polish | — | T018–T020 | T019, T020 ∥ |
| **Total** | **6 stories** | **20 tasks** | **7 parallel pairs** |
