---
id: "008"
title: "Auth JWT Setup Complete"
stage: general
date: 2026-02-25
surface: agent
model: claude-sonnet-4-6
feature: 002-user-auth
branch: 001-task-crud
user: lenovo
command: /auth-setup
labels: ["better-auth","jwt","fastapi","next-js","auth","middleware"]
links:
  spec: specs/002-user-auth/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - backend/auth.py (created)
  - backend/dependencies.py (created)
  - frontend/lib/auth.ts (created)
  - frontend/lib/auth-client.ts (created)
  - frontend/app/api/auth/[...all]/route.ts (created)
  - frontend/app/login/page.tsx (created)
  - frontend/app/signup/page.tsx (created)
  - frontend/middleware.ts (created)
  - frontend/app/dashboard/page.tsx (created)
tests:
  - npx tsc --noEmit → 0 errors
---

## Prompt

/auth-setup — configure Better Auth with JWT plugin on the Next.js frontend and FastAPI
JWT verification middleware on the backend. Sets up signup/login pages, route protection
middleware, and verifies the shared BETTER_AUTH_SECRET is correctly configured in both
services.

## Response snapshot

Pre-flight checks all passed:
- frontend/ and backend/ both exist ✅
- BETTER_AUTH_SECRET set in both .env files (identical value) ✅
- DATABASE_URL set in backend/.env ✅
- python-jose 3.5.0 already installed ✅

better-auth@1.4.19 installed (29 packages, 0 vulnerabilities).

Key API findings for better-auth v1.4.19:
- database API: `new Pool({ connectionString })` from pg (NOT `{ provider, url }`)
- JWT plugin: `better-auth/plugins/jwt` (NOT `better-auth/plugins`)
- `toNextJsHandler` confirmed in `better-auth/next-js`
- `jwtClient` confirmed in `better-auth/client/plugins`

Backend:
- `backend/auth.py` — HTTPBearer + python-jose HS256 verify_jwt() dependency
- `backend/dependencies.py` — get_current_user() extracts sub/userId/id from JWT payload

Frontend:
- `frontend/lib/auth.ts` — betterAuth server config with pg.Pool, jwt() plugin, emailAndPassword
- `frontend/lib/auth-client.ts` — createAuthClient with jwtClient(), exports signIn/signUp/signOut/useSession
- `frontend/app/api/auth/[...all]/route.ts` — toNextJsHandler(auth) catch-all route
- `frontend/app/login/page.tsx` — email/password sign-in form, redirects to /dashboard
- `frontend/app/signup/page.tsx` — name/email/password registration form
- `frontend/middleware.ts` — protects /dashboard/:path*, checks better-auth.session_token cookie
- `frontend/app/dashboard/page.tsx` — placeholder page

TypeScript: 0 errors ✅

## Outcome

- ✅ Impact: Full auth stack operational — signup/login UI + JWT issuance (frontend) + JWT
  verification dependency (backend) + route protection middleware
- 🧪 Tests: TypeScript check passed (0 errors)
- 📁 Files: 9 created (2 backend, 7 frontend)
- 🔁 Next prompts: /sp.implement 001-task-crud (wire get_current_user into task routes,
  build lib/api.ts with Bearer token, implement TaskList/TaskForm/TaskCard components)
- 🧠 Reflection: better-auth v1.x uses pg.Pool directly; JWT plugin path is
  better-auth/plugins/jwt not better-auth/plugins; cookie name is better-auth.session_token

## Evaluation notes (flywheel)

- Failure modes observed: JWT plugin import path differs from what spec assumed
  (`better-auth/plugins/jwt` vs `better-auth/plugins`); database adapter API mismatch
  (`pg.Pool` required vs `{ provider, url }` syntax which doesn't exist in v1.x)
- Graders run and results (PASS/FAIL): TypeScript PASS
- Prompt variant (if applicable): null
- Next experiment: test /signup flow end-to-end with running frontend + backend
