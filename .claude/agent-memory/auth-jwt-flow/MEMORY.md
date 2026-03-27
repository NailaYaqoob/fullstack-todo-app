# Auth JWT Flow — Agent Memory

## better-auth version
- Installed: **1.4.19** in `frontend/`

## Import paths (verified against dist types)
- Server config: `import { betterAuth } from "better-auth"`
- JWT plugin (server): `import { jwt } from "better-auth/plugins/jwt"` — NOT `better-auth/plugins`
- Next.js handler: `import { toNextJsHandler } from "better-auth/next-js"` — confirmed exists
- Auth client: `import { createAuthClient } from "better-auth/react"`
- JWT client plugin: `import { jwtClient } from "better-auth/client/plugins"` — confirmed exists

## Database adapter API
- The `database` field accepts a `pg.Pool` instance directly:
  ```typescript
  import { Pool } from "pg";
  database: new Pool({ connectionString: process.env.DATABASE_URL! })
  ```
- Does NOT accept `{ provider: "pg", url: string }` — that format does not exist in v1.x

## betterAuth config shape
- `secret`: reads `BETTER_AUTH_SECRET` env (also auto-reads from env if not set in config)
- `baseURL`: reads `BETTER_AUTH_URL` env by default
- `session.expiresIn`: seconds (604800 = 7 days)
- `session.updateAge`: seconds (86400 = 1 day)

## Session cookie name
- Better Auth sets cookie named `better-auth.session_token` by default
- Middleware checks this + fallbacks to `__session` and `session`

## Backend JWT verification
- Library: `python-jose[cryptography]` (already in requirements.txt)
- Algorithm: HS256
- Secret: `BETTER_AUTH_SECRET` from env via `os.getenv`
- Pattern: `HTTPBearer(auto_error=True)` scheme + `jwt.decode(token, secret, algorithms=["HS256"])`
- JWT payload user ID claims to check in order: `sub`, `userId`, `id`

## API route handler
- `toNextJsHandler(auth)` returns `{ GET, POST, PATCH, PUT, DELETE }` — export only GET/POST

## File locations
- Backend: `backend/auth.py`, `backend/dependencies.py`
- Frontend server config: `frontend/lib/auth.ts`
- Frontend client: `frontend/lib/auth-client.ts`
- API handler: `frontend/app/api/auth/[...all]/route.ts`
- Middleware: `frontend/middleware.ts` (protects `/dashboard/:path*`)

## TypeScript
- `strict: true` in tsconfig — no `any` without justification
- `@/*` path alias maps to `./` (project root of frontend)
- Zero TS errors confirmed after full auth stack implementation
