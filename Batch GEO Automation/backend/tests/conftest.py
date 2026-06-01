# conftest.py — shared fixtures for backend tests
#
# Isolate the test database from the real app/data/maps.db. This MUST run
# before any `app.*` module is imported, so app.config picks up DB_PATH when
# its Settings() is first instantiated. pytest loads conftest.py before any
# test module, so setting the env var here is early enough.
import os
import tempfile
from pathlib import Path

_TEST_DB = Path(tempfile.gettempdir()) / "bgmap-test" / "test_maps.db"
_TEST_DB.parent.mkdir(parents=True, exist_ok=True)
if _TEST_DB.exists():
    _TEST_DB.unlink()
os.environ["DB_PATH"] = str(_TEST_DB)


def _sample_request_json():
    """Return a minimal valid MapRequest JSON dict for use in API tests.

    Uses an explicit bounding_box so no live network call is made.
    """
    return {
        "client": {
            "business_name": "My Quality Construction",
            "phone": "(586) 222-8111",
            "email": "info@mqcmi.com",
            "website": "https://mqcmi.com",
            "city": "Sterling Heights",
            "state": "MI",
        },
        "services": ["cabinet refacing", "custom kitchen cabinets", "cabinet installation"],
        "landmarks": ["Dodge Park", "Lakeside Mall"],
        "geo_modifiers": ["Sterling Heights", "Sterling Heights MI"],
        "pin_count": 50,
        "map_title": "Cabinet Map",
        "map_slug": "cabinetmap",
        "bounding_box": {
            "min_lat": 42.59,
            "max_lat": 42.63,
            "min_lon": -83.05,
            "max_lon": -83.02,
        },
        "seed": 1,
    }
