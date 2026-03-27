---
description: Set up the Neon Serverless PostgreSQL database connection and initialize the SQLModel schema. Invokes the neon-db agent to create backend/db.py, backend/models.py, and run table creation. Can also be used to reset/refresh the schema after model changes.
handoffs:
  - label: Setup Auth
    agent: auth-setup
    prompt: Configure Better Auth with JWT plugin on frontend and FastAPI JWT middleware on backend
    send: true
  - label: Test API
    agent: test-api
    prompt: Test all API endpoints to verify the setup is working
    send: false
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

If the user passes `reset` as an argument, treat this as a schema reset operation (drop and recreate tables). Warn the user before proceeding.

## Outline

### Step 1: Pre-flight Checks

1. Verify `backend/` directory exists:
   ```bash
   ls backend/ 2>/dev/null && echo "EXISTS" || echo "MISSING"
   ```
   If MISSING: Stop and tell the user to run `/bootstrap` first.

2. Verify `DATABASE_URL` is set in `backend/.env`:
   ```bash
   grep -l "DATABASE_URL" backend/.env 2>/dev/null && echo "SET" || echo "MISSING"
   ```
   If MISSING: Stop and display:
   ```
   ⚠️  DATABASE_URL is not set.

   Steps to fix:
   1. Go to https://console.neon.tech and create a project
   2. Copy the connection string (PostgreSQL format)
   3. Create backend/.env from backend/.env.example:
      cp backend/.env.example backend/.env
   4. Edit backend/.env and set:
      DATABASE_URL=postgresql+asyncpg://<user>:<password>@<endpoint>.neon.tech/<dbname>?sslmode=require
   5. Re-run /db-setup
   ```

3. Check if `reset` was passed as argument. If yes, warn:
   ```
   ⚠️  RESET mode: This will drop all tables and recreate them.
   All existing data will be PERMANENTLY LOST.
   Type "confirm" to proceed or anything else to cancel.
   ```
   Wait for user confirmation before continuing.

### Step 2: Read Current State

Read the following files if they exist (to understand what's already there):
- `backend/db.py`
- `backend/models.py`
- `specs/001-task-crud/spec.md` — Key Entities section for field requirements
- `.specify/memory/constitution.md` — Principles V (env vars) and VII (type safety)

### Step 3: Launch neon-db Agent

Launch the `neon-db` agent with the following task:

```
Task: Set up Neon PostgreSQL database layer for the fullstack-todo-app.

Context:
- Project root: E:/fullstack-todo-app
- Backend directory: E:/fullstack-todo-app/backend/
- DATABASE_URL is already in backend/.env (do not overwrite it)
- Read specs/001-task-crud/spec.md Key Entities section for field requirements

Required outputs:
1. backend/db.py — async engine with asyncpg, AsyncSession factory, get_session() dependency,
   create_db_and_tables() startup function, fail-fast if DATABASE_URL missing
2. backend/models.py — SQLModel table models:
   - User (table=True, __tablename__="user", fields: id:str, email:str, name:str, created_at)
   - Task (table=True, fields: id:uuid, user_id:str FK→user.id, title:str 1-200,
     description:str optional max-1000, completed:bool default False, created_at, updated_at)
   - TaskCreate (no table=True, inherits TaskBase)
   - TaskRead (no table=True, all fields including id, user_id, timestamps)
   - TaskUpdate (no table=True, all fields Optional)
3. Register create_db_and_tables() in backend/main.py lifespan startup event

Mode: $ARGUMENTS (if "reset": drop all tables first using SQLModel.metadata.drop_all then recreate)

Verify the schema initializes by running:
  python -c "import asyncio; from db import create_db_and_tables; asyncio.run(create_db_and_tables())"
from the backend/ directory.

Report: files created/modified, schema initialization result, any errors.
```

### Step 4: Verify Database Connection

After the neon-db agent completes, verify the schema was created:

```bash
cd backend && python -c "
import asyncio
from db import create_db_and_tables
asyncio.run(create_db_and_tables())
print('✅ Database schema initialized successfully')
" 2>&1
```

**If successful**: Display confirmation and list tables created.
**If fails**: Display the full error. Common issues:
  - `SSL connection required` → Check `?sslmode=require` in DATABASE_URL
  - `asyncpg not installed` → Run `pip install asyncpg`
  - `could not connect` → Verify DATABASE_URL connection string and Neon project is active

### Step 5: Update main.py

Verify `backend/main.py` has the lifespan startup event registered. If not, add it:

```python
from contextlib import asynccontextmanager
from db import create_db_and_tables

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)
```

### Step 6: Create PHR

**Stage**: general
**Title**: neon-db-schema-initialized
**Route**: `history/prompts/general/`

Read `.specify/templates/phr-template.prompt.md`, allocate next available ID, write to `history/prompts/general/<ID>-neon-db-schema-initialized.general.prompt.md`.

Fill all placeholders:
- PROMPT_TEXT: verbatim user input
- RESPONSE_TEXT: files created/modified, verification result, schema tables initialized
- FILES_YAML: backend/db.py, backend/models.py, backend/main.py (if updated)
- OUTCOME: impact (DB layer ready), next prompts (/auth-setup, /sp.implement)

Report: ID, path, stage, title.
