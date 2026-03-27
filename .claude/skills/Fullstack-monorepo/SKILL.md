# SKILL: fullstack-monorepo

**Structure**: Next.js 16 + FastAPI in single repo | **Auth**: Better Auth + JWT
**Integrates with**: `nextjs-app-router`, `fastapi-rest`, `better-auth-jwt`, `sqlmodel-neon`

---

## Overview

A monorepo keeps both frontend and backend in one Git repository, giving Claude Code
agents a single context window to read both sides and make cross-cutting changes.
The key challenge is keeping environment variables, API contracts, and TypeScript
types in sync across the two services.

---

## Repository Layout

```
fullstack-todo-app/             ← Git root
├── .claude/
│   ├── agents/                 ← Sub-agent definitions
│   │   ├── orchestrator.md
│   │   ├── neon-db.md
│   │   ├── auth-jwt-flow.md
│   │   ├── backend-fastapi.md
│   │   ├── frontend-nextjs.md
│   │   └── project-bootstrap.md
│   ├── agent-memory/           ← Persistent agent knowledge
│   └── commands/               ← Slash command skills
│       ├── bootstrap.md        ← /bootstrap
│       ├── db-setup.md         ← /db-setup
│       ├── auth-setup.md       ← /auth-setup
│       └── dev.md              ← /dev
│
├── .specify/                   ← Spec-Kit Plus SDD framework
│   ├── memory/constitution.md  ← Project principles (7 non-negotiable rules)
│   └── templates/              ← spec, plan, tasks, PHR templates
│
├── specs/                      ← Feature specifications (SDD artifacts)
│   └── 001-task-crud/
│       ├── spec.md
│       ├── plan.md
│       ├── data-model.md
│       ├── tasks.md
│       └── checklists/
│
├── frontend/                   ← Next.js 16 App Router application
│   ├── app/
│   ├── components/
│   ├── lib/
│   │   ├── api.ts              ← ALL backend calls (enforced by constitution)
│   │   └── auth.ts             ← Better Auth server config
│   ├── types/index.ts
│   ├── middleware.ts
│   ├── next.config.ts
│   ├── tsconfig.json           ← "strict": true required
│   ├── .env.local              ← NOT committed (in .gitignore)
│   └── .env.local.example      ← Committed template
│
├── backend/                    ← Python FastAPI application
│   ├── main.py
│   ├── db.py
│   ├── models.py
│   ├── auth.py
│   ├── routes/
│   │   └── tasks.py
│   ├── requirements.txt
│   ├── .env                    ← NOT committed (in .gitignore)
│   └── .env.example            ← Committed template
│
├── skills/                     ← Reusable skill reference docs (this file)
├── history/                    ← PHRs and ADRs (SDD audit trail)
├── .gitignore                  ← Root-level (covers both services)
├── docker-compose.yml          ← Local dev: both services together
└── CLAUDE.md                   ← Root instructions for Claude Code
```

---

## Environment Variables

### Shared Secret Rule
`BETTER_AUTH_SECRET` **must be identical** in both services:

```bash
# backend/.env
DATABASE_URL=postgresql+asyncpg://...?sslmode=require
BETTER_AUTH_SECRET=<32+ char hex string>   ← SAME value in both
FRONTEND_URL=http://localhost:3000

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
BETTER_AUTH_SECRET=<same 32+ char hex string>   ← SAME value in both
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

### Generate a Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### `NEXT_PUBLIC_` Prefix
Variables with `NEXT_PUBLIC_` are **exposed to the browser**. Never put secrets with this prefix.

| Variable | Prefix | Why |
|----------|--------|-----|
| `NEXT_PUBLIC_API_URL` | Public | Browser needs to know backend URL |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Public | Better Auth client needs to know its own URL |
| `BETTER_AUTH_SECRET` | Private | Server-only — never expose to browser |
| `DATABASE_URL` | Private (backend only) | Never accessible to frontend |

---

## API Contract Synchronization

The FastAPI backend defines endpoints; the Next.js frontend must match exactly.

### Backend defines the contract:
```python
# backend/routes/tasks.py
router = APIRouter(prefix="/api/{user_id}/tasks")

