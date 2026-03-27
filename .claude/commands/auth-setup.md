---
description: Configure Better Auth with JWT plugin on the Next.js frontend and FastAPI JWT verification middleware on the backend. Sets up signup/login pages, route protection middleware, and verifies the shared BETTER_AUTH_SECRET is correctly configured in both services.
handoffs:
  - label: Implement Features
    agent: sp.implement
    prompt: Start implementing the task-crud feature
    send: false
  - label: Test API
    agent: test-api
    prompt: Test all API endpoints including auth endpoints
    send: false
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

### Step 1: Pre-flight Checks

1. Verify both service directories exist:
   ```bash
   ls frontend/ backend/ 2>/dev/null && echo "BOTH EXIST" || echo "MISSING"
   ```
   If missing: Stop and tell user to run `/bootstrap` first.

2. Verify `BETTER_AUTH_SECRET` is set in BOTH `.env` files:
   ```bash
   grep "BETTER_AUTH_SECRET" backend/.env 2>/dev/null && echo "backend: SET" || echo "backend: MISSING"
   grep "BETTER_AUTH_SECRET" frontend/.env.local 2>/dev/null && echo "frontend: SET" || echo "frontend: MISSING"
   ```

   If either is MISSING, stop and display:
   ```
   ⚠️  BETTER_AUTH_SECRET must be set in BOTH services.

   Generate a secret (run this command):
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

   Then set it in:
     backend/.env         → BETTER_AUTH_SECRET=<generated-secret>
     frontend/.env.local  → BETTER_AUTH_SECRET=<same-secret>

   ⚠️  CRITICAL: Both values MUST be identical or all JWT verification will fail.

   Re-run /auth-setup after setting the secret.
   ```

3. Verify `DATABASE_URL` is set (Better Auth needs it for session storage):
   ```bash
   grep "DATABASE_URL" backend/.env 2>/dev/null && echo "SET" || echo "MISSING"
   ```
   If missing: Stop and tell user to run `/db-setup` first.

### Step 2: Read Current State

Read these files if they exist:
- `frontend/lib/auth.ts` — existing Better Auth config
- `frontend/lib/auth-client.ts` — existing client instance
- `frontend/middleware.ts` — existing route protection
- `backend/auth.py` or `backend/dependencies.py` — existing JWT middleware
- `backend/main.py` — to understand what's already registered
- `.specify/memory/constitution.md` — Principle II (JWT Auth Enforcement) and III (User Isolation)

### Step 3: Launch auth-jwt-flow Agent

Launch the `auth-jwt-flow` agent with the following task:

```
Task: Set up full authentication for the fullstack-todo-app.

Project root: E:/fullstack-todo-app
Frontend: frontend/ (Next.js 16 App Router, TypeScript strict)
Backend: backend/ (FastAPI, SQLModel)

Constitution constraints:
- Principle II: ALL endpoints require valid JWT — no public routes except /health and auth routes
- Principle III: JWT user_id MUST be verified against URL user_id on every request
- Principle V: BETTER_AUTH_SECRET from os.getenv() / process.env — never hardcoded

FRONTEND tasks (in frontend/):
1. Install Better Auth:
   cd frontend && npm install better-auth

2. Create frontend/lib/auth.ts — Better Auth SERVER config with:
   - emailAndPassword authentication enabled
   - JWT plugin enabled (so tokens are issued on login)
   - Database adapter connected to BETTER_AUTH_SECRET from process.env
   - BETTER_AUTH_URL from process.env

3. Create frontend/lib/auth-client.ts — Better Auth CLIENT instance:
   - createAuthClient() configured with BETTER_AUTH_URL
   - Export: signIn, signUp, signOut, useSession helpers

4. Create frontend/app/login/page.tsx — Login page (client component):
   - Email + password form with validation
   - Uses auth-client.signIn.email()
   - Redirects to /dashboard on success
   - Shows error message on failure
   - Link to signup page

5. Create frontend/app/signup/page.tsx — Signup page (client component):
   - Name + email + password form with validation
   - Uses auth-client.signUp.email()
   - Redirects to /dashboard on success
   - Link to login page

6. Create frontend/middleware.ts — Route protection:
   - Protect /dashboard and all sub-routes
   - Redirect unauthenticated users to /login
   - Use Better Auth session check

7. Update frontend/app/layout.tsx — Wrap with Better Auth provider if required

BACKEND tasks (in backend/):
1. Install python-jose:
   pip install "python-jose[cryptography]"
   Add to requirements.txt

2. Create backend/auth.py — JWT verification:
   - verify_jwt() async dependency using HTTPBearer
   - Decodes JWT with BETTER_AUTH_SECRET (HS256 algorithm)
   - Returns decoded payload dict
   - Raises 401 for missing/invalid/expired tokens
   - NEVER hardcode the secret

3. Create backend/dependencies.py — get_current_user() dependency:
   - Wraps verify_jwt()
   - Extracts and returns user_id from JWT payload
   - This is the dependency used in ALL route handlers

4. Verify backend/main.py has Better Auth CORS configured properly

VERIFICATION:
After implementation, provide:
- curl command to test signup: POST /api/auth/sign-up/email
- curl command to test login: POST /api/auth/sign-in/email
- curl command to verify JWT works: GET with Authorization: Bearer <token>
- Expected responses for each

Report all files created/modified and their exact paths.
```

### Step 4: Install Better Auth Dependencies

After the auth-jwt-flow agent completes, verify dependencies are installed:

```bash
# Frontend
cd frontend && npm list better-auth 2>/dev/null && echo "✅ better-auth installed" || echo "❌ not installed"

# Backend
cd backend && python -c "import jose; print('✅ python-jose installed')" 2>/dev/null || echo "❌ python-jose not installed"
```

If any dependency is missing, install it:
```bash
cd frontend && npm install better-auth
cd backend && pip install "python-jose[cryptography]"
```

### Step 5: Verify Auth Routes

Start the backend and test auth endpoints:

```bash
# Start backend (background)
cd backend && uvicorn main:app --port 8000 &
sleep 3

# Test signup
curl -s -X POST http://localhost:8000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Test login
curl -s -X POST http://localhost:8000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

kill %1
```

Display the responses and verify a JWT token is returned in the login response.

### Step 6: Display Auth Summary

After successful setup:

```
✅ Authentication configured!

Frontend (Better Auth):
  - lib/auth.ts         — server config with JWT plugin
  - lib/auth-client.ts  — client helpers (signIn, signUp, signOut, useSession)
  - app/login/page.tsx  — login page
  - app/signup/page.tsx — signup page
  - middleware.ts       — /dashboard route protection

Backend (JWT verification):
  - auth.py             — verify_jwt() FastAPI dependency
  - dependencies.py     — get_current_user() for route handlers

⚠️  IMPORTANT: Use get_current_user() as a dependency on EVERY task endpoint.
    See backend/CLAUDE.md for the route pattern.

Next: Run /sp.implement to start building the task CRUD feature.
```

### Step 7: Create PHR

**Stage**: general
**Title**: auth-jwt-setup-complete
**Route**: `history/prompts/general/`

Read `.specify/templates/phr-template.prompt.md`, allocate next available ID, write to `history/prompts/general/<ID>-auth-jwt-setup-complete.general.prompt.md`.

Fill all placeholders:
- PROMPT_TEXT: verbatim user input
- RESPONSE_TEXT: files created, auth endpoints tested, JWT flow verified
- FILES_YAML: all auth-related files created/modified
- OUTCOME: impact (auth ready), next prompts (/sp.implement)

Report: ID, path, stage, title.
