"""Team authentication helpers.

Single shared credential (username + password) stored in environment variables.
Issues HMAC-signed tokens so sessions survive a server restart as long as
APP_SECRET stays the same.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

_bearer = HTTPBearer(auto_error=False)

# Token TTL: 24 hours
_TOKEN_TTL = 86_400


# ---------------------------------------------------------------------------
# Token helpers
# ---------------------------------------------------------------------------

def _sign(payload: str) -> str:
    """Return HMAC-SHA256 hex digest of *payload* using APP_SECRET."""
    return hmac.new(
        settings.app_secret.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()


def issue_token(username: str) -> str:
    """Create a signed token for *username* valid for _TOKEN_TTL seconds."""
    exp = int(time.time()) + _TOKEN_TTL
    data = json.dumps({"sub": username, "exp": exp})
    import base64
    encoded = base64.urlsafe_b64encode(data.encode()).decode()
    sig = _sign(encoded)
    return f"{encoded}.{sig}"


def _decode_token(token: str) -> dict:
    """Validate and decode a token.  Raises ValueError on failure."""
    import base64
    parts = token.split(".")
    if len(parts) != 2:
        raise ValueError("Malformed token")
    encoded, sig = parts
    expected = _sign(encoded)
    if not hmac.compare_digest(expected, sig):
        raise ValueError("Invalid signature")
    data = json.loads(base64.urlsafe_b64decode(encoded + "==").decode())
    if data["exp"] < int(time.time()):
        raise ValueError("Token expired")
    return data


# ---------------------------------------------------------------------------
# Login verification
# ---------------------------------------------------------------------------

def verify_login(username: str, password: str) -> bool:
    """Return True iff the given credentials match the configured team account.

    Uses timing-safe comparisons via hmac.compare_digest to prevent
    timing-oracle attacks.
    """
    username_ok = hmac.compare_digest(username, settings.team_username)
    password_ok = hmac.compare_digest(password, settings.team_password)
    return username_ok and password_ok


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

def require_token(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(_bearer)
    ],
) -> str:
    """FastAPI dependency that validates the Bearer token.

    When settings.auth_enabled is False, returns "anonymous" immediately
    without checking for a token (open-access mode).

    When settings.auth_enabled is True, validates the Bearer token and
    returns the subject (username) on success, or raises HTTP 401.

    Note: settings.auth_enabled is read live on each call so that tests
    can toggle it via monkeypatch without restarting the app.
    """
    from app.config import settings as _settings  # live read — not captured at import time
    if not _settings.auth_enabled:
        return "anonymous"

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        data = _decode_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    return data["sub"]
