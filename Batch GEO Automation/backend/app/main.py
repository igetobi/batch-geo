"""FastAPI application — routes for the BatchGeo Map Generator."""

from __future__ import annotations

import csv
import io
import json
import re
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request, status
from pydantic import BaseModel

from app.auth import issue_token, require_token, verify_login
from app.config import assert_production_secrets, settings
from app.core.generator import generate_map
from app.jobs import get_job, start_publish_job
from app.models import MapRequest, MapResult
from app.storage import Storage


@asynccontextmanager
async def _lifespan(app: FastAPI):  # noqa: ANN001
    assert_production_secrets()
    yield


app = FastAPI(title="BatchGeo Map Generator", lifespan=_lifespan)


# ---------------------------------------------------------------------------
# In-process rate limiter for /api/login
# ---------------------------------------------------------------------------
# Tracks per-IP failed attempt counts: {ip: [timestamp, ...]}
_LOGIN_FAILURES: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT_MAX_ATTEMPTS = 10
_RATE_LIMIT_WINDOW = 300  # 5 minutes in seconds


def _check_rate_limit(ip: str) -> None:
    """Raise HTTP 429 if the IP has exceeded the failed-login threshold."""
    now = time.monotonic()
    window_start = now - _RATE_LIMIT_WINDOW
    # Purge timestamps outside the window
    _LOGIN_FAILURES[ip] = [t for t in _LOGIN_FAILURES[ip] if t > window_start]
    if len(_LOGIN_FAILURES[ip]) >= _RATE_LIMIT_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again later.",
        )


def _record_login_failure(ip: str) -> None:
    _LOGIN_FAILURES[ip].append(time.monotonic())


def _clear_login_failures(ip: str) -> None:
    _LOGIN_FAILURES.pop(ip, None)

# ---------------------------------------------------------------------------
# Database singleton — app/data/maps.db by default, or settings.db_path
# (env DB_PATH) when set. Tests point DB_PATH at an isolated temp file so the
# suite never writes to the real database.
# ---------------------------------------------------------------------------

_DB_PATH = Path(settings.db_path) if settings.db_path else Path(__file__).parent / "data" / "maps.db"
_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
_storage = Storage(_DB_PATH)


def get_storage() -> Storage:
    return _storage


# ---------------------------------------------------------------------------
# Request / response helpers
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str


class PublishRequest(BaseModel):
    map_result: MapResult
    request: MapRequest


class PublishResponse(BaseModel):
    job_id: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/login", response_model=LoginResponse)
def login(body: LoginRequest, request: Request) -> LoginResponse:
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)
    if not verify_login(body.username, body.password):
        _record_login_failure(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    _clear_login_failures(client_ip)
    return LoginResponse(token=issue_token(body.username))


@app.post("/api/generate", response_model=MapResult)
def generate(
    request: MapRequest,
    _user: Annotated[str, Depends(require_token)],
) -> MapResult:
    result = generate_map(request)
    return result


@app.post("/api/publish", response_model=PublishResponse)
def publish(
    body: PublishRequest,
    background_tasks: BackgroundTasks,
    storage: Annotated[Storage, Depends(get_storage)],
    _user: Annotated[str, Depends(require_token)],
) -> PublishResponse:
    job_id = start_publish_job(
        body.map_result, body.request, storage, background_tasks
    )
    return PublishResponse(job_id=job_id)


@app.get("/api/jobs/{job_id}")
def job_status(
    job_id: str,
    storage: Annotated[Storage, Depends(get_storage)],
    _user: Annotated[str, Depends(require_token)],
) -> dict[str, Any]:
    row = get_job(job_id, storage)
    if row is None:
        raise HTTPException(status_code=404, detail="Job not found")
    # Inflate payload if present
    if row.get("payload"):
        row["payload"] = json.loads(row["payload"])
    return row


class FetchCitationsRequest(BaseModel):
    sheet_url: str


class FetchCitationsResponse(BaseModel):
    gmb_cid: str | None
    citations: list[str]


def _sheet_id_from_url(url: str) -> str:
    """Extract the spreadsheet ID from a Google Sheets URL."""
    m = re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", url)
    if not m:
        raise ValueError("Not a valid Google Sheets URL")
    return m.group(1)


def _extract_cid(value: str) -> str | None:
    """Return the numeric CID from a google.com/maps?cid=... URL, or None."""
    m = re.search(r"[?&]cid=(\d+)", value)
    return m.group(1) if m else None


@app.post("/api/fetch-citations", response_model=FetchCitationsResponse)
def fetch_citations(
    body: FetchCitationsRequest,
    _user: Annotated[str, Depends(require_token)],
) -> FetchCitationsResponse:
    """Fetch the first tab of a Google Sheet and extract citations + optional GMB CID."""
    try:
        sheet_id = _sheet_id_from_url(body.sheet_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    export_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"

    try:
        req = urllib.request.Request(
            export_url,
            headers={"User-Agent": "BatchGeoAutomation/1.0"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch sheet: {exc}",
        ) from exc

    # Parse single-column CSV — each row is one cell from column A
    rows: list[str] = []
    reader = csv.reader(io.StringIO(raw))
    for row in reader:
        rows.append(row[0].strip() if row else "")

    # Rows 0–3 (1-indexed: 1–4) are business info — skip them.
    # Row 4 (0-indexed) may be a Google Maps CID URL or empty.
    gmb_cid: str | None = None
    citations_start = 5  # default: citations start at row 6 (0-indexed 5)

    if len(rows) >= 5:
        possible_cid_row = rows[4]
        cid = _extract_cid(possible_cid_row)
        if cid:
            gmb_cid = cid
            citations_start = 5
        elif possible_cid_row == "" or possible_cid_row.lower().startswith("google map"):
            # Empty or label row — citations start at row 6
            citations_start = 5
        else:
            # Row 5 is already a citation URL
            citations_start = 4

    citations = [r for r in rows[citations_start:] if r.startswith("http")][:50]

    return FetchCitationsResponse(gmb_cid=gmb_cid, citations=citations)


@app.get("/api/maps")
def list_maps(
    storage: Annotated[Storage, Depends(get_storage)],
    _user: Annotated[str, Depends(require_token)],
) -> list[dict[str, Any]]:
    return storage.list_maps()
