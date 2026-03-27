# Tasks: User Authentication

**Input**: Design documents from `/specs/002-user-auth/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: No test tasks — not explicitly requested in spec.md.

**Organization**: Tasks grouped by user story to enable independent implementation
and testing of each increment.

**Assumed ready**: Monorepo scaffolded (`frontend/` and `backend/` exist); Neon
`DATABASE_URL` and `BETTER_AUTH_SECRET` set in both `.env` files; `backend/db.py`
exists with async engine (from `/db-setup`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state dependency)
- **[Story]**: Maps task to a user story from spec.md (US1–US4)
- Paths are relative to monorepo root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install auth-specific packages before any code is written.

- [x] T001 Install `better-auth` package — run `npm install better-auth` in `frontend/`; verify `better-auth` appears in `frontend/package.json` dependencies
- [x] T002 [P] Add `python-jose` to backend — append `python-jose[cryptography]` to `backend/requirements.txt`; run `pip install "python-jose[cryptography]"` in `backend/`; verify `from jose import jwt` succeeds

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth infrastructure all four user stories depend on. Every task
targets a different file — launch all in parallel.

**⚠️ CRITICAL**: No user story phase can begin until every task here is complete.

- [x] T003 [P] Create `backend/auth.py` — `verify_jwt()` FastAPI dependency:
  `SECRET = os.getenv("BETTER_AUTH_SECRET")`; raise `RuntimeError` if `SECRET` is
  `None` (fail-fast at import time); define `_security = HTTPBearer()`; implement
  `async def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(_security)) -> dict`
  that calls `jwt.decode(credentials.credentials, SECRET, algorithms=["HS256"])` and
  returns the payload dict; catch `JWTError` and raise `HTTP 401` with detail
  `"Invalid or expired token"` and header `WWW-Authenticate: Bearer`

- [x] T004 [P] Create `backend/dependencies.py` — `get_current_user()` dependency:
  import `verify_jwt` from `auth`; implement
  `async def get_current_user(payload: dict = Depends(verify_jwt)) -> str`
  that returns `payload["sub"]`; add module docstring noting this is the dependency
  ALL protected route handlers must use

- [x] T005 [P] Update `backend/main.py` — add at module top: check
  `os.getenv("BETTER_AUTH_SECRET")` and `os.getenv("DATABASE_URL")`, raise
  `RuntimeError` with clear message if either is `None`; add `CORSMiddleware` with
  `allow_origins=["http://localhost:3000"]`, `allow_credentials=False`,
  `allow_methods=["*"]`, `allow_headers=["Authorization", "Content-Type"]`

- [x] T006 [P] Create `frontend/lib/auth.ts` — Better Auth server config:
  import `betterAuth` from `"better-auth"` and `jwt` from `"better-auth/plugins/jwt"`;
  export `const auth = betterAuth({ database: { url: process.env.DATABASE_URL! },
  secret: process.env.BETTER_AUTH_SECRET!, emailAndPassword: { enabled: true,
  minPasswordLength: 8 }, session: { expiresIn: 604800, updateAge: 86400 },
  plugins: [jwt()] })`; this is a server-only module (no `"use client"`)

- [x] T007 [P] Create `frontend/lib/auth-client.ts` — Better Auth client instance:
  import `createAuthClient` from `"better-auth/react"`; export
  `const authClient = createAuthClient({ baseURL: process.env.BETTER_AUTH_URL ??
  "http://localhost:3000" })`; add `"use client"` directive at top since this is
  used in client components; export type `Session` inferred from `authClient.$Infer.Session`

- [x] T008 [P] Create `frontend/app/api/auth/[...all]/route.ts` — Better Auth
  Next.js handler: import `auth` from `"@/lib/auth"`; export
  `const { GET, POST } = auth.handler` (or `export { GET, POST }` from
  `auth.toNextJsHandler()` depending on Better Auth version); this file handles all
  `/api/auth/*` requests automatically

- [x] T009 [P] Create `frontend/app/dashboard/page.tsx` — minimal dashboard server
  component: import `auth` from `"@/lib/auth"`, `headers` from `"next/headers"`,
  `redirect` from `"next/navigation"`; call
  `const session = await auth.api.getSession({ headers: headers() })`; if `!session`
  then `redirect("/login")`; render a placeholder page with `<h1>Dashboard</h1>` and
  `<p>Welcome, {session.user.name}</p>` (task list placeholder); this page will be
  extended in T013

**Checkpoint**: Backend JWT dependency ready for task routes; frontend Better Auth
configured; auth API handler mounted; dashboard redirect target exists.

---

## Phase 3: User Story 1 — Sign Up (Priority: P1) 🎯 MVP

**Goal**: A new visitor can create an account and land on the dashboard.

**Independent Test**: Navigate to `http://localhost:3000/signup`; submit name "Test
User", unique email, password "password123" → confirm redirect to `/dashboard` showing
"Welcome, Test User". Then verify: submit duplicate email → "This email is already
registered"; password "pass" → "Password must be at least 8 characters"; empty name →
"Name is required".

- [x] T010 [US1] Create `frontend/app/signup/page.tsx` — `"use client"` sign-up page:
  - Controlled form with `useState` for `name`, `email`, `password`, `error`, `loading`
  - Client-side pre-validation before API call: trim `name` and reject if empty or
    whitespace-only; check email format with `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`; check
    `password.length >= 8`; display inline field errors
  - On submit: `setLoading(true)`; call
    `await authClient.signUp.email({ name: name.trim(), email, password })`
  - On success: `router.push("/dashboard")` using `useRouter` from `"next/navigation"`
  - On API error: map to user-facing messages —
    `USER_ALREADY_EXISTS` → `"This email is already registered"`;
    `PASSWORD_TOO_SHORT` → `"Password must be at least 8 characters"`;
    `INVALID_EMAIL` → `"Enter a valid email address"`;
    `INVALID_NAME` → `"Name is required"`;
    any other error → `"Something went wrong. Please try again."`
  - Footer link: `<Link href="/login">Already have an account? Sign in</Link>`
  - Tailwind CSS; disable submit button and show spinner while `loading` is true

**Checkpoint**: Sign-up fully functional. New user registers and reaches dashboard.

---

## Phase 4: User Story 2 — Sign In (Priority: P2)

**Goal**: A registered user can sign in with email and password and reach the dashboard.

**Independent Test**: Using account from US1 test: navigate to
`http://localhost:3000/login`; submit correct email + password → redirect to `/dashboard`.
Then: wrong password → generic error (no field hint); non-existent email → same generic
error; both must show identical "Invalid email or password" message (FR-007).

- [x] T011 [US2] Create `frontend/app/login/page.tsx` — `"use client"` sign-in page:
  - Controlled form with `useState` for `email`, `password`, `error`, `loading`
  - No pre-validation beyond HTML `required` attributes (server returns generic error)
  - On submit: `setLoading(true)`; call
    `await authClient.signIn.email({ email, password })`
  - On success: `router.push("/dashboard")` using `useRouter`
  - On ANY error (including 401, network error): display **one** generic message
    `"Invalid email or password"` — never distinguish email-not-found from wrong
    password (FR-007); no per-field error messages
  - Footer link: `<Link href="/signup">Don't have an account? Sign up</Link>`
  - Tailwind CSS; disable submit button and show spinner while `loading` is true

**Checkpoint**: Sign-in fully functional. Returning users reach dashboard. Generic
error message enforced — zero information leakage about which field was wrong (SC-006).

---

## Phase 5: User Story 3 — Session Persistence (Priority: P3)

**Goal**: Signed-in sessions last 7 days across browser restarts; unauthenticated
visitors cannot reach protected pages.

**Independent Test**: Sign in; close browser tab entirely; reopen browser and navigate
to `http://localhost:3000/dashboard` → dashboard loads without re-authentication (FR-008).
Open incognito window → navigate to `/dashboard` → redirected to `/login` (FR-011).
While signed in navigate to `/login` → redirected to `/dashboard` (FR-012).

- [x] T012 [US3] Create `frontend/middleware.ts` — Next.js route protection:
  - Import `auth` from `"@/lib/auth"`, `NextRequest`, `NextResponse` from `"next/server"`
  - `async function middleware(request: NextRequest)`:
    - `const session = await auth.api.getSession({ headers: request.headers })`
    - `const { pathname } = request.nextUrl`
    - If `!session && pathname.startsWith("/dashboard")`:
      `return NextResponse.redirect(new URL("/login", request.url))`
    - If `session && (pathname === "/login" || pathname === "/signup")`:
      `return NextResponse.redirect(new URL("/dashboard", request.url))`
    - Otherwise: `return NextResponse.next()`
  - Export `config = { matcher: ["/dashboard/:path*", "/login", "/signup"] }`
  - Note: 7-day session duration is already set in `frontend/lib/auth.ts` T006
    (`expiresIn: 604800`); no additional config needed here

**Checkpoint**: Route protection active. Unauthenticated visitors cannot reach
dashboard. Authenticated users bypass login/signup pages.

---

## Phase 6: User Story 4 — Sign Out (Priority: P4)

**Goal**: A signed-in user can end their session; all subsequent protected-page
access redirects to sign-in.

**Independent Test**: Sign in; confirm sign-out button is visible on dashboard; click
it → redirected to `/login`. Press browser back button → still at `/login` (not cached
dashboard). Navigate directly to `http://localhost:3000/dashboard` → redirected to
`/login` (session fully revoked, FR-010).

- [x] T013 [US4] Update `frontend/app/dashboard/page.tsx` — add sign-out control:
  - Create an inline `SignOutButton` client component (add `"use client"` to a
    sub-component or extract to `frontend/components/SignOutButton.tsx`):
    - On click: `await authClient.signOut()`; then `router.push("/login")`
    - Show loading state during sign-out (disable button)
  - Import and render `SignOutButton` near the top of the dashboard page (visible
    without scrolling — render in a header bar alongside the welcome message)
  - After sign-out, the session cookie is cleared by Better Auth; middleware (T012)
    handles redirect on any subsequent navigation to `/dashboard`

**Checkpoint**: Full auth cycle working end-to-end — sign up → sign in → dashboard →
sign out → back to login.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Root redirect, environment hardening, and end-to-end validation.

- [x] T014 [P] Create `frontend/app/page.tsx` — root redirect: server component that
  calls `redirect("/dashboard")` from `"next/navigation"`; middleware (T012) will then
  redirect unauthenticated users from `/dashboard` to `/login` automatically; no auth
  check needed here

- [x] T015 [P] Run quickstart.md validation — execute all verification steps from
  `specs/002-user-auth/quickstart.md` sections 4 (curl commands) and 5 (browser route
  protection); confirm sign-up returns 200 with token; sign-in returns JWT; FastAPI
  accepts Bearer token; all five browser navigation scenarios behave as expected;
  document any discrepancies

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Requires Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Requires Phase 2 — no dependency on other user stories
- **US2 (Phase 4)**: Requires Phase 2 — no dependency on US1 (different file)
- **US3 (Phase 5)**: Requires Phase 2 — add middleware after signup/login exist for
  meaningful testing (depends on US1 + US2 for test accounts)
- **US4 (Phase 6)**: Requires Phase 5 — updates dashboard page; middleware must
  exist to handle post-logout redirect correctly
- **Polish (Phase 7)**: Requires all user stories complete

### User Story Dependency Table

| Story | Blocks | File(s) Touched |
|-------|--------|----------------|
| US1 Sign Up (T010) | none | `app/signup/page.tsx` (new) |
| US2 Sign In (T011) | none | `app/login/page.tsx` (new) |
| US3 Session (T012) | US4 | `middleware.ts` (new) |
| US4 Sign Out (T013) | none | `app/dashboard/page.tsx` (update) |

### Parallel Opportunities

- **Phase 1**: T001 + T002 fully parallel
- **Phase 2**: T003 + T004 + T005 + T006 + T007 + T008 + T009 all parallel
- **Phases 3+4**: T010 (signup page) + T011 (login page) parallel — different files
- **Phase 7**: T014 + T015 parallel

---

## Parallel Example: Phase 2 (All 7 Tasks Simultaneously)

```bash
# Launch all foundational tasks in parallel:
Task(backend): "Create backend/auth.py with verify_jwt()"         # T003
Task(backend): "Create backend/dependencies.py with get_current_user()" # T004
Task(backend): "Update backend/main.py CORS + fail-fast"          # T005
Task(frontend): "Create frontend/lib/auth.ts server config"       # T006
Task(frontend): "Create frontend/lib/auth-client.ts client"       # T007
Task(frontend): "Create frontend/app/api/auth/[...all]/route.ts"  # T008
Task(frontend): "Create frontend/app/dashboard/page.tsx placeholder" # T009
```

---

## Implementation Strategy

### MVP First (US1 Sign Up Only)

1. Complete Phase 1 (T001, T002) — install packages
2. Complete Phase 2 (T003–T009) — auth foundation
3. Complete Phase 3 (T010) — signup page
4. **STOP and VALIDATE**: New user can register → dashboard
5. Demo: functional sign-up flow with error handling

### Incremental Delivery

| After | Working Feature | Test Criteria |
|-------|----------------|---------------|
| Phase 2 | Auth infrastructure, protected dashboard | JWT dependency usable |
| + Phase 3 | Sign Up | New users can register |
| + Phase 4 | Sign In | Returning users can log in |
| + Phase 5 | Session persistence + route protection | Unauthenticated blocked |
| + Phase 6 | Sign Out | Full auth cycle complete |
| + Phase 7 | Polished, validated | quickstart.md all green |

### Parallel Team Strategy (2 developers after Phase 2)

- Developer A: T010 (signup) → T012 (middleware)
- Developer B: T011 (login) → T013 (sign-out)

---

## Notes

- Better Auth manages `user` and `session` tables — `backend/db.py` `create_db_and_tables()`
  must **not** include User or Session SQLModel models (see data-model.md)
- `BETTER_AUTH_SECRET` must be **identical** in both `.env` files — mismatched secrets
  cause every JWT verification to fail with 401
- No test tasks — not explicitly requested in spec.md; manual curl + browser tests
  in quickstart.md serve as the verification protocol
- Commit at each phase checkpoint for clean rollback points
- See `specs/002-user-auth/quickstart.md` for end-to-end verification commands