@router.get("", response_model=list[TaskRead])     # GET /api/{user_id}/tasks
@router.post("", response_model=TaskRead)          # POST /api/{user_id}/tasks
@router.get("/{task_id}", response_model=TaskRead) # GET /api/{user_id}/tasks/{id}
@router.put("/{task_id}", response_model=TaskRead) # PUT /api/{user_id}/tasks/{id}
@router.delete("/{task_id}", status_code=204)      # DELETE /api/{user_id}/tasks/{id}
@router.patch("/{task_id}/complete", ...)          # PATCH /api/{user_id}/tasks/{id}/complete
```

### Frontend mirrors it in `lib/api.ts`:
```typescript
export const api = {
  getTasks:   (userId: string) => fetchWithAuth(`/api/${userId}/tasks`),
  createTask: (userId: string, data) => fetchWithAuth(`/api/${userId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  getTask:    (userId: string, id: string) => fetchWithAuth(`/api/${userId}/tasks/${id}`),
  updateTask: (userId: string, id: string, data) => fetchWithAuth(`/api/${userId}/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (userId: string, id: string) => fetchWithAuth(`/api/${userId}/tasks/${id}`, { method: 'DELETE' }),
  toggleTask: (userId: string, id: string) => fetchWithAuth(`/api/${userId}/tasks/${id}/complete`, { method: 'PATCH' }),
}
```

### TypeScript types mirror SQLModel schemas:
```
SQLModel TaskRead  ←→  TypeScript Task interface
{                       {
  id: UUID,               id: string,
  title: str,             title: string,
  description: str|null,  description?: string,
  completed: bool,        completed: boolean,
  user_id: str,           userId: string,       ← camelCase on frontend
  created_at: datetime,   createdAt: string,    ← ISO 8601 string
  updated_at: datetime,   updatedAt: string,
}                       }
```

> **Note**: FastAPI returns snake_case by default. Configure the frontend to match, or add `alias_generator=to_camel` on SQLModel.

---

## CORS Configuration

Backend must allow frontend origin:

```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,   # Required for cookies/auth
    allow_methods=["*"],
    allow_headers=["*"],
)
```

For production, set `FRONTEND_URL` to the deployed frontend URL.

---

## Docker Compose (Local Dev)

```yaml
# docker-compose.yml
version: "3.9"
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: ./backend/.env
    volumes:
      - ./backend:/app
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    env_file: ./frontend/.env.local
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    command: npm run dev
    depends_on:
      - backend
```

```bash
docker-compose up          # Start both services
docker-compose up backend  # Start only backend
docker-compose down        # Stop all
```

---

## Running Without Docker

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
cp .env.example .env        # Fill in DATABASE_URL and BETTER_AUTH_SECRET
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
cp .env.local.example .env.local  # Fill in secrets
npm run dev
```

---

## Root `.gitignore`

```gitignore
# Environment files — NEVER commit these
.env
.env.local
.env.*.local
*.env

# Node
node_modules/
.next/
dist/
build/

# Python
__pycache__/
*.pyc
.venv/
venv/
*.egg-info/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
```

---

## Agent Responsibility Matrix

| Layer | Agent | Owns |
|-------|-------|------|
| One-time setup | `project-bootstrap` | `frontend/`, `backend/` init, `docker-compose.yml` |
| Database schema | `neon-db` | `backend/db.py`, `backend/models.py` |
| Authentication | `auth-jwt-flow` | `backend/auth.py`, `frontend/lib/auth.ts`, `frontend/middleware.ts` |
| API endpoints | `backend-fastapi` | `backend/routes/*.py`, `backend/main.py` |
| UI & API client | `frontend-nextjs` | `frontend/app/**`, `frontend/components/**`, `frontend/lib/api.ts` |
| Coordination | `orchestrator` | Reads specs, delegates to above agents, verifies completeness |

---

## Development Workflow

```
1. /sp.specify <feature>   → Create feature spec in specs/<NNN>-<feature>/spec.md
2. /sp.plan                → Generate plan.md, data-model.md, contracts/
3. /sp.tasks               → Generate tasks.md with atomic steps
4. /sp.implement           → Execute tasks via specialist agents
5. /sp.git.commit_pr       → Commit and create PR
```

For initial project setup (before any feature work):
```
1. /bootstrap              → Scaffold Next.js + FastAPI + Docker
2. /db-setup               → Set up Neon DB + SQLModel schema
3. /auth-setup             → Configure Better Auth + JWT middleware
```

---

## Cross-Cutting Concerns

### User ID Consistency
The `user_id` is a string in both places:
- Backend: `Task.user_id: str` (FK to `user.id: str`)
- Frontend: `task.userId: string` in TypeScript
- URL: `/api/${userId}/tasks` — string path parameter

Better Auth uses string IDs (not integers).

### Timestamp Handling
Backend returns ISO 8601 timestamps. Frontend stores and displays as strings:
```python
# Backend
created_at: datetime  # Serializes to "2026-02-25T12:00:00.000Z"
```
```typescript
// Frontend
createdAt: string  // "2026-02-25T12:00:00.000Z"
new Date(task.createdAt).toLocaleDateString()  // Format for display
```

### Error Shape
Both services use consistent error shapes:
```json
// FastAPI error
{"detail": "Task not found"}

// Frontend handles:
const body = await res.json()
throw new Error(body.detail ?? 'Request failed')
```

---

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Different `BETTER_AUTH_SECRET` values | Silent JWT verification failures | Copy same value to both `.env` files |
| Frontend calls `localhost:8000` from Docker | Container can't reach host network | Use `http://backend:8000` (service name) in Docker |
| Committing `.env` files | Secret exposure | Verify `.gitignore` covers all `.env*` files |
| Frontend TypeScript uses `user_id` not `userId` | Type mismatch | Normalize at API boundary in `lib/api.ts` |
| CORS `allow_credentials: false` | Auth cookies blocked | Must be `True` when frontend sends credentials |
| API URL hardcoded in components | Breaks in prod | Always `process.env.NEXT_PUBLIC_API_URL` via `lib/api.ts` |
