"""
core/deps.py
─────────────────────────────────────────────────────────────────────────────
FastAPI dependency functions.

A "dependency" is a function FastAPI calls automatically and injects into
your route.  Example usage in a protected route:

    @router.get("/me")
    async def get_me(current_user: User = Depends(get_current_user)):
        return current_user

FastAPI will:
  1. Extract the token from the Authorization header.
  2. Call get_current_user(token).
  3. If it raises HTTPException → return 401 to client.
  4. If it succeeds → pass the User object into your route function.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError

from db import get_db
from models import User,Message
from core.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# OAuth2PasswordBearer tells FastAPI:
#   "tokens come from the Authorization: Bearer <token> header"
#   tokenUrl = the login endpoint clients use to get a token (used by Swagger UI)



async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Decode the JWT from the request header, look up the user in the DB.

    This is injected into any route that needs authentication.
    If the token is invalid or expired → 401 Unauthorized.
    If the user no longer exists in DB → 401 Unauthorized.
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode and verify the JWT signature + expiry
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")   # "sub" = subject = user_id we stored
        if user_id is None:
            raise credentials_error
    except JWTError:
        # Covers: expired token, bad signature, malformed token
        raise credentials_error

    # Optional DB lookup — confirms the user still exists
    # (protects against deleted accounts using old tokens)
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_error

    return user


async def get_chat_history(chat_id: str, db: AsyncSession) -> list:
    result = await db.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(Message.created_at)
    )
    return result.scalars().all()


