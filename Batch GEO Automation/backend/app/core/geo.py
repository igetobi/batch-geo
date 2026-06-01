import httpx

from app.config import settings
from app.models import BoundingBox

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"


def geocode_city(city: str, state: str) -> BoundingBox:
    """Call Nominatim to resolve city+state to a BoundingBox.
    Raises ValueError if no result is returned.
    """
    params = {
        "q": f"{city}, {state}, USA",
        "format": "json",
        "limit": 1,
    }
    headers = {"User-Agent": settings.nominatim_user_agent}
    with httpx.Client() as client:
        resp = client.get(NOMINATIM_URL, params=params, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    if not data:
        raise ValueError(f"No geocoding result for '{city}, {state}'")

    # Nominatim boundingbox order: [min_lat, max_lat, min_lon, max_lon]
    bb = data[0]["boundingbox"]
    return BoundingBox(
        min_lat=float(bb[0]),
        max_lat=float(bb[1]),
        min_lon=float(bb[2]),
        max_lon=float(bb[3]),
    )


def fetch_landmarks(bbox: BoundingBox, limit: int = 8) -> list[str]:
    """Query Overpass for parks, malls, and named roads inside bbox.
    Returns up to `limit` distinct name strings; unnamed elements are skipped.
    """
    query = f"""
[out:json][timeout:15];
(
  node["leisure"="park"]({bbox.min_lat},{bbox.min_lon},{bbox.max_lat},{bbox.max_lon});
  way["leisure"="park"]({bbox.min_lat},{bbox.min_lon},{bbox.max_lat},{bbox.max_lon});
  node["shop"="mall"]({bbox.min_lat},{bbox.min_lon},{bbox.max_lat},{bbox.max_lon});
  way["shop"="mall"]({bbox.min_lat},{bbox.min_lon},{bbox.max_lat},{bbox.max_lon});
  way["highway"]["name"]({bbox.min_lat},{bbox.min_lon},{bbox.max_lat},{bbox.max_lon});
);
out tags;
""".strip()

    with httpx.Client() as client:
        resp = client.post(OVERPASS_URL, data={"data": query})
        resp.raise_for_status()
        data = resp.json()

    seen: set[str] = set()
    names: list[str] = []
    for element in data.get("elements", []):
        name = element.get("tags", {}).get("name", "").strip()
        if name and name not in seen:
            seen.add(name)
            names.append(name)
            if len(names) >= limit:
                break

    return names
