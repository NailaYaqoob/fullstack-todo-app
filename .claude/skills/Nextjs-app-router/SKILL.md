# SKILL: nextjs-app-router

**Version**: Next.js 16+ | **Router**: App Router | **Language**: TypeScript (strict)
**Integrates with**: `better-auth-jwt`, `fullstack-monorepo`

---

## Overview

Next.js App Router uses React Server Components by default. Every file in `app/` is a
Server Component unless marked `"use client"`. The key mental model: **server by default,
client only when you need interactivity or browser APIs**.

---

## Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx          ← Root layout — wraps every page (no "use client")
│   ├── page.tsx            ← Route: /
│   ├── loading.tsx         ← Automatic loading UI for this segment
│   ├── error.tsx           ← Error boundary ("use client" required)
│   ├── not-found.tsx       ← 404 page
│   ├── (auth)/             ← Route group — shared layout, not in URL
│   │   ├── login/page.tsx  ← Route: /login
│   │   └── signup/page.tsx ← Route: /signup
│   └── dashboard/
│       ├── layout.tsx      ← Dashboard layout (auth guard goes here)
│       ├── page.tsx        ← Route: /dashboard
│       └── loading.tsx     ← Dashboard loading skeleton
├── components/
│   ├── ui/                 ← Pure UI primitives (Button, Input, Card)
│   └── features/           ← Feature-specific composites (TaskList, TaskForm)
├── lib/
│   ├── api.ts              ← ONLY place for backend HTTP calls
│   └── auth.ts             ← Better Auth server config
├── types/
│   └── index.ts            ← All TypeScript interfaces
└── middleware.ts            ← Route protection (runs on edge)
```

---

## Server vs Client Components

### When to use Server Components (default — no directive)
- Fetching data directly
- Accessing environment variables (non-`NEXT_PUBLIC_`)
- Static rendering, layouts, pages
- Anything that does NOT need: state, effects, event handlers, browser APIs

```tsx
// app/dashboard/page.tsx — Server Component (no directive)
import { api } from '@/lib/api'
import { TaskList } from '@/components/features/TaskList'

export default async function DashboardPage() {
  // Data fetch runs on server — no loading state needed at this level
  const tasks = await api.getTasks()
  return <TaskList initialTasks={tasks} />
}
```

### When to use Client Components (`"use client"`)
- `useState`, `useEffect`, `useRef`, `useContext`
- Event handlers (`onClick`, `onSubmit`, `onChange`)
- Browser APIs (`window`, `localStorage`, `document`)
- Better Auth client hooks (`useSession`)

```tsx
// components/features/TaskForm.tsx — Client Component
"use client"
import { useState } from 'react'
import { api } from '@/lib/api'

export function TaskForm({ onCreated }: { onCreated: (task: Task) => void }) {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    try {
      const task = await api.createTask({ title })
      onCreated(task)
      setTitle('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="New task..."
        disabled={loading}
        className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={loading || !title.trim()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Adding…' : 'Add'}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  )
}
```

---

## Routing Patterns

### Route Groups `(groupName)/`
Groups segments without affecting the URL. Use for shared layouts:

```
app/
├── (auth)/           ← URL path: nothing — just groups /login and /signup
│   ├── layout.tsx    ← Shared layout for login + signup (centered card, etc.)
│   ├── login/page.tsx
│   └── signup/page.tsx
└── (app)/            ← Protected app routes
    ├── layout.tsx    ← Auth guard + dashboard shell
    └── dashboard/page.tsx
```

### Dynamic Routes `[param]/`

```tsx
// app/tasks/[id]/page.tsx
interface Props {
  params: Promise<{ id: string }>  // Note: params is a Promise in Next.js 15+
}

export default async function TaskPage({ params }: Props) {
  const { id } = await params
  const task = await api.getTask(id)
  return <TaskDetail task={task} />
}
```

### Loading UI

```tsx
// app/dashboard/loading.tsx — automatic skeleton during navigation
export default function DashboardLoading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  )
}
```

### Error Boundaries

```tsx
// app/dashboard/error.tsx — MUST be "use client"
"use client"
export default function DashboardError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="text-center py-10">
      <p className="text-red-500">Something went wrong.</p>
      <button onClick={reset} className="mt-4 text-blue-600 underline">
        Try again
      </button>
    </div>
  )
}
```

---

## API Client Pattern (`lib/api.ts`)

**Rule**: ALL backend calls go through `lib/api.ts`. Never `fetch()` directly in components.

```typescript
// lib/api.ts
import { authClient } from '@/lib/auth-client'
import type { Task, CreateTaskInput, UpdateTaskInput } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL
if (!BASE_URL) throw new Error('NEXT_PUBLIC_API_URL is required')

