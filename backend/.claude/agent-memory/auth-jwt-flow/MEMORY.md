# Auth JWT Flow — Backend Agent Memory

## python-jose usage
- Package: `python-jose[cryptography]>=3.3.0` (already in requirements.txt)
- Import: `from jose import JWTError, jwt`
- Decode: `jwt.decode(token, BETTER_AUTH_SECRET, algorithms=["HS256"])`
- All JWTError subclasses caught with `except JWTError` — covers expired, invalid sig, malformed

## FastAPI dependency pattern
- `HTTPBearer(auto_error=True)` — auto-returns 403 if Authorization header missing
- `verify_jwt` dependency in `auth.py` returns decoded payload dict
- `get_current_user` in `dependencies.py` extracts user ID from payload

## JWT payload user ID extraction
- Better Auth JWT plugin sets `sub` claim to user ID
- Fallback check order: `sub` -> `userId` -> `id`

## Security rules enforced
- `BETTER_AUTH_SECRET` from `os.getenv` only — never hardcoded
- 500 returned if secret is not configured (fail-safe)
- 401 + `WWW-Authenticate: Bearer` header on invalid/expired token
- 403 for user_id mismatch (enforced in route handlers, not in auth.py)

## CORS note
- `allow_credentials=False` in main.py — if cookie-based auth needed later, set to True
  and restrict `allow_origins` to explicit list (no wildcard with credentials)

## Env vars required
- `BETTER_AUTH_SECRET` — must match frontend exactly
- `DATABASE_URL` — postgresql+asyncpg:// format for SQLModel/asyncpg
