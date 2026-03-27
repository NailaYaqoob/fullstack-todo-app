# Research: User Authentication

**Feature**: `002-user-auth` | **Date**: 2026-02-25

No NEEDS CLARIFICATION markers remained after spec validation (14/14 checklist passed).
Research below documents the key architectural decisions made during planning.

---

## Decision 1: Better Auth JWT Plugin Configuration

**Decision**: Use `jwt()` plugin from `better-auth/plugins/jwt`. Configure
`session.expiresIn: 604800` (7 days in seconds) and `session.updateAge: 86400`
(rolling refresh after 1 day of activity).

**Rationale**: Better Auth defaults to database sessions (opaque tokens). The JWT plugin
converts this to stateless JWTs that FastAPI can verify independently — without querying
the auth database on every request. The shared `BETTER_AUTH_SECRET` is the bridge between
the two services.

**Alternatives considered**:
- **Session-based only (no JWT plugin)**: FastAPI would need to call Better Auth's
  `GET /api/auth/get-session` to validate every request → adds latency, creates coupling
  between backend and Better Auth's session store. Rejected.
- **Custom JWT implementation**: Reinvents token signing; Better Auth's plugin is
  purpose-built and battle-tested. Rejected.

**Configuration**:
```typescript
// frontend/lib/auth.ts
import { betterAuth } from "better-auth"
import { jwt } from "better-auth/plugins/jwt"

export const auth = betterAuth({
  database: { url: process.env.DATABASE_URL! },
  secret: process.env.BETTER_AUTH_SECRET!,
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  session: {
    expiresIn: 604800,   // 7 days (FR-008)
    updateAge: 86400,    // Refresh if token older than 1 day
  },
  plugins: [jwt()],
})
```

---

## Decision 2: Token Retrieval for FastAPI Calls

**Decision**: Frontend retrieves the JWT string via `authClient.token()` and attaches
it as `Authorization: Bearer <token>` in all `frontend/lib/api.ts` fetch calls.

**Rationale**: The JWT plugin exposes `.token()` on the auth client, returning the
raw JWT string. Explicit header attachment is simpler and more portable than cookie
forwarding for cross-origin calls to FastAPI (avoids `credentials: "include"` + CORS
pre-flight complexity on the backend).

**Alternatives considered**:
- **Cookie forwarding (`withCredentials: true`)**: Requires FastAPI to configure
  `allow_credentials=True` on CORS + explicit `allow_origins` (no wildcard). More
  complex and error-prone in development. Rejected.
- **Session ID (opaque token)**: Not verifiable by FastAPI without DB lookup. Rejected.

**Code pattern** (frontend/lib/api.ts):
```typescript
import { authClient } from "./auth-client"

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await authClient.token()
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}
```

---

## Decision 3: Backend JWT Verification Library

**Decision**: Use `python-jose[cryptography]` with HS256 algorithm.

**Rationale**: Better Auth signs JWTs with HMAC-SHA256 (HS256) using `BETTER_AUTH_SECRET`.
`python-jose` is the standard Python JWT library in the FastAPI ecosystem and is well
documented for this exact pattern. The `[cryptography]` extra provides proper
cryptographic primitives.

**Alternatives considered**:
- **PyJWT**: Equally viable. `python-jose` selected for consistency with FastAPI
  documentation examples and existing skills/fastapi-rest.md patterns.
- **Asymmetric RS256**: Better Auth's JWT plugin uses HS256 (symmetric) by default.
  RS256 would require generating and managing a key pair — unnecessary complexity. Rejected.

**Verification pattern** (backend/auth.py):
```python
import os
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET = os.getenv("BETTER_AUTH_SECRET")
if not SECRET:
    raise RuntimeError("BETTER_AUTH_SECRET environment variable is not set")

ALGORITHM = "HS256"
security = HTTPBearer()

async def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    try:
        payload = jwt.decode(
            credentials.credentials, SECRET, algorithms=[ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
```

---

## Decision 4: Better Auth Schema vs SQLModel

**Decision**: Better Auth manages its own tables (`user`, `session`, `account`,
`verification`) via its database adapter. SQLModel defines only the `Task` model.
`Task.user_id` is a plain `str` field — no SQLModel FK constraint.

**Rationale**: Better Auth has its own schema management. Redefining its tables in
SQLModel risks schema drift when Better Auth updates its schema. Using `user_id: str`
without a FK constraint avoids the circular dependency while the application layer
enforces isolation via JWT-verified user_id (Principle III).

**Alternatives considered**:
- **Mirror Better Auth schema in SQLModel (table=True)**: Schema drift risk; double
  migration management; Better Auth may change column names. Rejected.
- **SQLAlchemy FK constraint `task.user_id → user.id`**: Requires SQLModel to import
  Better Auth's table definition; tighter coupling. Acceptable but unnecessary. Rejected.

**Note**: A read-only `UserRead(BaseModel)` class (no `table=True`) may be defined in
`backend/models.py` for type hints in route handler responses. It does not create a table.

---

## Decision 5: Route Protection Strategy

**Decision**: `frontend/middleware.ts` uses Better Auth's `auth.api.getSession()` for
server-side session validation. Protects `/dashboard/**`; redirects unauthenticated
visitors to `/login`; redirects authenticated users away from `/login` and `/signup`
to `/dashboard`.

**Rationale**: Next.js middleware runs at the edge before any page renders, preventing
flash of unauthenticated content. `auth.api.getSession()` uses the HTTP cookie set by
Better Auth, making it transparent to the user. Satisfies FR-011, FR-012, US3 SC-003.

**Alternatives considered**:
- **Client-side `useSession()` redirect**: Causes flash of unauthenticated content
  before redirect fires. Rejected.
- **Edge runtime manual JWT decode**: Requires replicating verification logic in
  middleware; `auth.api.getSession()` is the canonical approach. Rejected.

**Middleware pattern** (frontend/middleware.ts):
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  const { pathname } = request.nextUrl
  const isAuthPage = pathname === "/login" || pathname === "/signup"
  const isProtected = pathname.startsWith("/dashboard")

  if (!session && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
}
```

---

## Resolved Clarifications

All 13 functional requirements in the spec were clear and unambiguous. No NEEDS
CLARIFICATION markers remained. Key implicit decisions documented above:

| FR | Resolution |
|----|-----------|
| FR-003 (min 8 chars) | Enforced by `minPasswordLength: 8` in Better Auth config |
| FR-007 (generic error) | Better Auth returns a single error; frontend maps all failures to one message |
| FR-008 (7-day session) | `session.expiresIn: 604800` + `updateAge: 86400` (rolling) |
| FR-013 (no plain text) | Better Auth hashes passwords with bcrypt by default |
