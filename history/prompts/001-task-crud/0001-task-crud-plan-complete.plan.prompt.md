---
id: "0001"
title: Task CRUD Plan Complete
stage: plan
date: 2026-02-25
surface: agent
model: claude-sonnet-4-6
feature: task-crud
branch: 001-task-crud
user: lenovo
command: /sp.plan 001-task-crud
labels: ["plan","task-crud","fastapi","sqlmodel","nextjs","jwt","uuid","rest","user-isolation"]
links:
  spec: specs/001-task-crud/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-task-crud/plan.md
  - specs/001-task-crud/research.md
  - specs/001-task-crud/data-model.md
  - specs/001-task-crud/quickstart.md
  - specs/001-task-crud/contracts/task-endpoints.md
tests:
  - none
---

## Prompt

/sp.plan 001-task-crud

## Response snapshot

Completed full Phase 0 + Phase 1 implementation plan for the Task CRUD feature.

**Constitution Check**: All 7 principles PASS. Principles II and III are the primary
enforcement points — all 6 endpoints use `get_current_user()` from 002-user-auth;
two-check ownership pattern returns 404 (not 403) for cross-user access (FR-009).

**Phase 0 — Research** (`research.md`): 8 decisions documented:
1. UUID4 task IDs (prevents sequential enumeration)
2. Two-check ownership: URL user_id == JWT user_id (403) + _get_owned_task() (404)
3. PATCH for partial updates + separate /toggle endpoint for completion
4. `?status=pending|completed` query param with Literal type validation
5. Pydantic field_validator for whitespace-only title rejection
6. Manual updated_at = datetime.utcnow() in each PATCH handler
7. Sort by created_at DESC; no pagination (≤100 tasks per spec)
8. fetchWithAuth() pattern in frontend/lib/api.ts

**Phase 1 — Design** (data-model.md, contracts/, quickstart.md):
- `data-model.md`: Task (table=True) with UUID PK, TaskBase/TaskCreate/TaskRead/TaskUpdate;
  TypeScript interfaces; critical note that only `task` table is SQLModel-owned
- `contracts/task-endpoints.md`: All 6 endpoints with full request/response shapes,
  error codes, and implementation code snippets
- `quickstart.md`: Token retrieval, curl commands for all 6 endpoints, security
  verification tests, browser E2E checklist

**Source code layout:**
- Backend: `backend/models.py` (extend), `backend/routers/tasks.py` (new),
  `backend/main.py` (update include_router)
- Frontend: `frontend/lib/api.ts` + `frontend/lib/types.ts` (new),
  `frontend/components/TaskList.tsx` + `TaskCard.tsx` + `TaskForm.tsx` (new),
  `frontend/app/dashboard/page.tsx` (extend from auth feature)

## Outcome

- ✅ Impact: Full task CRUD plan ready; all 11 FRs have concrete technical mapping; two-check ownership pattern satisfies FR-009 + Principle III with zero data leakage
- 🧪 Tests: none (planning phase)
- 📁 Files: 5 files (plan.md, research.md, data-model.md, quickstart.md, contracts/task-endpoints.md)
- 🔁 Next prompts: /sp.tasks 001-task-crud, then /bootstrap to scaffold, then /sp.implement 002-user-auth → /sp.implement 001-task-crud
- 🧠 Reflection: The key handoff from 002-user-auth is get_current_user() — every task endpoint depends on it. The two-check pattern (URL == JWT, then 404 for task ownership) satisfies both Principle III and FR-009 cleanly. The frontend/lib/api.ts + types.ts separation keeps type safety independent of API implementation.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): constitution check 7/7 PASS; all 11 FRs mapped to contract entries
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): add OpenAPI JSON schema file in contracts/ for automatic validation tooling
