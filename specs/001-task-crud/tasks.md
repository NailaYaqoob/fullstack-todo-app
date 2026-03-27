# Tasks: Task CRUD Operations

**Input**: Design documents from `/specs/001-task-crud/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: No test tasks — not explicitly requested in spec.md.

**Organization**: Tasks grouped by user story for independent implementation and testing.

**Assumed ready**: `002-user-auth` fully implemented (`backend/auth.py`,
`backend/dependencies.py`, `frontend/lib/auth-client.ts` all exist);
`backend/db.py` with `get_session()` and `create_db_and_tables()` (from `/db-setup`);
Neon PostgreSQL connected; monorepo scaffolded.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state dependency)
- **[Story]**: Maps task to a user story from spec.md (US1–US4)
- Paths are relative to monorepo root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the routers package before any route handlers are written.

- [x] T001 Create `backend/routers/__init__.py` — empty file that makes `routers/` a Python package; enables `from routers.tasks import router` imports in `backend/main.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data models, TypeScript types, API client, router skeleton, and main.py
wiring that ALL four user stories depend on. All five tasks target different files —
launch in parallel.

**⚠️ CRITICAL**: No user story phase can begin until every task here is complete.

- [x] T002 [P] Update `backend/models.py` — add all Task-related SQLModel definitions:
  - Import `uuid`, `datetime`, `Optional` from stdlib; `SQLModel`, `Field` from `sqlmodel`;
    `field_validator` from `pydantic`; `BaseModel` from `pydantic`
  - `class TaskBase(SQLModel)`: fields `title: str = Field(min_length=1, max_length=200)`
    and `description: Optional[str] = Field(default=None, max_length=1000)`;
    add `@field_validator("title") @classmethod def title_not_whitespace(cls, v)` that
    strips the value and raises `ValueError` if the result is empty
  - `class Task(TaskBase, table=True)`: `__tablename__ = "task"`;
    `id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)`;
    `user_id: str = Field(index=True)`;
    `completed: bool = Field(default=False)`;
    `created_at: datetime = Field(default_factory=datetime.utcnow)`;
    `updated_at: datetime = Field(default_factory=datetime.utcnow)`
  - `class TaskCreate(TaskBase): pass`
  - `class TaskRead(TaskBase)`: add `id: uuid.UUID`, `user_id: str`, `completed: bool`,
    `created_at: datetime`, `updated_at: datetime`
  - `class TaskUpdate(SQLModel)`: `title: Optional[str] = Field(default=None, min_length=1, max_length=200)`,
    `description: Optional[str] = Field(default=None, max_length=1000)`;
    same `title_not_whitespace` validator (skip if `v is None`)
  - `class UserRead(BaseModel)`: `id: str`, `name: str`, `email: str`,
    `created_at: datetime` — type hint only, no `table=True`
  - **Critical**: only `Task` has `table=True` — do NOT add `User` or `Session` with `table=True`

- [x] T003 [P] Create `frontend/lib/types.ts` — TypeScript interfaces matching FastAPI response shapes:
  ```typescript
  export interface Task {
    id: string           // UUID as string
    user_id: string
    title: string
    description: string | null
    completed: boolean
    created_at: string   // ISO 8601
    updated_at: string
  }
  export interface TaskCreate { title: string; description?: string }
  export interface TaskUpdate { title?: string; description?: string }
  ```
  Note: fields use `snake_case` matching FastAPI JSON output directly

- [x] T004 [P] Create `backend/routers/tasks.py` — router skeleton with ownership helper:
  - Imports: `uuid`, `datetime`, `Optional`, `Literal` from stdlib; `APIRouter`,
    `Depends`, `HTTPException` from `fastapi`; `AsyncSession`, `select` from `sqlalchemy`;
    `Task`, `TaskCreate`, `TaskRead`, `TaskUpdate` from `models`;
    `get_current_user` from `dependencies`; `get_session` from `db`
  - `router = APIRouter()`
  - `async def _get_owned_task(task_id: uuid.UUID, user_id: str, session: AsyncSession) -> Task`:
    `task = await session.get(Task, task_id)`; if `not task or task.user_id != user_id`:
    raise `HTTPException(status_code=404, detail="Task not found")`; return `task`
  - Leave route handlers empty (added per user story phase below)

