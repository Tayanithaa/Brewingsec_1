"""
jwt_handler.py — minimal JWT issuance/verification for demo purposes.
In a real PWNDORA integration, tokens would be issued by PWNDORA's own auth
service; this local issuer exists so the lab is independently demoable.
"""

import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import HTTPException, Header

SECRET_KEY = os.environ.get("JWT_SECRET", "dev-only-secret-change-in-docker-compose")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 480  # covers a full 8-hour demo/judging window


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(authorization: str | None = Header(default=None)) -> str:
    """FastAPI dependency — raises 401 on missing/invalid/expired token,
    otherwise returns the user_id embedded in the token."""
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")
    token = authorization.removeprefix("Bearer ")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")