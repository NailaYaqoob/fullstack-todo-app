# Implementation Plan: Task CRUD Operations

**Branch**: `001-task-crud` | **Date**: 2026-02-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-task-crud/spec.md`

## Summary

Implement the five core task operations (create, list, view, update, delete) plus a
toggle-completion action for the fullstack-todo-app. The FastAPI backend exposes six
REST endpoints under `/api/{user_id}/tasks`, each protected by the `get_current_user()`
JWT dependency from feature `002-user-auth`. The Next.js frontend renders the task
dashboard with a filtered task list, create/edit form, and per-task actions — all via
`frontend/lib/api.ts`. Every database query filters by the JWT-verified `user_id`;
cross-user access returns 404 with no data leakage (two-check ownership pattern).

## Technical Context

**Language/Version**: Python 3.11 (backend), TypeScript 5.x strict (frontend, Next.js 16+)
**Primary Dependencies**: FastAPI 0.111+, SQLModel 0.0.18+, asyncpg (backend); Next.js
  16+, Better Auth client (frontend for token retrieval)
**Storage**: Neon Serverless PostgreSQL — `Task` model managed by SQLModel (`table=True`);
  `user` table owned by Better Auth (referenced via `user_id: str`, no FK constraint)
**Testing**: pytest + httpx (backend — optional, not explicitly requested); no frontend
  test framework requested
**Target Platform**: Web — Next.js 16+ (Node.js), FastAPI (Linux/uvicorn)
**Project Type**: Web application — monorepo with `frontend/` and `backend/`
**Performance Goals**: Task created and visible in list < 2 sec (SC-001); list of 100
  tasks loads in < 2 sec (SC-005)
**Constraints**: Title 1–200 chars, trimmed of whitespace (FR-001); description max 1,000
  chars optional (FR-001); no pagination (≤100 tasks per spec Assumptions); sort by
  `created_at DESC` (spec Assumptions); cross-user access → 404 not 403 (FR-009)
**Scale/Scope**: Per-user task lists; no sharing; up to 100 tasks per user; single role

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven | ✅ PASS | Spec complete (14/14 checklist); plan phase |
| II. JWT Auth | ✅ PASS | All 6 task endpoints use `get_current_user()` from `002-user-auth`; zero public task routes; 401 on missing/invalid token |
| III. User Isolation | ✅ PASS | Two-check pattern: (1) URL `user_id` == JWT `user_id` → 403; (2) `_get_owned_task()` returns 404 if `task.user_id != current_user_id`. All list queries `WHERE task.user_id = current_user_id`. |
| IV. API-First | ✅ PASS | 6 REST endpoints; TypeScript `Task` interface in `frontend/lib/types.ts`; all frontend calls exclusively through `frontend/lib/api.ts` |
| V. Env Vars Only | ✅ PASS | No new secrets; `DATABASE_URL` already in `backend/db.py`; `BETTER_AUTH_SECRET` already in `backend/auth.py` |
| VI. Smallest Change | ✅ PASS | Only task CRUD + toggle; no pagination, no labels, no due dates, no sorting config |
| VII. Type Safety | ✅ PASS | TypeScript strict; `TaskCreate`, `TaskRead`, `TaskUpdate` SQLModel schemas for all request/response bodies |

**Post-design re-check**: All principles satisfied. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-task-crud/
├── plan.md              # This file (/sp.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── task-endpoints.md     # REST contract for all 6 endpoints
└── tasks.md             # Phase 2 output (/sp.tasks — NOT created by /sp.plan)
```

### Source Code

```text
backend/
├── models.py                  # Add: TaskBase, Task(table=True), TaskCreate,
│                              #      TaskRead, TaskUpdate, UserRead (type hint only)
├── routers/
│   └── tasks.py               # New: all 6 route handlers + _get_owned_task() helper
├── db.py                      # Existing: async engine, get_session() (from /db-setup)
├── auth.py                    # Existing: verify_jwt() (from 002-user-auth)
├── dependencies.py            # Existing: get_current_user() (from 002-user-auth)
└── main.py                    # Update: include_router(tasks.router)

frontend/
├── lib/
│   ├── api.ts                 # New: listTasks, createTask, getTask, updateTask,
│   │                          #      deleteTask, toggleTask — all via fetchWithAuth()
│   └── types.ts               # New: Task, TaskCreate, TaskUpdate TypeScript interfaces
├── components/
│   ├── TaskList.tsx           # New: task list with filter tabs (all/pending/completed)
│   ├── TaskCard.tsx           # New: single task row (toggle, edit button, delete button)
│   └── TaskForm.tsx           # New: create/edit form (title + description)
└── app/
    └── dashboard/
        └── page.tsx           # Update: fetch tasks via api.ts, render TaskList
```

**Structure Decision**: Web application (Option 2) — monorepo. Backend routers split
into `backend/routers/tasks.py` for clean separation. Frontend components extracted for
independence and reuse within the dashboard.

## Complexity Tracking

No constitution violations detected. Table not required.
