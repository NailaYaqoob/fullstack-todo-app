---
description: Scaffold the full fullstack-todo-app monorepo — Next.js 16 frontend, FastAPI backend, Docker Compose, and .env.example files. Run ONCE at project start. After scaffolding, proceeds to database setup.
handoffs:
  - label: Setup Database
    agent: db-setup
    prompt: Set up the Neon PostgreSQL database connection and SQLModel schema
    send: true
  - label: Setup Auth
    agent: auth-setup
    prompt: Configure Better Auth with JWT plugin on frontend and FastAPI JWT middleware on backend
    send: false
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

### Step 1: Pre-flight Checks

Before doing anything, verify the environment is ready:

1. Check if `frontend/` already exists:
   ```bash
   ls frontend/ 2>/dev/null && echo "EXISTS" || echo "MISSING"
   ```
2. Check if `backend/` already exists:
   ```bash
   ls backend/ 2>/dev/null && echo "EXISTS" || echo "MISSING"
   ```

**If BOTH exist**: Stop. Inform the user the project is already scaffolded. Suggest running `/db-setup` or `/auth-setup` instead.

**If frontend/ exists but backend/ does not** (or vice versa): Ask the user whether to scaffold only the missing part or stop.

3. Check Node.js version (must be 18+):
   ```bash
   node --version
   ```
4. Check Python version (must be 3.11+):
   ```bash
   python --version 2>/dev/null || python3 --version
   ```

If either version check fails, STOP and report the version requirement to the user.

### Step 2: Launch project-bootstrap Agent

With pre-flight checks passed, launch the `project-bootstrap` agent with full context:

**Task for project-bootstrap agent**:
```
Scaffold the fullstack-todo-app monorepo. The project root is at E:/fullstack-todo-app.

Required structure:
- frontend/ — Next.js 16 App Router, TypeScript strict, Tailwind CSS
- backend/ — FastAPI, SQLModel, asyncpg, python-jose
- docker-compose.yml
- Root .gitignore

Constitution constraints (from .specify/memory/constitution.md):
- TypeScript strict mode (Principle VII)
- No hardcoded secrets — .env.example only (Principle V)
- frontend/lib/api.ts must be the only place API calls are made (Principle IV)

Complete all scaffolding steps, then provide:
1. List of all files created
2. Commands to verify both services start cleanly
3. Any issues encountered
```

### Step 3: Verify Scaffold

After the project-bootstrap agent completes, verify the scaffold is functional:

1. Verify backend starts:
   ```bash
   cd backend && uvicorn main:app --port 8000 &
   sleep 3
   curl -s http://localhost:8000/health
   kill %1
   ```
   Expected: `{"status":"ok"}`

2. Verify frontend builds without TypeScript errors:
   ```bash
   cd frontend && npm run build 2>&1 | tail -20
   ```
   Expected: Build completes with no errors.

If either verification fails, report the specific error and ask the user whether to continue.

### Step 4: Environment Setup Instructions

After successful scaffold, display setup instructions:

```
✅ Project scaffolded successfully!

NEXT STEPS (complete in order):

1. Configure Neon PostgreSQL:
   a. Create a project at https://console.neon.tech
   b. Copy the connection string
   c. Edit backend/.env (copy from backend/.env.example):
      DATABASE_URL=postgresql+asyncpg://...?sslmode=require

2. Configure Better Auth:
   a. Generate a secure secret (32+ chars)
   b. Edit backend/.env:
      BETTER_AUTH_SECRET=<your-secret>
   c. Edit frontend/.env.local (copy from frontend/.env.local.example):
      BETTER_AUTH_SECRET=<same-secret>
      NEXT_PUBLIC_API_URL=http://localhost:8000

3. Run /db-setup to initialize the database schema
4. Run /auth-setup to configure Better Auth and JWT middleware
```

### Step 5: Create PHR

**Stage**: general
**Title**: project-bootstrap-scaffold-complete
**Route**: `history/prompts/general/`

Read `.specify/templates/phr-template.prompt.md`, allocate the next available ID, write the completed PHR to `history/prompts/general/<ID>-project-bootstrap-scaffold-complete.general.prompt.md`.

Fill all placeholders:
- PROMPT_TEXT: the user's input (verbatim)
- RESPONSE_TEXT: summary of what was scaffolded, files created, verification results
- FILES_YAML: list all files created by the project-bootstrap agent
- OUTCOME fields: impact, next prompts (/db-setup, /auth-setup)

Report: ID, path, stage, title.
