"""Async publish job runner.

``start_publish_job`` kicks off a background task that calls
``publish_to_batchgeo``.  State is persisted in SQLite via ``Storage``.

Job lifecycle:
  publishing  →  done | needs_manual_finish | error
"""

from __future__ import annotations

import json
import logging

from fastapi import BackgroundTasks

from app.models import MapResult, MapRequest
from app.publish.batchgeo import ManualFinishRequired, publish_to_batchgeo
from app.storage import Storage

logger = logging.getLogger(__name__)


async def _run_publish(
    job_id: str,
    map_id: str,
    csv_text: str,
    request: MapRequest,
    storage: Storage,
) -> None:
    """Background coroutine that drives the BatchGeo publish flow."""
    try:
        map_url, embed_code = await publish_to_batchgeo(csv_text, request)
        # Update the map record with URL + embed code
        storage.update_map(map_id, map_url=map_url, embed_code=embed_code)
        storage.update_job(
            job_id,
            state="done",
            message=map_url,
        )
    except ManualFinishRequired as exc:
        storage.update_job(
            job_id,
            state="needs_manual_finish",
            message="Manual finish required — see payload.",
            payload=json.dumps(exc.payload),
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Publish job %s failed: %s", job_id, exc)
        storage.update_job(
            job_id,
            state="error",
            message="Publishing failed — please try again or use the manual-finish option.",
        )


def start_publish_job(
    map_result: MapResult,
    request: MapRequest,
    storage: Storage,
    background_tasks: BackgroundTasks,
) -> str:
    """Create a publish job record and enqueue the background task.

    Returns the job_id.
    """
    # Save the map first so the job can reference it
    map_id = storage.save_map(
        title=request.map_title,
        slug=request.map_slug,
        csv_text=map_result.csv_text,
        description=map_result.description,
    )
    job_id = storage.create_job(state="publishing", map_id=map_id)
    background_tasks.add_task(
        _run_publish, job_id, map_id, map_result.csv_text, request, storage
    )
    return job_id


def get_job(job_id: str, storage: Storage) -> dict | None:
    """Return the raw job row dict, or None if not found."""
    return storage.get_job(job_id)
