"""Generation orchestrator — ties the Phase 1 engine together."""
from __future__ import annotations

from app.core.coordinates import jitter_coordinates
from app.core.csv_builder import build_csv
from app.core.description import generate_description
from app.core.geo import geocode_city
from app.core.keywords import generate_keyword_titles
from app.models import GeneratedPin, MapRequest, MapResult


def generate_map(request: MapRequest) -> MapResult:
    """Run the full Phase 1 generation pipeline.

    1. Resolve the bounding box (use provided bbox or geocode).
    2. Generate keyword titles.
    3. Jitter coordinates.
    4. Zip into GeneratedPin list.
    5. Build the CSV.
    6. Generate the description.
    7. Return a MapResult (map_url / embed_code are None — Phase 2 fills those).
    """
    # Step 1: Resolve bounding box
    bbox = request.bounding_box or geocode_city(request.client.city, request.client.state)

    # Step 2: Resolve geo_modifiers — use provided ones or default to city/state combos
    geo_modifiers = request.geo_modifiers or [
        request.client.city,
        f"{request.client.city} {request.client.state}",
    ]

    # Step 3: Generate keyword titles
    titles = generate_keyword_titles(
        services=request.services,
        geo_modifiers=geo_modifiers,
        landmarks=request.landmarks,
        business_name=request.client.business_name,
        count=request.pin_count,
        seed=request.seed,
    )

    # Step 4: Jitter coordinates
    coords = jitter_coordinates(bbox, count=request.pin_count, seed=request.seed)

    # Step 5: Zip into GeneratedPin objects
    pins = [
        GeneratedPin(keyword_title=title, latitude=lat, longitude=lon)
        for title, (lat, lon) in zip(titles, coords)
    ]

    # Step 6: Build CSV
    csv_text = build_csv(pins, client=request.client)

    # Step 7: Generate description
    description = generate_description(request)

    return MapResult(
        pins=pins,
        csv_text=csv_text,
        description=description,
        map_url=None,
        embed_code=None,
    )
