"""
core/auth_deps.py
────────────────────────────────────────────────────────────────────────────────
FastAPI authentication dependency.

Usage in any protected route:

    @router.get("/me")
    async def get_me(current_user: User = Depends(get_current_user)):
        return current_user

FastAPI will:
  1. Extract the Bearer token from the Authorization header.
  2. Call get_current_user(token, db).
  3. If it raises HTTPException → return 401 to the client.
  4. If it succeeds → inject the User object into the route function.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError

from database import get_db
from models import User
from core.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Decode the JWT and return the authenticated User.

    Raises HTTP 401 if:
      - The token is missing, malformed, or expired.
      - The user no longer exists in the database.
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_error
    except JWTError:
        raise credentials_error

    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_error

    return user
