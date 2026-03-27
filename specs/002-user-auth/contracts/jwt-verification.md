# Contract: JWT Verification (FastAPI)

**Feature**: `002-user-auth` | **Date**: 2026-02-25

This contract defines the FastAPI dependency pair used by **ALL** protected endpoints
(Principle II — JWT Auth Enforcement).

---

## verify_jwt() Dependency

**Location**: `backend/auth.py`
**Algorithm**: HS256 (HMAC-SHA256)
**Secret**: `BETTER_AUTH_SECRET` loaded from `os.getenv("BETTER_AUTH_SECRET")`
**Input**: `Authorization: Bearer <token>` HTTP header (HTTPBearer scheme)

### Decoded JWT payload returned:

```json
{
  "sub": "user-id-string",
  "email": "alice@example.com",
  "name": "Alice Smith",
  "iat": 1740000000,
  "exp": 1740604800
}
```

### Error responses:

| Condition | HTTP Status | Detail |
|-----------|-------------|--------|
| Missing `Authorization` header | 403 | HTTPBearer default (auto) |
| Invalid JWT signature | 401 | `"Invalid or expired token"` |
| Expired JWT (`exp` in past) | 401 | `"Invalid or expired token"` |
| Malformed / non-JWT string | 401 | `"Invalid or expired token"` |

### Implementation:

```python
# backend/auth.py
import os
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET = os.getenv("BETTER_AUTH_SECRET")
if not SECRET:
    raise RuntimeError("BETTER_AUTH_SECRET environment variable is not set")

ALGORITHM = "HS256"
_security = HTTPBearer()


async def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> dict:
    """Verifies the Bearer JWT. Returns decoded payload or raises 401."""
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET,
            algorithms=[ALGORITHM],
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
```

---

## get_current_user() Dependency

**Location**: `backend/dependencies.py`
**Wraps**: `verify_jwt()`
**Returns**: `str` — the authenticated user's ID (the `sub` claim)

### Implementation:

```python
# backend/dependencies.py
from fastapi import Depends
from .auth import verify_jwt


async def get_current_user(payload: dict = Depends(verify_jwt)) -> str:
    """Extracts and returns the authenticated user_id from the JWT sub claim."""
    return payload["sub"]
```

---

## Usage in Route Handlers

Every task route MUST use `get_current_user()` and enforce Principle III
(user isolation — URL `user_id` must match JWT `user_id`):

```python
# backend/routes/tasks.py  (future 001-task-crud feature)
from fastapi import APIRouter, Depends, HTTPException
from ..dependencies import get_current_user
from ..db import get_session

router = APIRouter()

@router.get("/api/{user_id}/tasks")
async def list_tasks(
    user_id: str,
    current_user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Principle III: URL user_id must match JWT user_id
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    # ... query filtered by user_id
```

---

## Startup Fail-Fast Check

Both `backend/auth.py` and `backend/main.py` must fail at startup (not at request time)
if `BETTER_AUTH_SECRET` is missing (Principle V):

```python
# backend/main.py (startup check)
import os
SECRET = os.getenv("BETTER_AUTH_SECRET")
DATABASE_URL = os.getenv("DATABASE_URL")
if not SECRET:
    raise RuntimeError("BETTER_AUTH_SECRET is not set — check backend/.env")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set — check backend/.env")
```

---

## CORS Configuration (main.py)

FastAPI must allow requests from the Next.js frontend origin:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # dev; set via env var in prod
    allow_credentials=False,                  # No cookies; JWT in Authorization header
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)
```

Note: `allow_credentials=False` is correct because we use `Authorization: Bearer` header,
not cookies, for FastAPI calls.
