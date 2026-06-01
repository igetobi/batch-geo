# backend/tests/test_jobs.py
"""Tests for the publish-job state machine in app/jobs.py.

We call _run_publish directly (it is an async coroutine) and monkeypatch
publish_to_batchgeo to the three behaviours we care about.
"""
import pytest
from app.jobs import _run_publish
from app.publish.batchgeo import ManualFinishRequired, manual_finish_payload
from app.storage import Storage


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_storage(tmp_path):
    """Return a fresh Storage instance backed by a temp DB."""
    s = Storage(tmp_path / "jobs_test.db")
    return s


def _create_job(storage: Storage) -> tuple[str, str]:
    """Save a minimal map and create a job; return (job_id, map_id)."""
    map_id = storage.save_map(
        title="Test Map", slug="test-map", csv_text="csv", description="desc"
    )
    job_id = storage.create_job(state="publishing", map_id=map_id)
    return job_id, map_id


# ---------------------------------------------------------------------------
# (a) publish_to_batchgeo returns (map_url, embed_code) → state "done"
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_publish_success(tmp_path, monkeypatch):
    storage = _make_storage(tmp_path)
    job_id, map_id = _create_job(storage)

    async def _fake_publish(csv_text, request):
        return "https://batchgeo.com/map/abc123", "<iframe src='...'></iframe>"

    monkeypatch.setattr("app.jobs.publish_to_batchgeo", _fake_publish)

    # A minimal stand-in for MapRequest — only map_title/map_slug are read by
    # the function under test (via storage calls that accept the raw strings).
    class _FakeRequest:
        map_title = "Test Map"
        map_slug = "test-map"

    await _run_publish(job_id, map_id, "csv", _FakeRequest(), storage)

    job = storage.get_job(job_id)
    assert job["state"] == "done"
    assert job["message"] == "https://batchgeo.com/map/abc123"

    # Map record should be updated with the URL
    mp = storage.get_map(map_id)
    assert mp["map_url"] == "https://batchgeo.com/map/abc123"
    assert mp["embed_code"] is not None


# ---------------------------------------------------------------------------
# (b) publish_to_batchgeo raises ManualFinishRequired → "needs_manual_finish"
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_publish_manual_finish(tmp_path, monkeypatch):
    storage = _make_storage(tmp_path)
    job_id, map_id = _create_job(storage)

    async def _fake_publish(csv_text, request):
        raise ManualFinishRequired(
            manual_finish_payload(csv_text, "Test Map")
        )

    monkeypatch.setattr("app.jobs.publish_to_batchgeo", _fake_publish)

    class _FakeRequest:
        map_title = "Test Map"
        map_slug = "test-map"

    await _run_publish(job_id, map_id, "csv", _FakeRequest(), storage)

    job = storage.get_job(job_id)
    assert job["state"] == "needs_manual_finish"
    # payload is stored as a JSON string
    assert job["payload"] is not None
    import json
    payload = json.loads(job["payload"])
    assert "csv_text" in payload
    assert "instructions" in payload


# ---------------------------------------------------------------------------
# (c) publish_to_batchgeo raises a generic Exception → state "error",
#     generic (non-leaking) message
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_publish_generic_error(tmp_path, monkeypatch):
    storage = _make_storage(tmp_path)
    job_id, map_id = _create_job(storage)

    async def _fake_publish(csv_text, request):
        raise RuntimeError("Internal credential error: password=hunter2")

    monkeypatch.setattr("app.jobs.publish_to_batchgeo", _fake_publish)

    class _FakeRequest:
        map_title = "Test Map"
        map_slug = "test-map"

    await _run_publish(job_id, map_id, "csv", _FakeRequest(), storage)

    job = storage.get_job(job_id)
    assert job["state"] == "error"
    # The raw exception message must NOT leak into the stored message
    assert "hunter2" not in (job["message"] or "")
    assert job["message"] is not None
