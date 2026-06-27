from pydantic import BaseModel, EmailStr
from typing import List
from datetime import datetime
from uuid import UUID


# ── Auth schemas ─────────────────────────────────────────────────────────────
#
# Why separate Input (UserCreate) and Output (UserOut)?
# • UserCreate contains the raw password — we NEVER send that back.
# • UserOut is what we return: safe fields only, no password.

class UserCreate(BaseModel):
    user_name: str
    email: EmailStr     # pydantic validates it's a valid email format
    password: str       # plain-text only during registration; hashed immediately


class UserOut(BaseModel):
    user_id: str        # UUID converted to string for JSON serialisation
    user_name: str
    email: str
    created_at: datetime

    # model_config tells Pydantic to read values from ORM objects (SQLAlchemy rows)
    # Without this, Pydantic only accepts plain dicts, not DB model instances.
    model_config = {"from_attributes": True}


# ── Login / Token schemas ─────────────────────────────────────────────────────
#
# LoginRequest: what the client sends to /auth/login
# Token:        what we send BACK — the JWT access token string

class LoginRequest(BaseModel):
    email: str
    password: str       # plain-text; we verify against the argon2 hash in DB


class Token(BaseModel):
    """
    The response body after a successful login.

    access_token — the actual JWT string, e.g. "eyJhbGci..."
    token_type   — always "bearer"; tells the client how to send it back:
                   Authorization: Bearer <access_token>
    """
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """
    The decoded contents of a JWT (the 'payload').
    We store user_id inside the token so we can identify the user
    on every protected request without hitting the database.
    """
    user_id: str | None = None


# ── Chat schemas ──────────────────────────────────────────────────────────────

class Request(BaseModel):
    question: str
    chat_id:UUID


class Response(BaseModel):
    answer: str
    sources: List[str]
class ChatCreate(BaseModel):
    chat_name: str
    folder_id: UUID

class ChatResponse(BaseModel):
    chat_id: UUID
    chat_name: str

# ── File upload schemas ───────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    filename: str
    chunks_stored: int
class FolderCreate(BaseModel):
    folder_name: str

class FolderResponse(BaseModel):
    folder_id: UUID
    folder_name: str
