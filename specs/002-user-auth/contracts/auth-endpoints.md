# Contract: Better Auth Endpoints

**Feature**: `002-user-auth` | **Date**: 2026-02-25

These endpoints are automatically provided by Better Auth via the Next.js route handler
at `frontend/app/api/auth/[...all]/route.ts`. They are **not manually implemented**.

Base URL (frontend): `http://localhost:3000` (dev) / `https://<domain>` (prod)

---

## POST /api/auth/sign-up/email

Create a new user account (FR-001–FR-005).

**Request**:
```json
{
  "name": "Alice Smith",
  "email": "alice@example.com",
  "password": "securepassword123"
}
```

**Responses**:

| Status | Body | Trigger |
|--------|------|---------|
| 200 OK | `{ "user": { "id": "...", "name": "...", "email": "..." }, "session": { ... } }` | Account created successfully |
| 422 | `{ "code": "USER_ALREADY_EXISTS", "message": "Email already in use" }` | Duplicate email (FR-002) |
| 422 | `{ "code": "PASSWORD_TOO_SHORT", "message": "Password must be at least 8 characters" }` | Password < 8 chars (FR-003) |
| 422 | `{ "code": "INVALID_EMAIL", "message": "Invalid email address" }` | Bad email format (FR-005) |
| 422 | `{ "code": "INVALID_NAME", "message": "Name is required" }` | Empty/whitespace-only name (FR-004) |

**Side effects**: Creates `user` row + `session` row in DB. Sets auth session cookie.
Better Auth JWT plugin also returns a `token` field in 200 response.

**Redirect behaviour**: Frontend must redirect to `/dashboard` on 200 (US1).

---

## POST /api/auth/sign-in/email

Authenticate an existing user (FR-006, FR-007).

**Request**:
```json
{
  "email": "alice@example.com",
  "password": "securepassword123"
}
```

**Responses**:

| Status | Body | Trigger |
|--------|------|---------|
| 200 OK | `{ "user": { "id": "...", "name": "...", "email": "..." }, "token": "<jwt-string>", "session": { "expiresAt": "..." } }` | Valid credentials |
| 401 | `{ "code": "INVALID_EMAIL_OR_PASSWORD", "message": "Invalid email or password" }` | Wrong email or password (FR-007 — generic, no field hint) |

**Side effects**: Creates new `session` row. Sets auth session cookie. Returns JWT token.

**Important** (FR-007): The frontend MUST display a single generic message
("Invalid email or password") for any 401 — never indicate which field was wrong.

---

## POST /api/auth/sign-out

End the authenticated user's current session (FR-009, FR-010).

**Request**: No body. Requires active session cookie (set automatically by browser).

**Responses**:

| Status | Body | Trigger |
|--------|------|---------|
| 200 OK | `{ "success": true }` | Session revoked |
| 401 | `{ "message": "Unauthorized" }` | No active session |

**Side effects**: Marks `session.expiresAt` as past (revokes). Clears auth cookie.
After sign-out, any subsequent request to `/dashboard` MUST redirect to `/login` (FR-010).

---

## GET /api/auth/get-session

Retrieve current session state (used by `middleware.ts` and `useSession()` hook).

**Request**: No body. Uses session cookie.

**Responses**:

| Status | Body | Trigger |
|--------|------|---------|
| 200 OK | `{ "session": { "id": "...", "userId": "...", "expiresAt": "..." }, "user": { "id": "...", "name": "...", "email": "..." } }` | Active session exists |
| 200 OK | `null` | No active session |

**Used by**: `frontend/middleware.ts` to protect routes (FR-011, FR-012).

---

## Frontend Auth Client Helpers

Exported from `frontend/lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL,  // http://localhost:3000
})

// Usage:
authClient.signIn.email({ email, password })   // POST /api/auth/sign-in/email
authClient.signUp.email({ name, email, password })  // POST /api/auth/sign-up/email
authClient.signOut()                            // POST /api/auth/sign-out
authClient.useSession()                         // React hook for session state
authClient.token()                              // Returns current JWT string
```