class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

async function fetchWithAuth(path: string, init: RequestInit = {}): Promise<Response> {
  const session = await authClient.getSession()
  const token = session?.data?.token  // Better Auth JWT token

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  if (res.status === 401) {
    await authClient.signOut()
    window.location.href = '/login'
    throw new ApiError(401, 'Session expired')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new ApiError(res.status, body.detail ?? 'Request failed')
  }

  return res
}

export const api = {
  // Tasks
  getTasks: async (userId: string, status?: 'pending' | 'completed'): Promise<Task[]> => {
    const params = status ? `?status=${status}` : ''
    const res = await fetchWithAuth(`/api/${userId}/tasks${params}`)
    return res.json()
  },

  getTask: async (userId: string, taskId: string): Promise<Task> => {
    const res = await fetchWithAuth(`/api/${userId}/tasks/${taskId}`)
    return res.json()
  },

  createTask: async (userId: string, data: CreateTaskInput): Promise<Task> => {
    const res = await fetchWithAuth(`/api/${userId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.json()
  },

  updateTask: async (userId: string, taskId: string, data: UpdateTaskInput): Promise<Task> => {
    const res = await fetchWithAuth(`/api/${userId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return res.json()
  },

  toggleTask: async (userId: string, taskId: string): Promise<Task> => {
    const res = await fetchWithAuth(`/api/${userId}/tasks/${taskId}/complete`, {
      method: 'PATCH',
    })
    return res.json()
  },

  deleteTask: async (userId: string, taskId: string): Promise<void> => {
    await fetchWithAuth(`/api/${userId}/tasks/${taskId}`, { method: 'DELETE' })
  },
}
```

---

## TypeScript Types (`types/index.ts`)

```typescript
// types/index.ts
export interface Task {
  id: string
  title: string
  description?: string
  completed: boolean
  userId: string
  createdAt: string   // ISO 8601
  updatedAt: string   // ISO 8601
}

export interface CreateTaskInput {
  title: string        // 1–200 chars
  description?: string // max 1000 chars
}

export interface UpdateTaskInput {
  title?: string
  description?: string
}

export interface User {
  id: string
  email: string
  name?: string
}
```

---

## Tailwind CSS Patterns

### Mobile-First Responsive Container
```tsx
<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
```

### Card Component Pattern
```tsx
<div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-900 dark:border-gray-800">
```

### Interactive Button States
```tsx
<button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white
  transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed
  disabled:opacity-50">
```

### Form Input Pattern
```tsx
<input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
  placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1
  focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500" />
```

---

## Middleware (Route Protection)

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'  // Better Auth server helper

const PROTECTED_PATHS = ['/dashboard']
const AUTH_PATHS = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await getSession(request)
  const isAuthenticated = !!session?.user

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && AUTH_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect unauthenticated users away from protected pages
  if (!isAuthenticated && PROTECTED_PATHS.some(p => pathname.startsWith(p))) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
```

---

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Adding `"use client"` everywhere | Loses server rendering benefits; larger bundles | Only add to components that need interactivity |
| `fetch()` directly in components | Bypasses auth token attachment | Always use `lib/api.ts` |
| `params` accessed synchronously | Next.js 15+: params is a Promise | `const { id } = await params` |
| Missing `loading.tsx` | Users see no feedback during navigation | Add `loading.tsx` next to every `page.tsx` |
| Inline styles with Tailwind | Tailwind purges unused classes; conflicts | Tailwind only — no `style={{}}` |
| `any` types | Defeats TypeScript strict mode | Use proper types or `unknown` + narrowing |
| Hardcoded API URL | Breaks across environments | Always `process.env.NEXT_PUBLIC_API_URL` |
| Direct DB access from frontend | Bypasses JWT auth layer | All data through `lib/api.ts` → backend |

---

## Environment Variables

```bash
# frontend/.env.local (never commit)
NEXT_PUBLIC_API_URL=http://localhost:8000    # Public: accessible in browser
BETTER_AUTH_SECRET=<32+ char secret>         # Private: server-only
BETTER_AUTH_URL=http://localhost:3000        # Private: server-only
```

`NEXT_PUBLIC_` prefix = exposed to the browser. All other vars = server-only.

---

## Integration Points

- **`better-auth-jwt`**: `lib/auth.ts` (server config), `lib/auth-client.ts` (client hooks), `middleware.ts`
- **`fastapi-rest`**: All API calls in `lib/api.ts` match FastAPI endpoint shapes
- **`fullstack-monorepo`**: Lives in `frontend/` subdirectory; shares `BETTER_AUTH_SECRET` with backend
