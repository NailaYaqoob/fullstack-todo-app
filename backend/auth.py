import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwk, jwt

BETTER_AUTH_URL = os.getenv("BETTER_AUTH_URL", "http://localhost:3000")
ALGORITHM = "ES256"

bearer_scheme = HTTPBearer(auto_error=True)

# ---------------------------------------------------------------------------
# JWKS cache — fetched once from the frontend, then reused
# ---------------------------------------------------------------------------
_jwks_cache: list[dict] | None = None


async def _get_jwks() -> list[dict]:
    """Fetch and cache the JWKS public keys from the Better Auth frontend."""
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache

    import httpx
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(f"{BETTER_AUTH_URL}/api/auth/jwks")
            res.raise_for_status()
            _jwks_cache = res.json().get("keys", [])
            return _jwks_cache
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Auth service unavailable: {exc}",
        )


# ---------------------------------------------------------------------------
# JWT verification dependency
# ---------------------------------------------------------------------------
async def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """FastAPI dependency: verify Bearer JWT (ES256) against the JWKS public key."""
    token = credentials.credentials
    keys = await _get_jwks()

    if not keys:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No signing keys available",
        )

    last_error: Exception = JWTError("No keys")
    for raw_key in keys:
        try:
            public_key = jwk.construct(raw_key, algorithm=ALGORITHM)
            payload = jwt.decode(
                token,
                public_key,
                algorithms=[ALGORITHM],
                options={"verify_aud": False},
            )
            return payload
        except JWTError as exc:
            last_error = exc
            continue

    # All keys failed — invalidate cache so next request re-fetches (key rotation)
    _jwks_cache = None
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
