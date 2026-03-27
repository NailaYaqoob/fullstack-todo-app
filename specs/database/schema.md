# Database Schema

**Database**: Neon Serverless PostgreSQL
**ORM**: SQLModel 0.0.18+ with asyncpg
**Phase**: II (tasks table) — Phase III adds conversations table

## Tables

### users (managed by Better Auth)
Better Auth automatically creates and manages this table. Do not define it in SQLModel.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `varchar` | Primary Key |
| `email` | `varchar` | Unique, Not Null |
| `name` | `varchar` | Nullable |
| `email_verified` | `boolean` | Default `false` |
| `image` | `text` | Nullable |
| `created_at` | `timestamp` | Not Null |
| `updated_at` | `timestamp` | Not Null |

### session (managed by Better Auth)
Better Auth manages this table for session storage.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `varchar` | Primary Key |
| `user_id` | `varchar` | FK → `users.id` |
| `token` | `varchar` | Not Null |
| `expires_at` | `timestamp` | Not Null |
| `created_at` | `timestamp` | Not Null |
| `updated_at` | `timestamp` | Not Null |

### account (managed by Better Auth)
Stores OAuth/credential account links for each user.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `varchar` | Primary Key |
| `user_id` | `varchar` | FK → `users.id` |
| `provider_id` | `varchar` | Not Null |
| `account_id` | `varchar` | Not Null |
| `created_at` | `timestamp` | Not Null |
| `updated_at` | `timestamp` | Not Null |

---

### tasks (managed by SQLModel)
Core task data model. Defined in `backend/models.py`.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `integer` | Primary Key, Auto-increment |
| `user_id` | `varchar` | Not Null, FK → `users.id` |
| `title` | `varchar(200)` | Not Null |
| `description` | `text` | Nullable |
| `completed` | `boolean` | Default `false`, Not Null |
| `created_at` | `timestamp` | Default `now()`, Not Null |
| `updated_at` | `timestamp` | Default `now()`, Auto-updated |

**Indexes**:
- `idx_tasks_user_id` on `tasks(user_id)` — for filtering by user
- `idx_tasks_completed` on `tasks(completed)` — for status filtering

**SQLModel Definition**:
```python
class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, nullable=False)
    title: str = Field(max_length=200, nullable=False)
    description: Optional[str] = Field(default=None, nullable=True)
    completed: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

---

### conversations (Phase III — managed by SQLModel)
Stores chat message history for AI chatbot sessions.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `integer` | Primary Key, Auto-increment |
| `conversation_id` | `varchar` | Not Null, Indexed |
| `user_id` | `varchar` | Not Null, FK → `users.id` |
| `role` | `varchar` | Not Null — `"user"` or `"assistant"` |
| `content` | `text` | Not Null |
| `created_at` | `timestamp` | Default `now()`, Not Null |

**Indexes**:
- `idx_conversations_user_id` on `conversations(user_id)`
- `idx_conversations_conversation_id` on `conversations(conversation_id)`

## Schema Initialization
Tables are created via `SQLModel.metadata.create_all(engine)` in `backend/db.py` at app startup. Only `tasks` (and later `conversations`) are managed by SQLModel; Better Auth tables are created by the Better Auth library on the frontend/Next.js side.

## Connection
```
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>/<db>?sslmode=require
```
