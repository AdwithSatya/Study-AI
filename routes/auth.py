"""
routes/auth.py
─────────────────────────────────────────────────────────────────────────────
Two endpoints:

  POST /auth/register  →  create account, hash password, store in DB
  POST /auth/login     →  verify password, return JWT token

HOW THE FULL FLOW WORKS:
────────────────────────
  1. Client sends { user_name, email, password } to /register.
  2. We hash the password with argon2 and INSERT the user row.
  3. Client sends { email, password } to /login.
  4. We fetch the user from DB, verify the argon2 hash.
  5. We create a JWT token embedding the user_id.
  6. Client stores the token and sends it with every future request:
       Authorization: Bearer <token>
  7. Protected routes call get_current_user() which decodes the token.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from db import get_db
from models import UserCreate, UserOut, LoginRequest, Token, User
from core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


# ─────────────────────────────────────────────────────────────────────────────
# REGISTER
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserOut, status_code=201)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Hash first — argon2 is intentionally slow, do it before touching the DB
    hashed = hash_password(user_in.password)

    new_user = User(
        user_name       = user_in.user_name,
        email           = user_in.email,
        hashed_password = hashed,
        # user_id    → auto-generated UUID (default=uuid.uuid4 in model)
        # created_at → datetime.now(timezone.utc) set in Python before INSERT
    )

    db.add(new_user)
    try:
        await db.commit()
    except IntegrityError:
        # The email column has unique=True — Postgres raises a unique-violation
        # if someone tries to register with an already-existing email.
        # We catch that here instead of doing a wasteful SELECT before INSERT.
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # user_id    → uuid.uuid4() ran in Python before INSERT — already set
    # created_at → datetime.now(timezone.utc) ran in Python before INSERT — already set
    # No db.refresh() needed — we have everything without another SELECT
    return UserOut(
        user_id    = str(new_user.user_id),
        user_name  = new_user.user_name,
        email      = new_user.email,
        created_at = new_user.created_at,
    )


# ─────────────────────────────────────────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate a user and return a JWT access token.

    Steps:
      1. Look up the user by email.
      2. Verify the plain-text password against the stored argon2 hash.
      3. Create a JWT embedding the user's ID as the subject claim.
      4. Return { access_token, token_type }.

    SECURITY NOTE: we give the SAME generic error for "user not found"
    and "wrong password" — this prevents email enumeration attacks
    (attacker can't tell which one failed).
    """

    # Generic error reused for both "not found" and "wrong password"
    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # await resolves the coroutine → gives a Result object
    # .scalar_one_or_none() is then called on the Result, not the coroutine
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user:
        raise auth_error   # don't reveal "email not found"

    # ── Step 2: verify password ───────────────────────────────────────────────
    # verify_password() calls argon2's ph.verify(stored_hash, plain_text).
    # Argon2 re-derives the hash from the embedded salt and compares.
    # Returns False if wrong, raises exceptions for invalid hash format.
    if not verify_password(credentials.password, user.hashed_password):
        raise auth_error   # don't reveal "password wrong"

    # ── Step 3: create JWT ────────────────────────────────────────────────────
    # "sub" (subject) is the standard JWT claim for WHO this token belongs to.
    # We use user_id (not email) so the token stays valid if email changes.
    token = create_access_token(data={"sub": str(user.user_id)})

    # ── Step 4: return token ──────────────────────────────────────────────────
    return Token(access_token=token, token_type="bearer")
