"""
routes/auth.py
────────────────────────────────────────────────────────────────────────────────
Authentication endpoints:

  POST /auth/register  → create account, hash password, store user in DB
  POST /auth/login     → verify password, return JWT access + refresh tokens
  POST /auth/refresh   → exchange refresh token for new access token
  POST /auth/logout    → revoke refresh token
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta, timezone

from database import get_db
from models import UserCreate, UserOut, LoginRequest, Token, User, RefreshToken, TokenRefreshRequest, LogoutRequest
from core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_access_token, decode_refresh_token, REFRESH_TOKEN_EXPIRE_DAYS

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    hashed = hash_password(user_in.password)

    new_user = User(
        user_name=user_in.user_name,
        email=user_in.email,
        hashed_password=hashed,
    )
    db.add(new_user)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    return UserOut(
        user_id=str(new_user.user_id),
        user_name=new_user.user_name,
        email=new_user.email,
        created_at=new_user.created_at,
    )


@router.post("/login", response_model=Token)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise auth_error

    access_token = create_access_token(data={"sub": str(user.user_id)})
    refresh_token_str = create_refresh_token(data={"sub": str(user.user_id)})

    db.add(RefreshToken(
        token=refresh_token_str,
        user_id=user.user_id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        revoked=False,
    ))
    await db.commit()

    return Token(access_token=access_token, refresh_token=refresh_token_str, token_type="bearer")


@router.post("/refresh", response_model=Token)
async def refresh_token_route(input: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    from jose import JWTError
    try:
        payload = decode_refresh_token(input.refresh_token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid refresh token.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Expired or invalid refresh token.")

    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == input.refresh_token)
    )
    db_token = result.scalar_one_or_none()

    if not db_token or db_token.revoked or db_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Revoked, expired, or invalid refresh token.")

    # Rotate: revoke old token, issue new one keeping the original expiry
    original_expires_at = db_token.expires_at.replace(tzinfo=timezone.utc)

    new_access_token = create_access_token(data={"sub": user_id})
    new_refresh_token_str = create_refresh_token(
        data={"sub": user_id},
        expires_at=original_expires_at,
    )

    # Delete the old token and insert the new one atomically
    await db.delete(db_token)
    db.add(RefreshToken(
        token=new_refresh_token_str,
        user_id=db_token.user_id,
        expires_at=original_expires_at,
        revoked=False,
    ))
    await db.commit()

    return Token(access_token=new_access_token, refresh_token=new_refresh_token_str, token_type="bearer")


@router.post("/logout")
async def logout(input: LogoutRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == input.refresh_token)
    )
    db_token = result.scalar_one_or_none()

    if db_token:
        await db.delete(db_token)
        await db.commit()

    return {"detail": "Logged out successfully."}
