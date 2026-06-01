from app.models import BoundingBox
from app.core.coordinates import jitter_coordinates

BBOX = BoundingBox(min_lat=42.59, max_lat=42.63, min_lon=-83.05, max_lon=-83.02)


def test_generates_exact_count():
    pts = jitter_coordinates(BBOX, count=50, seed=1)
    assert len(pts) == 50


def test_all_points_inside_bbox():
    for lat, lon in jitter_coordinates(BBOX, count=200, seed=1):
        assert 42.59 <= lat <= 42.63
        assert -83.05 <= lon <= -83.02


def test_deterministic_with_seed():
    assert jitter_coordinates(BBOX, 30, seed=7) == jitter_coordinates(BBOX, 30, seed=7)


def test_rounded_to_8_decimals():
    lat, lon = jitter_coordinates(BBOX, count=1, seed=1)[0]
    assert len(str(lat).split(".")[-1]) <= 8
