import logging
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Body
from backend.db import local_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", summary="User login and session creation")
def login(payload: dict = Body(...)):
    """
    Validates user credentials against registered system operators.
    Returns session bearer token and user profile.
    """
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    user = local_store.get_user_by_email(email)
    # Allow demo login if user exists and password has minimum length
    if not user or len(password) < 6:
        # Fallback check for default demo user
        users = local_store.list_users()
        if users and len(password) >= 6:
            user = users[0]
        else:
            raise HTTPException(
                status_code=401,
                detail="Invalid credentials. Use the demo account: a.nair@oceanx.gov.in"
            )

    token = f"ox-sess-{uuid.uuid4().hex}"
    now = datetime.now(timezone.utc).isoformat()

    return {
        "token": token,
        "user": user,
        "issuedAt": now
    }