- [x] T005 [P] Create `frontend/lib/api.ts` — full API client with all 6 task functions:
  - Import `authClient` from `"./auth-client"`; import `Task`, `TaskCreate`, `TaskUpdate`
    from `"./types"`
  - `const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"`
  - `async function fetchWithAuth(url, options)`: call `authClient.token()`, attach
    `Authorization: Bearer <token>` and `Content-Type: application/json` headers,
    call `fetch(BASE + url, merged options)`, return response
  - `export async function listTasks(userId, status?)`: GET
    `/api/${userId}/tasks${status ? ?status=${status} : ""}`, return `res.json() as Task[]`
  - `export async function createTask(userId, data: TaskCreate)`: POST
    `/api/${userId}/tasks`, body `JSON.stringify(data)`, check `res.ok` else throw,
    return `res.json() as Task`
  - `export async function getTask(userId, taskId)`: GET `/api/${userId}/tasks/${taskId}`,
    return `res.json() as Task`
  - `export async function updateTask(userId, taskId, data: TaskUpdate)`: PATCH
    `/api/${userId}/tasks/${taskId}`, body `JSON.stringify(data)`, return `res.json() as Task`
  - `export async function deleteTask(userId, taskId)`: DELETE
    `/api/${userId}/tasks/${taskId}`, check `res.ok` else throw; return `void`
  - `export async function toggleTask(userId, taskId)`: PATCH
    `/api/${userId}/tasks/${taskId}/toggle`, return `res.json() as Task`

- [x] T006 [P] Update `backend/main.py` — register the tasks router:
  - Add `from routers.tasks import router as tasks_router`
  - Add `app.include_router(tasks_router)` after existing middleware/startup setup
  - The `task` table will be created automatically when `create_db_and_tables()` runs
    at startup (it is now registered in models.py via `Task(table=True)`)

**Checkpoint**: Models defined, TypeScript types declared, API client ready, router
skeleton wired into FastAPI. `task` table created on next backend startup.

---

## Phase 3: User Story 1 — Create and View Tasks (Priority: P1) 🎯 MVP

**Goal**: A signed-in user can create tasks and see them in their list.

**Independent Test**: Sign in; navigate to `http://localhost:3000/dashboard`; see empty
state message. Submit new task with title "Buy groceries" → task appears in list with
"pending" status and today's date. Submit empty title → validation error. Submit title
of 201 chars → validation error. Second user signs in and sees only their own tasks.

- [x] T007 [US1] Add list_tasks, create_task, get_task handlers to `backend/routers/tasks.py`:
  - `GET /api/{user_id}/tasks` with optional `status: Optional[Literal["pending","completed"]] = None`:
    check `user_id != current_user_id` → 403; `select(Task).where(Task.user_id == current_user_id).order_by(Task.created_at.desc())`; add `.where(Task.completed == False/True)` if status filter provided; return `result.scalars().all()`; `response_model=list[TaskRead]`
  - `POST /api/{user_id}/tasks` `status_code=201 response_model=TaskRead`:
    check ownership; `task = Task(**body.model_dump(), user_id=current_user_id)`;
    `session.add(task)`; `await session.commit()`; `await session.refresh(task)`; return `task`
  - `GET /api/{user_id}/tasks/{task_id}` `response_model=TaskRead`:
    check ownership; return `await _get_owned_task(task_id, current_user_id, session)`

- [x] T008 [P] [US1] Create `frontend/components/TaskCard.tsx` — individual task display:
  - `"use client"` component; props: `task: Task`, `onToggle: (id: string) => void`,
    `onEdit: (task: Task) => void`, `onDelete: (id: string) => void`
  - Render: title (bold), description (muted text, if present), creation date
    (`new Date(task.created_at).toLocaleDateString()`), completed badge
    (green "Completed" or gray "Pending")
  - Action row: toggle button (checkmark icon or "Mark complete"/"Reopen" text),
    edit button (pencil icon), delete button (trash icon)
  - Each button calls its prop handler; buttons are rendered but handlers are wired in
    later story phases — pass no-ops initially from TaskList if handlers not yet active
  - Tailwind CSS; completed tasks get a visual distinction (strikethrough title or muted colors)

