---
id: "0003"
title: "DB Setup — Neon Schema Initialized"
stage: green
date: 2026-02-25
surface: agent
model: claude-sonnet-4-6
feature: 001-task-crud
branch: 001-task-crud
user: lenovo
command: /db-setup
labels: ["db-setup","neon","sqlmodel","asyncpg","schema-init"]
links:
  spec: specs/001-task-crud/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - backend/db.py (created)
  - backend/models.py (created)
  - backend/main.py (modified — lifespan wired)
  - backend/.env (modified — URL scheme fixed)
tests:
  - python -c "asyncio.run(create_db_and_tables())" → Schema initialized OK
---

## Prompt

/db-setup (continued from previous context) — set up Neon PostgreSQL database layer:
create backend/db.py and backend/models.py, fix DATABASE_URL scheme, wire
create_db_and_tables() into main.py lifespan, verify schema init against live Neon DB.

## Response snapshot

1. Fixed `backend/.env` — URL scheme: `postgresql://` → `postgresql+asyncpg://`; removed
   `&channel_binding=require` (not supported by asyncpg); then removed `?sslmode=require`
   from URL (asyncpg rejects it as a kwarg) and moved SSL to `connect_args={"ssl": True}`.
2. Created `backend/db.py` — async engine, AsyncSessionLocal, get_session() dependency,
   create_db_and_tables() startup function.
3. Created `backend/models.py` — TaskBase, Task (table=True), TaskCreate, TaskRead,
   TaskUpdate with field_validator for whitespace rejection.
4. Updated `backend/main.py` lifespan to call `await create_db_and_tables()`.
5. Verified: `python -c "asyncio.run(create_db_and_tables())"` → **Schema initialized OK**

## Outcome

- ✅ Impact: `task` table created in Neon PostgreSQL; backend DB layer fully operational
- 🧪 Tests: Schema init script ran successfully against live Neon DB
- 📁 Files: 2 created (db.py, models.py), 2 modified (main.py, .env)
- 🔁 Next prompts: /auth-setup → configure Better Auth + JWT middleware
- 🧠 Reflection: asyncpg requires SSL via connect_args={"ssl": True}, not URL query param

## Evaluation notes (flywheel)

- Failure modes observed: (1) `channel_binding=require` rejected by asyncpg — removed;
  (2) `sslmode=require` in URL rejected as unexpected kwarg — moved to connect_args
- Graders run and results (PASS/FAIL): schema-init script PASS
- Prompt variant (if applicable): null
- Next experiment: test FastAPI startup with uvicorn to confirm lifespan creates tables
