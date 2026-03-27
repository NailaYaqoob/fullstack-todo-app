---
id: "0001"
title: User Auth Plan Complete
stage: plan
date: 2026-02-25
surface: agent
model: claude-sonnet-4-6
feature: user-auth
branch: 002-user-auth
user: lenovo
command: /sp.plan 002-user-auth
labels: ["plan","authentication","better-auth","jwt","fastapi","nextjs","sqlmodel","neon"]
links:
  spec: specs/002-user-auth/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/002-user-auth/plan.md
  - specs/002-user-auth/research.md
  - specs/002-user-auth/data-model.md
  - specs/002-user-auth/quickstart.md
  - specs/002-user-auth/contracts/auth-endpoints.md
  - specs/002-user-auth/contracts/jwt-verification.md
tests:
  - none
---

## Prompt

/sp.plan 002-user-auth

## Response snapshot

Completed full Phase 0 + Phase 1 implementation plan for the User Authentication feature.

**Constitution Check**: All 7 principles PASS. Principles II and III apply as creators
of the JWT infrastructure (not consumers).

**Phase 0 — Research** (`research.md`): 6 architectural decisions documented:
1. Better Auth JWT plugin config (`expiresIn: 604800`, `updateAge: 86400`)
2. Token retrieval via `authClient.token()` → `Authorization: Bearer` header
3. `python-jose[cryptography]` with HS256 for FastAPI JWT verification
4. Better Auth manages its own schema — SQLModel defines only Task (no FK constraint)
5. 7-day session via Better Auth `session.expiresIn` + rolling `updateAge`
6. Next.js `middleware.ts` with `auth.api.getSession()` for server-side route protection

**Phase 1 — Design** (data-model.md, contracts/, quickstart.md):
- `data-model.md`: User (Better Auth), Session (Better Auth), JWT payload, Task FK ref
- `contracts/auth-endpoints.md`: POST /sign-up/email, POST /sign-in/email, POST /sign-out, GET /get-session
- `contracts/jwt-verification.md`: `verify_jwt()` + `get_current_user()` FastAPI dependencies with usage pattern
- `quickstart.md`: env setup, startup commands, curl verification steps, common issues

**Agent context**: CLAUDE.md updated with language/framework/database from plan.

**Source code layout decided**:
- Frontend: `lib/auth.ts`, `lib/auth-client.ts`, `app/api/auth/[...all]/route.ts`, `app/login/`, `app/signup/`, `middleware.ts`
- Backend: `auth.py` (verify_jwt), `dependencies.py` (get_current_user), updates to `models.py` and `main.py`

## Outcome

- ✅ Impact: Full auth implementation plan ready; all 13 FRs have concrete technical mapping; JWT dependency contract enables 001-task-crud planning
- 🧪 Tests: none (planning phase — no runtime tests)
- 📁 Files: 6 files created (plan.md, research.md, data-model.md, quickstart.md, 2 contracts)
- 🔁 Next prompts: /sp.tasks 002-user-auth, then /sp.plan 001-task-crud, then /bootstrap
- 🧠 Reflection: The key insight is that Better Auth owns its own schema — SQLModel must not duplicate `user`/`session` tables. The JWT dependency contract (jwt-verification.md) is the primary handoff artifact to the 001-task-crud plan.

## Evaluation notes (flywheel)

- Failure modes observed: create-phr.sh does not accept short feature name ("user-auth") — requires numbered dir name ("002-user-auth"); documented for future use
- Graders run and results (PASS/FAIL): constitution check 7/7 PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): add explicit FR traceability table to plan.md mapping each FR to a contract entry
