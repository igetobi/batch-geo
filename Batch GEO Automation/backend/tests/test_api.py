# backend/tests/test_api.py
import json

import pytest
from fastapi.testclient import TestClient
from app.main import app
import app.config as _config
from conftest import _sample_request_json

client = TestClient(app)


# ---------------------------------------------------------------------------
# Fixture: run a block of tests with auth ENABLED
# ---------------------------------------------------------------------------

@pytest.fixture()
def auth_enabled(monkeypatch):
    """Enable auth for the duration of the test."""
    monkeypatch.setattr(_config.settings, "auth_enabled", True)
    yield


# ---------------------------------------------------------------------------
# Helper: obtain a valid token (requires auth to be on)
# ---------------------------------------------------------------------------

def _token():
    r = client.post("/api/login", json={"username": "team", "password": "change-me"})
    assert r.status_code == 200
    return r.json()["token"]


# ---------------------------------------------------------------------------
# Login / auth-gating tests  (these explicitly run with auth ON)
# ---------------------------------------------------------------------------

def test_login_rejects_bad_password(auth_enabled):
    r = client.post("/api/login", json={"username": "team", "password": "wrong"})
    assert r.status_code == 401


def test_generate_requires_auth(auth_enabled):
    r = client.post("/api/generate", json={})
    assert r.status_code == 401


def test_publish_requires_auth(auth_enabled):
    r = client.post("/api/publish", json={})
    assert r.status_code == 401


def test_get_job_requires_auth(auth_enabled):
    r = client.get("/api/jobs/nonexistent")
    assert r.status_code == 401


def test_list_maps_requires_auth(auth_enabled):
    r = client.get("/api/maps")
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# Open-access tests  (default: auth OFF)
# ---------------------------------------------------------------------------

def test_generate_open_access_no_token(monkeypatch):
    """With auth_enabled=False, POST /api/generate succeeds without any token."""
    monkeypatch.setattr("app.core.generator.generate_description", lambda r: "desc")
    r = client.post(
        "/api/generate",
        json=_sample_request_json(),
        # No Authorization header
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["pins"]) == 50
    assert body["csv_text"].count("\n") >= 50


def test_generate_returns_csv_and_pins(monkeypatch):
    monkeypatch.setattr("app.core.generator.generate_description", lambda r: "desc")
    r = client.post(
        "/api/generate",
        json=_sample_request_json(),
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["pins"]) == 50
    assert body["csv_text"].count("\n") >= 50


# ---------------------------------------------------------------------------
# POST /api/publish
# ---------------------------------------------------------------------------

def _sample_map_result():
    """Minimal MapResult payload for publish tests."""
    return {
        "pins": [
            {"keyword_title": "cabinet refacing Sterling Heights",
             "latitude": 42.61, "longitude": -83.04}
        ],
        "csv_text": "Name,Latitude,Longitude\ncabinet refacing Sterling Heights,42.61,-83.04",
        "description": "Test description",
        "map_url": None,
        "embed_code": None,
    }


def test_publish_returns_job_id(monkeypatch):
    """POST /api/publish should enqueue a job and return a job_id."""
    # Prevent the background task from actually running the Playwright flow
    async def _noop_publish(csv_text, request):
        return "https://batchgeo.com/map/fake", "<iframe/>"

    monkeypatch.setattr("app.jobs.publish_to_batchgeo", _noop_publish)

    body = {
        "map_result": _sample_map_result(),
        "request": _sample_request_json(),
    }
    r = client.post(
        "/api/publish",
        json=body,
    )
    assert r.status_code == 200
    data = r.json()
    assert "job_id" in data
    assert data["job_id"]  # non-empty string


# ---------------------------------------------------------------------------
# GET /api/jobs/{id}
# ---------------------------------------------------------------------------

def test_get_job_404_for_unknown_id():
    r = client.get("/api/jobs/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


def test_get_job_returns_job(monkeypatch):
    """After publishing, GET /api/jobs/{id} returns the job row."""
    async def _noop_publish(csv_text, request):
        return "https://batchgeo.com/map/fake", "<iframe/>"

    monkeypatch.setattr("app.jobs.publish_to_batchgeo", _noop_publish)

    pub_body = {
        "map_result": _sample_map_result(),
        "request": _sample_request_json(),
    }
    pub_r = client.post(
        "/api/publish",
        json=pub_body,
    )
    assert pub_r.status_code == 200
    job_id = pub_r.json()["job_id"]

    job_r = client.get(f"/api/jobs/{job_id}")
    assert job_r.status_code == 200
    job_data = job_r.json()
    assert job_data["id"] == job_id
    assert "state" in job_data


# ---------------------------------------------------------------------------
# GET /api/maps
# ---------------------------------------------------------------------------

def test_list_maps_returns_list():
    """GET /api/maps returns a list (may be empty or populated)."""
    r = client.get("/api/maps")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
