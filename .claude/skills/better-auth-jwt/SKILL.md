# SKILL: better-auth-jwt

**Frontend**: Better Auth 1.x | **Backend**: python-jose | **Algorithm**: HS256
**Integrates with**: `nextjs-app-router`, `fastapi-rest`, `fullstack-monorepo`

---

## Overview

Better Auth is a TypeScript authentication library that runs on the Next.js server.
The JWT plugin makes it issue signed JWT tokens on login — these tokens are then sent
with every API request to the FastAPI backend, which verifies them independently
using the shared `BETTER_AUTH_SECRET`.

**The shared secret is the entire security model.** Both services must have the
identical value or all verification fails silently.

---

## Auth Flow (Mental Model)

```
┌─────────────┐     POST /api/auth/sign-in/email      ┌──────────────────┐
│   Browser   │ ─────────────────────────────────────► │  Next.js Server  │
│             │ ◄───────────── JWT token ─────────────  │  (Better Auth)   │
│             │                                         └──────────────────┘
│             │                                                  │
│             │   GET /api/{userId}/tasks                        │ BETTER_AUTH_SECRET
│             │   Authorization: Bearer <JWT>                    │ (shared)
│             │ ─────────────────────────────────────► ┌──────────────────┐
│             │ ◄───────────── tasks JSON ─────────────  │  FastAPI Backend │
└─────────────┘                                         └──────────────────┘
```

---

## Frontend Setup (Better Auth)

### Install

```bash
cd frontend && npm install better-auth
```

### Server Config (`lib/auth.ts`)

```typescript
// lib/auth.ts — server-only (never imported by client components directly)
import { betterAuth } from 'better-auth'
import { jwt } from 'better-auth/plugins'
import { Pool } from 'pg'  // or your DB adapter

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,  // Phase II: skip email verification
  },

  plugins: [
    jwt({
      jwt: {
        expirationTime: '7d',
        // The sub claim will be the user.id
      },
    }),
  ],

  trustedOrigins: [process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'],
})

// Type export for server-side session access
export type Session = typeof auth.$Infer.Session
```

### Route Handler (`app/api/auth/[...all]/route.ts`)

```typescript
// app/api/auth/[...all]/route.ts — Better Auth handles all /api/auth/* routes
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

### Client Instance (`lib/auth-client.ts`)

```typescript
// lib/auth-client.ts — safe to import in client components
import { createAuthClient } from 'better-auth/react'
import { jwtClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? 'http://localhost:3000',
  plugins: [jwtClient()],
})

// Convenience exports
export const { signIn, signUp, signOut, useSession, getSession } = authClient
```

### Getting the JWT Token for API Calls

```typescript
// In lib/api.ts — how to get the JWT to attach to backend requests
import { authClient } from '@/lib/auth-client'

async function getToken(): Promise<string | null> {
  // Better Auth JWT plugin exposes token via getToken()
  const token = await authClient.getToken()
  return token ?? null
}

// OR via session
async function getTokenFromSession(): Promise<string | null> {
  const session = await authClient.getSession()
  return session?.data?.token ?? null
}
```

---

## Login Page (`app/(auth)/login/page.tsx`)

```tsx
"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/auth-client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn.email({
      email,
      password,
      callbackURL: '/dashboard',
    })

    if (result.error) {
      setError(result.error.message ?? 'Invalid credentials')
      setLoading(false)
    }
    // Successful sign-in redirects via callbackURL
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">Sign in</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          No account?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
```

---

## Signup Page (`app/(auth)/signup/page.tsx`)

```tsx
"use client"
import { useState } from 'react'
import Link from 'next/link'
import { signUp } from '@/lib/auth-client'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signUp.email({
      name,
      email,
      password,
      callbackURL: '/dashboard',
    })

    if (result.error) {
      setError(result.error.message ?? 'Signup failed')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">Create account</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name, Email, Password fields — same pattern as login */}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
```

---

## Route Protection (`middleware.ts`)

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  const { pathname } = request.nextUrl
  const isAuthenticated = !!session?.user
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isProtected = pathname.startsWith('/dashboard')

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
```

---

## Backend JWT Verification (`auth.py`)

```python
# backend/auth.py
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError

SECRET = os.getenv("BETTER_AUTH_SECRET")
if not SECRET:
    raise RuntimeError("BETTER_AUTH_SECRET environment variable is required")

ALGORITHM = "HS256"
security = HTTPBearer(auto_error=True)

async def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(payload: dict = Depends(verify_jwt)) -> str:
    """Returns the authenticated user_id from the JWT payload."""
    # Better Auth JWT plugin puts user ID in 'sub' claim
    user_id = payload.get("sub") or payload.get("userId") or payload.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing user identifier",
        )
    return str(user_id)
```

---

## Environment Variables

```bash
# backend/.env
BETTER_AUTH_SECRET=<32+ character random string>   # MUST match frontend

# frontend/.env.local
BETTER_AUTH_SECRET=<same secret as backend>         # MUST match backend
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000   # For client-side auth client
```

**Generate a secure secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# or
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Better Auth Database Tables

Better Auth auto-creates these tables on startup:

| Table | Purpose |
|-------|---------|
| `user` | User accounts (id, email, name, createdAt, updatedAt) |
| `session` | Active sessions |
| `account` | OAuth provider accounts |
| `verification` | Email verification tokens |

Your `User` SQLModel should match the `user` table schema. Set `__tablename__ = "user"`.

---

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Mismatched `BETTER_AUTH_SECRET` | All JWT verification fails silently | Verify both `.env` files have identical values |
| Missing JWT plugin | Better Auth issues sessions, not JWTs | Add `jwt()` to `plugins` array in `auth.ts` |
| Wrong `sub` claim field | `get_current_user()` returns `None` | Try `sub`, `userId`, and `id` claims |
| `HTTPBearer(auto_error=False)` | Missing tokens return `None` instead of 401 | Use `auto_error=True` (default) |
| Not refreshing expired tokens | Users get 401 after 7 days | Frontend catches 401 and redirects to login |
| Importing server `auth` in client components | Build error: server-only module | Only import `auth-client.ts` in client components |
| Logging full JWT token | Security risk | Log only `payload['sub']` and `payload['exp']` |

---

## Debugging Auth Issues

```bash
# Decode a JWT token manually (without verification — debugging only)
python -c "
import base64, json
token = '<paste-token-here>'
parts = token.split('.')
payload = base64.b64decode(parts[1] + '==').decode()
print(json.dumps(json.loads(payload), indent=2))
"
```

Check:
1. `sub` field contains the user ID
2. `exp` field is in the future (Unix timestamp)
3. `iss` or other claims match what python-jose expects

---

## Integration Points

- **`nextjs-app-router`**: `lib/auth.ts` (server), `lib/auth-client.ts` (client), `middleware.ts`
- **`fastapi-rest`**: `auth.py` → `get_current_user()` dependency on every route
- **`sqlmodel-neon`**: Better Auth uses same database; `User` model must match `user` table
- **`fullstack-monorepo`**: `BETTER_AUTH_SECRET` must be identical in both `.env` files
