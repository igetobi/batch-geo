"""SQLite storage layer.

Tables:
  clients   – client profiles (optional, for future use)
  maps      – saved map results
  jobs      – async publish job states

Each public method opens its own short-lived connection so the storage layer
is safe to call from concurrent web workers and background tasks.
"""

from __future__ import annotations

import sqlite3
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Generator


CREATE_CLIENTS = """
CREATE TABLE IF NOT EXISTS clients (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL,
    data  TEXT NOT NULL
)
"""

CREATE_MAPS = """
CREATE TABLE IF NOT EXISTS maps (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    slug        TEXT NOT NULL,
    csv_text    TEXT NOT NULL,
    description TEXT NOT NULL,
    map_url     TEXT,
    embed_code  TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
)
"""

CREATE_JOBS = """
CREATE TABLE IF NOT EXISTS jobs (
    id         TEXT PRIMARY KEY,
    state      TEXT NOT NULL,
    map_id     TEXT,
    message    TEXT,
    payload    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
"""


class Storage:
    """Thin sqlite3 wrapper.  Pass *db_path* as a ``str`` or ``pathlib.Path``."""

    def __init__(self, db_path: str | Path) -> None:
        self._path = str(db_path)
        self._init_schema()

    # ------------------------------------------------------------------
    # Connection helper
    # ------------------------------------------------------------------

    @contextmanager
    def _connect(self) -> Generator[sqlite3.Connection, None, None]:
        """Open a short-lived connection, commit on success, close always."""
        conn = sqlite3.connect(self._path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Schema
    # ------------------------------------------------------------------

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(CREATE_CLIENTS)
            conn.execute(CREATE_MAPS)
            conn.execute(CREATE_JOBS)

    # ------------------------------------------------------------------
    # Maps
    # ------------------------------------------------------------------

    def save_map(
        self,
        *,
        title: str,
        slug: str,
        csv_text: str,
        description: str,
        map_url: str | None = None,
        embed_code: str | None = None,
    ) -> str:
        map_id = str(uuid.uuid4())
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO maps (id, title, slug, csv_text, description, map_url, embed_code)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (map_id, title, slug, csv_text, description, map_url, embed_code),
            )
        return map_id

    def get_map(self, map_id: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM maps WHERE id = ?", (map_id,)
            ).fetchone()
        return dict(row) if row else None

    def update_map(self, map_id: str, **fields: Any) -> None:
        if not fields:
            return
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [map_id]
        with self._connect() as conn:
            conn.execute(
                f"UPDATE maps SET {set_clause} WHERE id = ?", values
            )

    def list_maps(self) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM maps ORDER BY created_at DESC"
            ).fetchall()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # Jobs
    # ------------------------------------------------------------------

    def create_job(self, *, state: str, map_id: str | None = None) -> str:
        job_id = str(uuid.uuid4())
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO jobs (id, state, map_id)
                VALUES (?, ?, ?)
                """,
                (job_id, state, map_id),
            )
        return job_id

    def update_job(
        self,
        job_id: str,
        *,
        state: str,
        message: str | None = None,
        payload: str | None = None,
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE jobs
                SET state = ?, message = ?, payload = ?,
                    updated_at = datetime('now')
                WHERE id = ?
                """,
                (state, message, payload, job_id),
            )

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM jobs WHERE id = ?", (job_id,)
            ).fetchone()
        return dict(row) if row else None

    # ------------------------------------------------------------------
    # Clients
    # ------------------------------------------------------------------

    def save_client(self, name: str, data: str) -> str:
        client_id = str(uuid.uuid4())
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO clients (id, name, data) VALUES (?, ?, ?)",
                (client_id, name, data),
            )
        return client_id

    # ------------------------------------------------------------------
    # Cleanup (no-op — connections are closed per-operation)
    # ------------------------------------------------------------------

    def close(self) -> None:
        pass
