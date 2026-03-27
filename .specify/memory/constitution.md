<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0
Modified principles: N/A (initial ratification from template)

Added sections:
  - I.   Spec-Driven Development
  - II.  JWT Auth Enforcement
  - III. User Isolation
  - IV.  API-First Design
  - V.   Environment Variables Only
  - VI.  Smallest Viable Change
  - VII. Type Safety
  - Technology Stack (reference)
  - Development Workflow

Templates reviewed:
  ✅ .specify/templates/plan-template.md — Constitution Check gate preserved; no structural changes required
  ✅ .specify/templates/spec-template.md — Functional requirements format aligns with JWT/User Isolation constraints
  ✅ .specify/templates/tasks-template.md — Phase 2 foundational tasks map to JWT middleware + env config setup

Deferred TODOs: none
-->

# fullstack-todo-app Constitution

## Core Principles

### I. Spec-Driven Development
Every feature MUST follow the full spec → plan → tasks → implement cycle before any
code is written. No manual coding outside this workflow is permitted.

- All work starts with a spec in `specs/features/<feature-name>/spec.md`
- Plans MUST be approved before tasks are generated
- Tasks MUST be approved before implementation begins
- The cycle is: `/sp.specify` → `/sp.plan` → `/sp.tasks` → `/sp.implement`

### II. JWT Auth Enforcement
Every API endpoint MUST require a valid JWT token. No public endpoints exist beyond
the auth signup/signin routes provided by Better Auth.

- Better Auth issues JWT tokens on the Next.js frontend
- FastAPI verifies every request using the shared `BETTER_AUTH_SECRET` env var
- Requests without a valid token MUST receive `401 Unauthorized`
- The JWT plugin MUST be enabled in the Better Auth configuration
- Frontend API client MUST attach `Authorization: Bearer <token>` on every call

### III. User Isolation
Every database query that reads or mutates task data MUST filter by the
authenticated user's ID. Cross-user data access is a critical security violation.

- All task queries MUST include a `WHERE user_id = <authenticated_user_id>` filter
- The authenticated `user_id` MUST be extracted from the verified JWT, never from the
  URL or request body alone
- URL `user_id` params MUST be validated against the JWT-decoded `user_id`
- Users MUST only see, update, and delete their own tasks

### IV. API-First Design
The backend exposes a RESTful JSON API. The frontend communicates with the backend
exclusively through `/frontend/lib/api.ts`. No direct database access from frontend.

- All backend endpoints MUST live under `/api/` prefix
- All request/response shapes MUST be defined with Pydantic models (backend) and
  TypeScript interfaces (frontend)
- `/frontend/lib/api.ts` is the single point of contact between frontend and backend
- API contract changes MUST update both the backend route and the frontend api client

### V. Environment Variables Only
No secrets, connection strings, or tokens MAY be hardcoded anywhere in the codebase.
All sensitive values MUST be loaded from environment variables.

- Required env vars: `BETTER_AUTH_SECRET`, `DATABASE_URL`
- Frontend uses `.env.local`; backend uses `.env`
- `.env` files MUST be listed in `.gitignore` — never committed
- Both services MUST fail fast with a clear error if required env vars are missing

### VI. Smallest Viable Change
Every task MUST be the smallest atomic unit that delivers value independently.
Refactoring unrelated code during feature work is prohibited.

- Prefer targeted file edits over rewrites
- Each task must be independently testable and committable
- No speculative abstractions or "future-proofing" without a concrete current need
- Three similar lines of code is acceptable; premature abstraction is not

### VII. Type Safety
TypeScript strict mode MUST be enabled on the frontend. Pydantic/SQLModel models
define all data contracts on the backend.

- Frontend: `"strict": true` in `tsconfig.json`; no `any` types without explicit
  inline justification comment
- Backend: All request and response bodies MUST use Pydantic BaseModel or SQLModel
- Database schema is the single source of truth for data shapes

## Technology Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 16+ (App Router), TypeScript, Tailwind CSS |
| Backend     | Python FastAPI                      |
| ORM         | SQLModel                            |
| Database    | Neon Serverless PostgreSQL          |
| Auth        | Better Auth (frontend) + JWT middleware (backend) |
| Shared Secret | `BETTER_AUTH_SECRET` env var (both services) |

**Monorepo layout**:

```
/
├── frontend/     — Next.js 16+ App Router application
├── backend/      — Python FastAPI application
├── specs/        — All feature specifications
├── history/      — PHRs, ADRs
└── .specify/     — SDD templates and scripts
```

## Development Workflow

1. Write spec: `/sp.specify <feature>` → `specs/features/<feature>/spec.md`
2. Clarify: `/sp.clarify` (optional, if requirements are ambiguous)
3. Plan: `/sp.plan` → `specs/features/<feature>/plan.md`
4. Tasks: `/sp.tasks` → `specs/features/<feature>/tasks.md`
5. Implement: `/sp.implement` (processes tasks via Claude Code agents)
6. Commit: `/sp.git.commit_pr`

**Dev commands**:
- Frontend: `cd frontend && npm run dev` (port 3000)
- Backend: `cd backend && uvicorn main:app --reload` (port 8000)
- Both: `docker-compose up`

## Governance

- This constitution supersedes all other project guidance documents
- All PRs MUST verify compliance with principles I–VII before merge
- Amendments require: description of change, reason, version bump, and update to this file
- Version uses semantic versioning: MAJOR (breaking principle changes), MINOR (new
  principles or sections), PATCH (wording/clarification)
- ADRs MUST be created for any decision that meets the three-part significance test
  (long-term impact + alternatives considered + cross-cutting scope)

**Version**: 1.0.0 | **Ratified**: 2026-02-25 | **Last Amended**: 2026-02-25
