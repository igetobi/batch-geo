from app.core.generator import generate_map
from app.models import MapRequest, ClientProfile, BoundingBox


def _req():
    return MapRequest(
        client=ClientProfile(business_name="My Quality Construction", phone="(586) 222-8111",
            email="info@mqcmi.com", website="https://mqcmi.com",
            city="Sterling Heights", state="MI"),
        services=["cabinet refacing", "custom kitchen cabinets", "cabinet installation"],
        landmarks=["Dodge Park", "Lakeside Mall"],
        geo_modifiers=["Sterling Heights", "Sterling Heights MI"],
        pin_count=50, map_title="Cabinet Map", map_slug="cabinetmap",
        bounding_box=BoundingBox(min_lat=42.59, max_lat=42.63,
                                 min_lon=-83.05, max_lon=-83.02),
        seed=1,
    )


def test_generates_50_pins(monkeypatch):
    monkeypatch.setattr("app.core.generator.generate_description", lambda r: "desc")
    result = generate_map(_req())
    assert len(result.pins) == 50


def test_csv_has_51_lines(monkeypatch):
    monkeypatch.setattr("app.core.generator.generate_description", lambda r: "desc")
    result = generate_map(_req())
    assert len(result.csv_text.strip().splitlines()) == 51


def test_no_url_until_published(monkeypatch):
    monkeypatch.setattr("app.core.generator.generate_description", lambda r: "desc")
    result = generate_map(_req())
    assert result.map_url is None
