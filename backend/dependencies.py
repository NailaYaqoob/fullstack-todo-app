from fastapi import Depends, HTTPException, status
from auth import verify_jwt


async def get_current_user(payload: dict = Depends(verify_jwt)) -> str:
    """Extract and return the authenticated user's ID (sub claim) from JWT payload."""
    user_id: str | None = payload.get("sub") or payload.get("userId") or payload.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identifier",
        )
    return user_id
