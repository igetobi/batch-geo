import pytest
import respx
import httpx
from app.models import BoundingBox
from app.core.geo import geocode_city, fetch_landmarks

BBOX = BoundingBox(min_lat=42.59, max_lat=42.63, min_lon=-83.05, max_lon=-83.02)


@respx.mock
def test_geocode_city_returns_bbox():
    respx.get("https://nominatim.openstreetmap.org/search").mock(
        return_value=httpx.Response(200, json=[{
            "boundingbox": ["42.5901", "42.6301", "-83.0501", "-83.0201"]
        }])
    )
    bbox = geocode_city("Sterling Heights", "MI")
    assert bbox.min_lat == 42.5901
    assert bbox.max_lon == -83.0201


@respx.mock
def test_geocode_city_raises_on_no_result():
    respx.get("https://nominatim.openstreetmap.org/search").mock(
        return_value=httpx.Response(200, json=[])
    )
    with pytest.raises(ValueError):
        geocode_city("Nowheresville", "ZZ")


@respx.mock
def test_fetch_landmarks_parses_names():
    respx.post("https://overpass-api.de/api/interpreter").mock(
        return_value=httpx.Response(200, json={"elements": [
            {"tags": {"name": "Dodge Park"}},
            {"tags": {"name": "Lakeside Mall"}},
            {"tags": {}},  # unnamed -> skipped
        ]})
    )
    names = fetch_landmarks(BBOX, limit=8)
    assert "Dodge Park" in names and "Lakeside Mall" in names


@respx.mock
def test_fetch_landmarks_skips_unnamed():
    respx.post("https://overpass-api.de/api/interpreter").mock(
        return_value=httpx.Response(200, json={"elements": [
            {"tags": {}},
            {"tags": {"name": ""}},
        ]})
    )
    names = fetch_landmarks(BBOX, limit=8)
    assert names == []


@respx.mock
def test_fetch_landmarks_respects_limit():
    respx.post("https://overpass-api.de/api/interpreter").mock(
        return_value=httpx.Response(200, json={"elements": [
            {"tags": {"name": f"Place {i}"}} for i in range(20)
        ]})
    )
    names = fetch_landmarks(BBOX, limit=5)
    assert len(names) == 5
