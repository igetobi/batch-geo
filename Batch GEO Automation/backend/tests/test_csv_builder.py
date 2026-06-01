import csv
import io
from app.core.csv_builder import build_csv
from app.models import GeneratedPin, ClientProfile

EXPECTED_HEADER = ["Address", "City", "State", "Zipcode", "Name", "Phone Number",
    "Group", "URL", "Email", "Image", "Social", "Latitude", "Longitude", "Video"]


def _client(iframe: str | None = None) -> ClientProfile:
    return ClientProfile(
        business_name="Test Biz",
        phone="(586) 555-1234",
        email="info@testbiz.com",
        website="https://testbiz.com",
        city="Sterling Heights",
        state="MI",
        iframe_embed_html=iframe,
    )


def _pin(title: str, lat: float, lon: float) -> GeneratedPin:
    return GeneratedPin(keyword_title=title, latitude=lat, longitude=lon)


def test_header_is_exact():
    text = build_csv([_pin("kw A Biz", 42.6, -83.0)], client=_client())
    rows = list(csv.reader(io.StringIO(text)))
    assert rows[0] == EXPECTED_HEADER


def test_address_column_is_latlon_string():
    text = build_csv([_pin("kw A Biz", 42.61742777, -83.02740218)], client=_client())
    rows = list(csv.reader(io.StringIO(text)))
    assert rows[1][0] == "42.61742777,-83.02740218"


def test_iframe_with_commas_survives_round_trip():
    iframe = '<iframe src="https://x.com/a" width="500px" height="400px"></iframe>'
    text = build_csv([_pin("kw", 42.6, -83.0)], client=_client(iframe=iframe))
    rows = list(csv.reader(io.StringIO(text)))
    assert rows[1][13] == iframe  # Video column intact after CSV escaping


def test_one_row_per_pin():
    pins = [_pin(f"kw{i} Biz", 42.6, -83.0) for i in range(50)]
    text = build_csv(pins, client=_client())
    rows = list(csv.reader(io.StringIO(text)))
    assert len(rows) == 51  # header + 50
