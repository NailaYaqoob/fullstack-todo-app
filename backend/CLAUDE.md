# Backend Guidelines — fullstack-todo-app

## Stack
- Python FastAPI
- SQLModel (ORM — combines SQLAlchemy + Pydantic)
- Neon Serverless PostgreSQL
- JWT verification middleware (verifies Better Auth tokens)

## Project Structure
```
backend/
├── main.py           — FastAPI app entry point, middleware registration
├── models.py         — SQLModel database models (User, Task)
├── db.py             — Neon PostgreSQL connection (DATABASE_URL env var)
├── auth.py           — JWT verification middleware / dependency
└── routes/
    ├── tasks.py      — Task CRUD endpoints
    └── health.py     — Health check endpoint
```

## Critical Rules
1. Every route (except health check) MUST use the JWT auth dependency
2. Every task query MUST filter by `user_id` from the verified JWT — never from URL alone
3. URL `user_id` MUST be validated against JWT-decoded `user_id` (match or 403)
4. No hardcoded secrets — `DATABASE_URL` and `BETTER_AUTH_SECRET` from env vars
5. All request/response bodies MUST use Pydantic/SQLModel models — no raw dicts

## JWT Auth Dependency Pattern
```python
# In auth.py — used as FastAPI dependency
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    # Verify JWT using BETTER_AUTH_SECRET
    # Decode and return user_id, email
    ...

# In route handlers:
@router.get("/api/{user_id}/tasks")
async def list_tasks(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    ...
```

## API Endpoints
| Method | Path                             | Description       |
|--------|----------------------------------|-------------------|
| GET    | /api/{user_id}/tasks             | List all tasks    |
| POST   | /api/{user_id}/tasks             | Create task       |
| GET    | /api/{user_id}/tasks/{id}        | Get task details  |
| PUT    | /api/{user_id}/tasks/{id}        | Update task       |
| DELETE | /api/{user_id}/tasks/{id}        | Delete task       |
| PATCH  | /api/{user_id}/tasks/{id}/complete | Toggle complete |

## Database Models
- `User`: managed by Better Auth; `id`, `email`, `name`, `created_at`
- `Task`: `id`, `user_id` (FK→users.id), `title`, `description`, `completed`, `created_at`, `updated_at`

## Env Vars (`.env`)
```
DATABASE_URL=postgresql+asyncpg://<neon-connection-string>
BETTER_AUTH_SECRET=<shared-secret>
```

## Running
```bash
uvicorn main:app --reload --port 8000   # development
uvicorn main:app --port 8000            # production
```
