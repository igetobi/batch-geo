# backend/tests/test_batchgeo.py
import pytest
from app.publish.batchgeo import ManualFinishRequired, build_embed_code, manual_finish_payload


def test_build_embed_code_wraps_map_url():
    code = build_embed_code("https://batchgeo.com/map/abc123")
    assert "batchgeo.com/map/abc123" in code
    assert code.strip().startswith("<")


def test_manual_finish_payload_includes_csv_and_steps():
    payload = manual_finish_payload(csv_text="Address,City\n1,2", map_title="My Map")
    assert payload["csv_text"] == "Address,City\n1,2"
    assert "instructions" in payload
    assert len(payload["instructions"]) >= 3  # step-by-step list


def test_manual_finish_required_is_raisable():
    with pytest.raises(ManualFinishRequired):
        raise ManualFinishRequired(manual_finish_payload("csv", "T"))