- [x] T009 [P] [US1] Create `frontend/components/TaskForm.tsx` — create/edit form:
  - `"use client"` component; props: `onSubmit: (data: TaskCreate) => Promise<void>`,
    `initialValues?: { title: string; description?: string }` (for edit mode),
    `submitLabel?: string` (default: "Add Task"), `onCancel?: () => void`
  - Controlled form: `useState` for `title`, `description`, `error`, `loading`
  - Pre-fill from `initialValues` on mount (for edit mode)
  - Client-side validation: trim title; reject if empty or whitespace-only; reject if
    `title.length > 200`; reject if `description && description.length > 1000`
  - On submit: `setLoading(true)`; call `onSubmit({ title: title.trim(), description })`
    which is provided by parent; reset form on success; display error on failure
  - Tailwind CSS; disable submit while loading; cancel button if `onCancel` prop provided

- [x] T010 [US1] Create `frontend/components/TaskList.tsx` — task list with filter tabs:
  - `"use client"` component; props: `tasks: Task[]`, `onToggle`, `onEdit`, `onDelete`
    (all forwarded to TaskCard)
  - Local state: `filter: "all" | "pending" | "completed"` (default: `"all"`)
  - Filter tabs: three buttons ("All", "Pending", "Completed"); active tab highlighted
  - Derived `filteredTasks` computed from `tasks` and `filter`
  - Empty state: if `filteredTasks.length === 0` and `filter === "all"` show
    "No tasks yet. Create your first task!" (SC-004); if filtered but no results show
    "No [pending/completed] tasks."
  - Render `filteredTasks.map(t => <TaskCard key={t.id} task={t} onToggle={onToggle} .../>)`
  - Tailwind CSS

- [x] T011 [US1] Update `frontend/app/dashboard/page.tsx` — wire task list and creation:
  - Convert to `"use client"` component (needs state for task list and form); or keep
    server component shell and extract client island — prefer full client component
    for simplicity at this phase
  - `useState<Task[]>` for tasks; `useState<boolean>` for loading; `useState<string | null>` for error
  - `useEffect`: on mount, get session via `authClient.useSession()` or import from
    `auth-client`; call `listTasks(session.user.id)` → set tasks
  - Render: header with `<h1>My Tasks</h1>` and user name; `<TaskForm>` at top for
    creating new tasks with `onSubmit` calling `createTask(userId, data)` then prepending
    new task to tasks state; `<TaskList tasks={tasks} onToggle={...} onEdit={...} onDelete={...}>`
    with no-op handlers for toggle/edit/delete (wired in US2–US4)
  - Show loading spinner while fetching; show error message on fetch failure

**Checkpoint**: Create and view tasks fully functional. New tasks appear immediately.
Empty state shown for new users. Only own tasks visible (user isolation enforced).

---

## Phase 4: User Story 2 — Toggle Task Completion (Priority: P2)

**Goal**: A signed-in user can mark a task as complete and reverse it.

**Independent Test**: Create a task (US1); click toggle → status changes to "Completed"
with visual distinction. Click toggle again → status reverts to "Pending". A second
user cannot toggle the first user's task (returns 404).

- [x] T012 [US2] Add toggle_task handler to `backend/routers/tasks.py`:
  - `PATCH /api/{user_id}/tasks/{task_id}/toggle` `response_model=TaskRead`:
    check `user_id != current_user_id` → 403;
    `task = await _get_owned_task(task_id, current_user_id, session)`;
    `task.completed = not task.completed`;
    `task.updated_at = datetime.utcnow()`;
    `session.add(task)`; `await session.commit()`; `await session.refresh(task)`; return `task`

- [x] T013 [US2] Wire toggle in `frontend/app/dashboard/page.tsx` and `frontend/components/TaskCard.tsx`:
  - In `dashboard/page.tsx`: implement `handleToggle(taskId: string)` that calls
    `toggleTask(userId, taskId)` then updates the task in the `tasks` state array
    (replace the task with the returned updated task)
  - Pass `handleToggle` as `onToggle` prop to `<TaskList>`
  - `TaskCard.tsx` already calls `onToggle(task.id)` on button click (from T008) —
    no change needed to TaskCard; verify the toggle button is correctly calling the prop

**Checkpoint**: Toggle fully functional. Completed tasks visually distinct. Toggle is
reversible. Cross-user toggle blocked at backend (404).

---

## Phase 5: User Story 3 — Update Task Details (Priority: P3)

**Goal**: A signed-in user can edit a task's title and description.

