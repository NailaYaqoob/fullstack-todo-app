# Frontend Guidelines — fullstack-todo-app

## Stack
- Next.js 16+ (App Router)
- TypeScript (`"strict": true` — no `any` without justification comment)
- Tailwind CSS
- Better Auth (client-side, with JWT plugin)

## Project Structure
```
frontend/
├── app/                  — Next.js App Router pages and layouts
│   ├── (auth)/           — Auth routes: /login, /signup
│   └── dashboard/        — Protected routes (tasks, profile)
├── components/           — Reusable UI components
├── lib/
│   ├── api.ts            — SOLE backend API client (all HTTP calls go here)
│   └── auth.ts           — Better Auth client setup
└── types/                — TypeScript interfaces for shared data shapes
```

## Critical Rules
1. All backend API calls MUST go through `lib/api.ts` — never fetch directly in components
2. JWT token MUST be attached to every API request via `Authorization: Bearer <token>`
3. Protected routes MUST check auth state and redirect to `/login` if unauthenticated
4. No hardcoded URLs or secrets — use `NEXT_PUBLIC_API_URL` env var for backend base URL

## API Client Pattern (`lib/api.ts`)
```typescript
// Attach token on every call
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
}
```

## Auth Setup (`lib/auth.ts`)
- Uses Better Auth with JWT plugin enabled
- `BETTER_AUTH_SECRET` env var MUST match the backend
- Session token stored and retrieved via Better Auth client helpers

## Env Vars (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
BETTER_AUTH_SECRET=<shared-secret>
BETTER_AUTH_URL=http://localhost:3000
```

## Component Conventions
- Use server components by default; add `"use client"` only for interactivity
- Tailwind CSS classes only — no inline styles, no CSS modules
- Loading states MUST be handled for all async operations
- Error states MUST be displayed to the user (no silent failures)

## Running
```bash
npm run dev       # development (port 3000)
npm run build     # production build
npm run lint      # ESLint check
```
