# Feature: User Authentication

**Phase**: II (Full-Stack Web Application)
**Branch**: `002-user-auth`
**Status**: In Progress

## Overview
Implement multi-user authentication using Better Auth 1.x with the JWT plugin on the Next.js frontend and JWT verification middleware on the FastAPI backend.

## User Stories

- As a visitor, I can sign up with my email and password
- As a registered user, I can sign in with my email and password
- As a signed-in user, I can sign out
- As a signed-in user, my tasks are private and isolated from other users
- As an unauthenticated visitor, I am redirected to the login page when accessing protected routes

## Acceptance Criteria

### Sign Up
- Requires email (valid format) and password (min 8 characters)
- Creates a new user record via Better Auth
- Redirects to dashboard on success
- Shows error on duplicate email

### Sign In
- Authenticates with email and password via Better Auth
- Issues a JWT token (via Better Auth JWT plugin)
- Stores token accessible for API calls
- Redirects to dashboard on success
- Shows error on invalid credentials

### Sign Out
- Clears session and JWT token
- Redirects to login page

### Route Protection
- `/dashboard` and all task routes require authentication
- Unauthenticated requests redirect to `/login`
- Next.js middleware handles route protection

### API Security (FastAPI)
- All `/api/*` endpoints require `Authorization: Bearer <token>` header
- FastAPI middleware verifies JWT signature using shared `BETTER_AUTH_SECRET`
- Returns `401 Unauthorized` if token is missing or invalid
- Extracts `user_id` from token payload and injects into request context
- All task queries are filtered by the authenticated `user_id`

## JWT Flow

```
User Login → Better Auth issues JWT → Frontend stores token
→ API request includes "Authorization: Bearer <token>"
→ FastAPI verifies signature with BETTER_AUTH_SECRET
→ Decodes user_id → Filters data by user_id
```

## Environment Variables

| Variable | Service | Purpose |
|----------|---------|---------|
| `BETTER_AUTH_SECRET` | Frontend + Backend | Shared secret for JWT signing/verification |
| `BETTER_AUTH_URL` | Frontend | Better Auth base URL |
| `DATABASE_URL` | Backend | Neon PostgreSQL connection string |

## Security Requirements
- JWT tokens expire after 7 days
- Backend never stores session state (stateless verification)
- Secrets stored in `.env` files, never hardcoded
- Each user can only access/modify their own tasks (enforced at query level)

## Related Specs
- `@specs/database/schema.md` — `users`, `session`, `account` tables (managed by Better Auth)
- `@specs/api/rest-endpoints.md` — JWT requirement on all endpoints
- `@specs/ui/pages.md` — Login and signup pages