**Independent Test**: Create a task; click edit → form pre-filled with current values;
update title → new title displayed. Try saving empty title → validation error. A second
user cannot edit the first user's task.

- [x] T014 [US3] Add update_task handler to `backend/routers/tasks.py`:
  - `PATCH /api/{user_id}/tasks/{task_id}` `response_model=TaskRead`:
    check `user_id != current_user_id` → 403;
    `task = await _get_owned_task(task_id, current_user_id, session)`;
    `update_data = body.model_dump(exclude_unset=True)`;
    `for field, value in update_data.items(): setattr(task, field, value)`;
    `task.updated_at = datetime.utcnow()`;
    `session.add(task)`; `await session.commit()`; `await session.refresh(task)`; return `task`

- [x] T015 [US3] Wire edit in `frontend/app/dashboard/page.tsx` and `frontend/components/TaskCard.tsx`:
  - In `dashboard/page.tsx`: add `useState<Task | null>` for `editingTask`; implement
    `handleEdit(task: Task)` that sets `editingTask`; implement `handleUpdate(data: TaskUpdate)`
    that calls `updateTask(userId, editingTask.id, data)` then replaces the task in
    tasks state with the returned updated task and clears `editingTask`
  - Render: when `editingTask` is set, show `<TaskForm initialValues={editingTask}
    onSubmit={handleUpdate} submitLabel="Save Changes" onCancel={() => setEditingTask(null)}`
    (modal overlay or inline replacement of the TaskCard)
  - Pass `handleEdit` as `onEdit` prop to `<TaskList>` (forwarded to `<TaskCard>`)
  - `TaskCard.tsx` already calls `onEdit(task)` on edit button click — no change needed

**Checkpoint**: Edit fully functional. Title and description updateable. Empty title
rejected client-side and server-side. Cross-user edit blocked (404).

---

## Phase 6: User Story 4 — Delete a Task (Priority: P4)

**Goal**: A signed-in user can permanently delete a task.

**Independent Test**: Create a task; click delete → task removed from list immediately.
Navigate away and back → task is gone. A second user cannot delete the first user's task.

- [x] T016 [US4] Add delete_task handler to `backend/routers/tasks.py`:
  - `DELETE /api/{user_id}/tasks/{task_id}` `status_code=204`:
    check `user_id != current_user_id` → 403;
    `task = await _get_owned_task(task_id, current_user_id, session)`;
    `await session.delete(task)`; `await session.commit()`
  - No response body (204 No Content)

- [x] T017 [US4] Wire delete in `frontend/app/dashboard/page.tsx`:
  - Implement `handleDelete(taskId: string)` that calls `deleteTask(userId, taskId)` then
    removes the task from tasks state (`setTasks(prev => prev.filter(t => t.id !== taskId))`)
  - Pass `handleDelete` as `onDelete` prop to `<TaskList>` (forwarded to `<TaskCard>`)
  - `TaskCard.tsx` already calls `onDelete(task.id)` on delete button click — no change needed
  - Optional: add a confirmation prompt (`window.confirm("Delete this task?")`) before
    calling the API to prevent accidental deletion

**Checkpoint**: Full CRUD cycle complete. All 11 functional requirements satisfied.
Task lifecycle: create → view → toggle → edit → delete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 401 error handling, quickstart validation, and robustness.

- [x] T018 [P] Add 401 handling to `frontend/lib/api.ts` — after every `fetchWithAuth`
  response check: if `res.status === 401`, call `authClient.signOut()` then
  `window.location.href = "/login"` (or use `router.push("/login")` if in a component);
  add a shared `throwIfError(res: Response)` helper that: for 401 → redirect to login;
  for other non-ok statuses → throw `new Error(await res.json().then(d => d.detail ?? res.statusText))`;
  use `throwIfError` in all 6 functions

- [x] T019 [P] Run quickstart.md validation — execute all curl commands from
  `specs/001-task-crud/quickstart.md` sections 3, 4, and 5; verify all 6 endpoints
  respond correctly; confirm security checks (cross-user → 404, URL mismatch → 403,
  no auth → 403); confirm browser E2E checklist in section 5 passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Requires Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Requires Phase 2 — no dependency on other user stories
