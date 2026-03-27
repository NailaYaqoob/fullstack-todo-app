# UI Pages

**Framework**: Next.js 16+ App Router
**Routing**: File-based (`/app` directory)
**Auth**: Route protection via Next.js middleware (`middleware.ts`)

## Route Protection
- `/dashboard` and `/chat` require authentication
- Unauthenticated requests are redirected to `/login`
- Middleware reads Better Auth session/JWT from cookies

---

## Login Page
**Path**: `frontend/app/login/page.tsx`
**Route**: `/login`
**Access**: Public (redirects to `/dashboard` if already authenticated)

**Layout**:
- Centered card
- App title/logo
- `AuthForm` component in `"signin"` mode
- Link: "Don't have an account? Sign up" → `/signup`

---

## Signup Page
**Path**: `frontend/app/signup/page.tsx`
**Route**: `/signup`
**Access**: Public (redirects to `/dashboard` if already authenticated)

**Layout**:
- Centered card
- App title/logo
- `AuthForm` component in `"signup"` mode
- Link: "Already have an account? Sign in" → `/login`

---

## Dashboard Page
**Path**: `frontend/app/dashboard/page.tsx`
**Route**: `/dashboard`
**Access**: Protected (requires authentication)

**Layout**:
- `Navbar` at top
- Page heading: "My Tasks"
- `TaskForm` — create new task
- `TaskList` — displays all tasks with filter controls
- Empty state: "No tasks yet. Add one above!" when list is empty

**Data Loading**:
- Server component fetches initial tasks via `GET /api/{user_id}/tasks`
- Passes `initialTasks` to `TaskList` for client-side updates

---

## Chat Page (Phase III)
**Path**: `frontend/app/chat/page.tsx`
**Route**: `/chat`
**Access**: Protected (requires authentication)

**Layout**:
- `Navbar` at top
- OpenAI ChatKit component filling the main content area
- Chat connected to `POST /api/chat` backend endpoint
- Conversation history loaded on mount
- Example prompts shown in empty state:
  - "Show my tasks"
  - "Add a task: buy groceries"
  - "Mark 'buy groceries' as done"

---

## Root Page
**Path**: `frontend/app/page.tsx`
**Route**: `/`
**Access**: Public

**Behavior**:
- Redirects authenticated users to `/dashboard`
- Redirects unauthenticated users to `/login`

---

## Layout
**Path**: `frontend/app/layout.tsx`

**Behavior**:
- Root layout wrapping all pages
- Sets global font and body styles
- Provides Better Auth session context (if required by client components)
- Includes `<Toaster>` for toast notifications
