# backend/tests/test_storage.py
from app.storage import Storage


def test_save_and_get_map(tmp_path):
    s = Storage(tmp_path / "t.db")
    map_id = s.save_map(title="T", slug="t", csv_text="csv", description="d")
    got = s.get_map(map_id)
    assert got["title"] == "T"


def test_job_lifecycle(tmp_path):
    s = Storage(tmp_path / "t.db")
    jid = s.create_job(state="publishing")
    s.update_job(jid, state="done", message="ok")
    assert s.get_job(jid)["state"] == "done"


# ---------------------------------------------------------------------------
# update_map
# ---------------------------------------------------------------------------

def test_update_map_sets_fields(tmp_path):
    s = Storage(tmp_path / "t.db")
    map_id = s.save_map(title="T", slug="t", csv_text="csv", description="d")
    # map_url and embed_code start as None
    assert s.get_map(map_id)["map_url"] is None

    s.update_map(map_id, map_url="https://batchgeo.com/map/xyz", embed_code="<iframe/>")
    updated = s.get_map(map_id)
    assert updated["map_url"] == "https://batchgeo.com/map/xyz"
    assert updated["embed_code"] == "<iframe/>"


def test_update_map_noop_when_no_fields(tmp_path):
    """update_map with no keyword args should not raise."""
    s = Storage(tmp_path / "t.db")
    map_id = s.save_map(title="T", slug="t", csv_text="csv", description="d")
    s.update_map(map_id)  # no-op — should not raise
    assert s.get_map(map_id)["title"] == "T"


# ---------------------------------------------------------------------------
# list_maps
# ---------------------------------------------------------------------------

def test_list_maps_empty(tmp_path):
    s = Storage(tmp_path / "t.db")
    assert s.list_maps() == []


def test_list_maps_returns_all(tmp_path):
    s = Storage(tmp_path / "t.db")
    s.save_map(title="First", slug="first", csv_text="c", description="d")
    s.save_map(title="Second", slug="second", csv_text="c", description="d")
    maps = s.list_maps()
    assert len(maps) == 2
    titles = {m["title"] for m in maps}
    assert titles == {"First", "Second"}
