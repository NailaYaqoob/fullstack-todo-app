# UI Components

**Framework**: Next.js 16+ App Router
**Styling**: Tailwind CSS
**Auth**: Better Auth client (`@/lib/auth-client`)
**API Client**: `@/lib/api`

## Component Conventions
- Server components by default; add `"use client"` only for interactivity
- No inline styles — Tailwind classes only
- API calls go through `/lib/api.ts`
- Auth calls go through `/lib/auth-client.ts`

---

## TaskForm
**Path**: `frontend/components/TaskForm.tsx`
**Type**: Client component

**Purpose**: Form for creating a new task.

**Props**:
```ts
interface TaskFormProps {
  onCreated: (task: Task) => void;
}
```

**Behavior**:
- Text input for `title` (required, max 200 chars)
- Textarea for `description` (optional, max 1000 chars)
- Submit button calls `POST /api/{user_id}/tasks`
- Shows inline validation error if title is empty or too long
- Clears form on successful creation
- Calls `onCreated` with the new task to update parent state

---

## TaskItem
**Path**: `frontend/components/TaskItem.tsx`
**Type**: Client component

**Purpose**: Displays a single task row with actions.

**Props**:
```ts
interface TaskItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onEdit: (task: Task) => void;
}
```

**Behavior**:
- Shows task `title`, `description` (truncated), and `created_at` date
- Checkbox to toggle `completed` — calls `PATCH /api/{user_id}/tasks/{id}/complete`
- Completed tasks render with strikethrough style
- Edit button opens `TaskEditModal`
- Delete button calls `DELETE /api/{user_id}/tasks/{id}` with confirmation prompt

---

## TaskList
**Path**: `frontend/components/TaskList.tsx`
**Type**: Client component

**Purpose**: Renders the full list of tasks with filter controls.

**Props**:
```ts
interface TaskListProps {
  initialTasks: Task[];
}
```

**Behavior**:
- Displays `TaskItem` for each task
- Filter bar: buttons for `All` / `Pending` / `Completed`
- Empty state message when no tasks match the filter
- Updates task list optimistically on toggle/delete

---

## TaskEditModal
**Path**: `frontend/components/TaskEditModal.tsx`
**Type**: Client component

**Purpose**: Modal dialog for editing an existing task.

**Props**:
```ts
interface TaskEditModalProps {
  task: Task;
  onSaved: (task: Task) => void;
  onClose: () => void;
}
```

**Behavior**:
- Pre-fills title and description from existing task
- Submit calls `PUT /api/{user_id}/tasks/{id}`
- Closes on success, calling `onSaved` with updated task
- Close button / ESC key closes without saving

---

## AuthForm
**Path**: `frontend/components/AuthForm.tsx`
**Type**: Client component

**Purpose**: Reusable form for sign-in and sign-up flows.

**Props**:
```ts
interface AuthFormProps {
  mode: "signin" | "signup";
}
```

**Behavior**:
- Email input (required, valid format)
- Password input (required, min 8 chars for signup)
- Name input (signup only)
- Submit calls Better Auth `signIn.email()` or `signUp.email()`
- Shows error message on failure
- Redirects to `/dashboard` on success
- Link to switch between sign-in and sign-up

---

## Navbar
**Path**: `frontend/components/Navbar.tsx`
**Type**: Server component (with client sign-out button)

**Purpose**: Top navigation bar.

**Behavior**:
- Displays app name/logo
- Shows user email when authenticated
- Sign Out button calls Better Auth `signOut()` and redirects to `/login`
- Only shown on authenticated routes
