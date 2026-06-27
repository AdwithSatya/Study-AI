"""
core/security.py
─────────────────────────────────────────────────────────────────────────────
Two responsibilities live here:

1. PASSWORD HASHING  (argon2)
   ┌──────────────────────────────────────────────────────────────────────┐
   │  Why argon2?                                                         │
   │  • Designed in 2015 specifically to resist GPU / ASIC brute-force.  │
   │  • Winner of the Password Hashing Competition (PHC).                │
   │  • Configurable memory cost → attacker needs lots of RAM per guess. │
   │  • Preferred over bcrypt/scrypt for new projects.                   │
   └──────────────────────────────────────────────────────────────────────┘
   PasswordHasher()  creates an instance with sensible defaults:
     - time_cost  = 3  (number of iterations)
     - memory_cost= 65536 KB = 64 MB per hash attempt
     - parallelism= 4  (parallel lanes)

2. JWT TOKENS  (python-jose)
   ┌──────────────────────────────────────────────────────────────────────┐
   │  What is a JWT?                                                      │
   │  JSON Web Token — a signed string the server gives the client after │
   │  login.  Every future request sends this token in the Authorization │
   │  header.  The server verifies the SIGNATURE (not a DB lookup) to    │
   │  know who the user is.  Structure:                                   │
   │                                                                      │
   │   Header.Payload.Signature                                           │
   │   { alg, typ } . { sub, exp, … } . HMAC-SHA256(header+payload, key) │
   └──────────────────────────────────────────────────────────────────────┘
"""

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import os

load_dotenv()

# ── Argon2 hasher instance (shared, stateless — safe to reuse) ───────────────
ph = PasswordHasher(
    time_cost=3,        # how many iterations to run  (higher = slower = safer)
    memory_cost=65536,  # 64 MB of RAM required per hash attempt
    parallelism=4,      # number of parallel threads used
)

# ── JWT configuration (read from .env) ───────────────────────────────────────
SECRET_KEY  = os.getenv("SECRET_KEY")
ALGORITHM   = os.getenv("JWT_ALGORITHM")
EXPIRE_MINS = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))


# ─────────────────────────────────────────────────────────────────────────────
# PASSWORD HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """
    Turn a plain-text password into an argon2 hash string.

    Example output:
      $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>

    The entire string (including algorithm params + salt) is stored in the DB.
    You never store or use the salt separately — it's embedded.
    """
    return ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """
    Check if a plain-text password matches the stored argon2 hash.

    - Returns True  → passwords match, let the user in.
    - Returns False → wrong password, reject.

    argon2 also handles 'rehashing' — if the hash was created with older/weaker
    params it can signal that you should store a new stronger hash.
    """
    try:
        return ph.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


# ─────────────────────────────────────────────────────────────────────────────
# JWT HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Create a signed JWT token.

    `data`  — dict of claims to embed, e.g. {"sub": "user_id_here"}
    `sub`   — "subject" — standard JWT claim that identifies who this token belongs to.

    The token is signed with SECRET_KEY using HS256 (HMAC + SHA-256).
    Anyone with SECRET_KEY can verify it — keep that key secret!

    Flow:
      1. Copy the payload dict.
      2. Add an expiry timestamp (`exp`) so tokens auto-expire.
      3. Sign and encode → returns a compact string like "eyJ..."
    """
    payload = data.copy()
    expire  = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=EXPIRE_MINS))
    payload.update({"exp": expire})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and VERIFY a JWT token.

    Raises jose.JWTError if:
      - The signature doesn't match (tampered token).
      - The token has expired (`exp` is in the past).
      - The token is malformed.

    On success returns the payload dict, e.g. {"sub": "uuid", "exp": ...}
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
