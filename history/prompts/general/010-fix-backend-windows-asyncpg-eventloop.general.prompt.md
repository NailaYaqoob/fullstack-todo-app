---
id: "010"
title: Fix backend Windows asyncpg event loop
stage: general
date: 2026-03-25
surface: agent
model: claude-sonnet-4-6
feature: none
branch: 001-task-crud
user: Naila Imran
command: (debugging)
labels: ["bug","windows","asyncpg","uvicorn","python3.14","event-loop"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/run.py
  - backend/main.py
tests:
  - curl http://localhost:8000/health → {"status":"ok"}
---

## Prompt

backend shows error

## Response snapshot

Diagnosed backend startup hang. Root cause: Python 3.14 on Windows uses
`ProactorEventLoop` by default; asyncpg requires `WindowsSelectorEventLoopPolicy`.
Setting the policy inside `main.py` was too late because uvicorn creates its event
loop before importing the app module.

**Fix**: Created `backend/run.py` that sets the event loop policy before calling
`uvicorn.run()`. Updated `main.py` with a comment pointing to `run.py`.

Error seen (via programmatic uvicorn test):
```
asyncio.exceptions.CancelledError
  in asyncpg/protocol/protocol.pyx bind_execute
  via sqlalchemy/util/_concurrency_py3k.py greenlet_spawn
```

**New start command**: `python run.py` (instead of `uvicorn main:app --reload`)

## Outcome

- ✅ Impact: Backend starts and serves requests on Windows Python 3.14
- 🧪 Tests: `GET /health` → `{"status":"ok"}` confirmed by user
- 📁 Files: `backend/run.py` (new), `backend/main.py` (comment only)
- 🔁 Next prompts: Run quickstart validation end-to-end with both services
- 🧠 Reflection: WindowsSelectorEventLoopPolicy is deprecated in Python 3.16 — long-term fix is to migrate to a database driver that supports ProactorEventLoop natively, or pin Python ≤3.13

## Evaluation notes (flywheel)

On Windows with Python 3.8+, asyncpg requires SelectorEventLoop. The policy must be set
BEFORE uvicorn creates its event loop. A wrapper entry-point script (`run.py`) is the
correct pattern. Setting the policy inside the FastAPI app module does not help.
