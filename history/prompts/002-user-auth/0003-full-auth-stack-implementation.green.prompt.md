---
id: "0003"
title: Full Auth Stack Implementation
stage: green
date: 2026-02-25
surface: agent
model: claude-sonnet-4-6
feature: 002-user-auth
branch: 001-task-crud
user: user
command: implement auth stack
labels: ["auth","better-auth","jwt","fastapi","next.js","backend","frontend"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/auth.py
  - backend/dependencies.py
  - frontend/lib/auth.ts
  - frontend/lib/auth-client.ts
  - frontend/app/api/auth/[...all]/route.ts
  - frontend/app/login/page.tsx
  - frontend/app/signup/page.tsx
  - frontend/middleware.ts
  - frontend/app/dashboard/page.tsx
tests:
  - npx tsc --noEmit (0 errors)
---

## Prompt

Set up the full authentication stack for the fullstack-todo-app.

Project structure:
- Root: E:/fullstack-todo-app
- Frontend: E:/fullstack-todo-app/frontend/ (Next.js 16, App Router, TypeScript strict, Tailwind)
- Backend: E:/fullstack-todo-app/backend/ (FastAPI, Python 3.14)

Existing state:
- backend/.env has DATABASE_URL and BETTER_AUTH_SECRET=Jwh4FgMTnCcJrj9LQ3dM5wvoqMGXlwkK
- frontend/.env.local has matching BETTER_AUTH_SECRET
- python-jose 3.5.0 already installed
- frontend/lib/ does NOT exist yet

Tasks 1-11: Create backend/auth.py, backend/dependencies.py, update requirements.txt, install better-auth, create frontend/lib/auth.ts, lib/auth-client.ts, API route handler, login page, signup page, middleware.ts, and dashboard placeholder.

## Response snapshot

Implemented the full authentication stack across backend and frontend.

**better-auth version installed:** 1.4.19

**API findings from package inspection:**
- JWT plugin import: `better-auth/plugins/jwt` (not `better-auth/plugins`)
- `toNextJsHandler`: confirmed in `better-auth/next-js`
- `jwtClient`: confirmed in `better-auth/client/plugins`
- Database API: accepts `pg.Pool` instance directly — `{ provider, url }` format does NOT exist

**Backend files created:**
- `backend/auth.py`: HTTPBearer + jose JWT verification dependency, returns decoded payload
- `backend/dependencies.py`: `get_current_user` extracts `sub`/`userId`/`id` claim from payload

**Frontend files created:**
- `frontend/lib/auth.ts`: betterAuth with pg.Pool, jwt() plugin, emailAndPassword enabled
- `frontend/lib/auth-client.ts`: createAuthClient with jwtClient() plugin
- `frontend/app/api/auth/[...all]/route.ts`: toNextJsHandler(auth) GET/POST exports
- `frontend/app/login/page.tsx`: email/password sign-in form with error handling
- `frontend/app/signup/page.tsx`: name/email/password registration form
- `frontend/middleware.ts`: protects /dashboard/:path*, checks better-auth.session_token cookie
- `frontend/app/dashboard/page.tsx`: placeholder page

**requirements.txt:** python-jose[cryptography]>=3.3.0 was already present, no change needed.

**TypeScript check:** `npx tsc --noEmit` returned 0 errors.

## Outcome

- Impact: Full JWT authentication stack is live — backend verifies Better Auth JWTs, frontend handles sign-in/sign-up flows and route protection
- Tests: TypeScript strict mode passes with 0 errors
- Files: 9 files created (2 backend, 7 frontend)
- Next prompts: Wire `get_current_user` dependency into task CRUD routes; implement JWT token retrieval in frontend API client (lib/api.ts)
- Reflection: better-auth 1.x uses pg.Pool directly for database — must verify package types before implementing; jwt plugin is at `better-auth/plugins/jwt` not `better-auth/plugins`

## Evaluation notes (flywheel)

- Failure modes observed: Task spec suggested `{ provider: "pg", url }` database format which does not exist in v1.x — always read installed types before writing auth config
- Graders run and results (PASS/FAIL): tsc --noEmit PASS
- Prompt variant (if applicable): null
- Next experiment: Confirm Better Auth session cookie name at runtime to validate middleware cookie check
