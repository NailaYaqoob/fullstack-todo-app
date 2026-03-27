# Implementation Plan: User Authentication

**Branch**: `002-user-auth` | **Date**: 2026-02-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-user-auth/spec.md`

## Summary

Implement email/password authentication using Better Auth (JWT plugin) on the Next.js
frontend and a `verify_jwt()` / `get_current_user()` dependency pair on the FastAPI
backend. The frontend handles signup, signin, signout, session persistence (7 days), and
route protection via middleware. The backend exposes the JWT verification layer that all
subsequent task-CRUD routes will consume. Better Auth manages its own `user` and `session`
tables; SQLModel manages only the `task` table (future feature).

## Technical Context

**Language/Version**: Python 3.11 (backend), TypeScript 5.x strict (frontend, Next.js 16+)
**Primary Dependencies**: Better Auth 1.x + `jwt` plugin (frontend), FastAPI 0.111+
  (backend), `python-jose[cryptography]` (backend), SQLModel 0.0.18+ (backend), asyncpg
**Storage**: Neon Serverless PostgreSQL — Better Auth manages `user`, `session`, `account`
  tables; SQLModel manages `task` table (001-task-crud feature)
**Testing**: pytest + httpx (backend unit/integration), Jest + Testing Library (frontend)
**Target Platform**: Web — Next.js 16+ (Node.js server / Vercel), FastAPI (Linux/uvicorn)
**Project Type**: Web application — monorepo with `frontend/` and `backend/`
**Performance Goals**: Signup < 2 min end-to-end (SC-001), signin < 30 s (SC-002),
  unauthenticated redirect imperceptible (SC-003)
**Constraints**: Session fixed 7 days (FR-008); generic error on failed signin — no field
  hint (FR-007); passwords never plain text (FR-013); whitespace-only name rejected (edge)
**Scale/Scope**: Single user role, multi-device simultaneous sessions, no MFA, no email
  verification, no password reset in Phase II

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven | ✅ PASS | Spec complete (14/14 checklist); this is the plan phase |
| II. JWT Auth | ✅ APPLIES | This feature *creates* the JWT infrastructure. Sign-up and sign-in routes are intentionally public (Better Auth built-ins). All other backend routes MUST use `get_current_user()`. |
| III. User Isolation | ✅ APPLIES | `user_id` extracted from JWT `sub` claim only. Task CRUD feature will depend on this dependency. |
| IV. API-First | ✅ PASS | Better Auth exposes REST endpoints via Next.js route handler; FastAPI dependency is consumed by all task routes |
| V. Env Vars Only | ✅ PASS | `BETTER_AUTH_SECRET` and `DATABASE_URL` loaded from `.env` / `.env.local`; fail-fast if missing |
| VI. Smallest Change | ✅ PASS | Auth only — no task CRUD. No speculative abstractions. |
| VII. Type Safety | ✅ PASS | TypeScript strict mode; Pydantic models for all FastAPI responses |

**Post-design re-check**: All principles satisfied by Phase 1 design. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-user-auth/
├── plan.md              # This file (/sp.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── auth-endpoints.md     # Better Auth REST contract
│   └── jwt-verification.md   # FastAPI JWT dependency contract
└── tasks.md             # Phase 2 output (/sp.tasks — NOT created by /sp.plan)
```

### Source Code

```text
frontend/
├── app/
│   ├── api/auth/[...all]/
│   │   └── route.ts          # Better Auth Next.js handler (all auth endpoints)
│   ├── login/
│   │   └── page.tsx          # Sign-in page (client component)
│   ├── signup/
│   │   └── page.tsx          # Sign-up page (client component)
│   └── dashboard/            # Protected route (redirect target after auth)
├── lib/
│   ├── auth.ts               # Better Auth server config (JWT plugin + session config)
│   └── auth-client.ts        # Better Auth client instance (signIn, signUp, signOut, useSession)
└── middleware.ts             # Route protection: /dashboard → /login if unauth

backend/
├── auth.py                   # verify_jwt() FastAPI dependency (HTTPBearer + python-jose)
├── dependencies.py           # get_current_user() → extracts user_id from JWT sub claim
├── models.py                 # Task model (user_id: str field); UserRead for type hints
└── main.py                   # CORSMiddleware + lifespan startup; BETTER_AUTH_SECRET check
```

**Structure Decision**: Web application — monorepo. Frontend handles auth UI and Better
Auth server; backend exposes JWT verification layer only. No auth-specific FastAPI routes
needed (Better Auth is entirely frontend-side).

## Complexity Tracking

No constitution violations detected. Table not required.