- **US2 (Phase 4)**: Requires Phase 3 — toggle needs tasks to exist in the UI
- **US3 (Phase 5)**: Requires Phase 3 — edit needs tasks to exist in the UI; independent of US2
- **US4 (Phase 6)**: Requires Phase 3 — delete needs tasks to exist in the UI; independent of US2/US3
- **Polish (Phase 7)**: Requires all user stories complete

### Backend vs Frontend Independence

Within each user story, backend and frontend tasks are independent of each other and
can run in parallel (different files, different services):

| Story | Backend task | Frontend task(s) |
|-------|-------------|-----------------|
| US1 | T007 (`routers/tasks.py` add 3 handlers) | T008, T009 [P], T010, T011 |
| US2 | T012 (add toggle handler) | T013 (wire toggle) |
| US3 | T014 (add update handler) | T015 (wire edit) |
| US4 | T016 (add delete handler) | T017 (wire delete) |

### Within Phase 3 (US1) Dependency Order

```
T007 (backend handlers)   ─── independent of frontend ───►
T008 (TaskCard)           ─┐
T009 (TaskForm)           ─┤ parallel ─► T010 (TaskList, imports TaskCard)
                            └──────────► T011 (dashboard, imports TaskList + TaskForm)
```

### Parallel Opportunities

- **Phase 2**: T002 + T003 + T004 + T005 + T006 — all 5 parallel
- **Phase 3**: T007 + T008 + T009 parallel; T010 after T008; T011 after T008+T009+T010
- **Phases 4–6**: Backend handler + frontend wiring can run in parallel within each phase
- **Phase 7**: T018 + T019 parallel

---

## Parallel Example: Phase 2 (All 5 Tasks Simultaneously)

```bash
# Launch all foundational tasks in parallel:
Task(backend): "Update backend/models.py with Task SQLModel definitions"  # T002
Task(frontend): "Create frontend/lib/types.ts TypeScript interfaces"      # T003
Task(backend): "Create backend/routers/tasks.py skeleton"                 # T004
Task(frontend): "Create frontend/lib/api.ts with all 6 task functions"    # T005
Task(backend): "Update backend/main.py to include tasks router"           # T006
```

## Parallel Example: Phase 3 (US1 Frontend Components)

```bash
# After T007 is dispatched, launch frontend in parallel:
Task(backend):  "Add list_tasks, create_task, get_task to routers/tasks.py"  # T007
Task(frontend): "Create frontend/components/TaskCard.tsx"                     # T008
Task(frontend): "Create frontend/components/TaskForm.tsx"                     # T009
# Then after T008 completes:
Task(frontend): "Create frontend/components/TaskList.tsx"                     # T010
# Then after T008 + T009 + T010 complete:
Task(frontend): "Update frontend/app/dashboard/page.tsx"                      # T011
```

---

## Implementation Strategy

### MVP First (US1 — Create and View Tasks Only)

1. Complete Phase 1 (T001) — routers package
2. Complete Phase 2 (T002–T006) — all foundations
3. Complete Phase 3 (T007–T011) — create + list + view
4. **STOP and VALIDATE**: User can create tasks and see them; empty state works; user isolation verified
5. Demo: full create-and-view flow

### Incremental Delivery

| After | Working Feature | Test Criteria |
|-------|----------------|---------------|
| Phase 2 | Models + API client | Backend starts; task table created |
| + Phase 3 | Create + View | New tasks appear; empty state; own tasks only |
| + Phase 4 | Toggle | Tasks marked complete/pending |
| + Phase 5 | Edit | Task details updatable |
| + Phase 6 | Delete | Tasks permanently removable |
| + Phase 7 | Polished | 401 handled; quickstart all green |

### Parallel Team Strategy (2 developers after Phase 2)

- Developer A (backend): T007 → T012 → T014 → T016
- Developer B (frontend): T008 + T009 → T010 → T011 → T013 → T015 → T017

---

## Notes

- Only `Task` has `table=True` in `backend/models.py` — `User` and `Session` are
  Better Auth's tables; do NOT define them with `table=True` (see data-model.md)
- The `_get_owned_task()` helper returns **404** for both missing AND cross-user tasks —
  this is intentional per FR-009 (no information leakage about task existence)
- `TaskCard.tsx` renders all action buttons from T008; toggle/edit/delete handlers are
  wired incrementally in T013/T015/T017 — pass no-ops until wired
- Commit at each phase checkpoint for clean rollback points
- See `specs/001-task-crud/quickstart.md` for end-to-end verification commands
