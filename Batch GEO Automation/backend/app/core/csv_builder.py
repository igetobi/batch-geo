"""BatchGeo 14-column CSV builder."""
from __future__ import annotations

import csv
import io

from app.models import ClientProfile, GeneratedPin

HEADER = [
    "Address", "City", "State", "Zipcode", "Name", "Phone Number",
    "Group", "URL", "Email", "Image", "Social", "Latitude", "Longitude", "Video",
]

# Order in which iframe types are cycled across pins (one per pin, then repeats)
_IFRAME_ORDER = ["website", "gmb", "my_maps", "sheets", "docs", "pearltrees"]


def _pin_url(client: ClientProfile, index: int) -> str:
    """Return the URL for this pin — citation URL cycled per pin, falls back to website."""
    if client.social_urls:
        return client.social_urls[index % len(client.social_urls)]
    return str(client.website)


def _image(client: ClientProfile, index: int) -> str:
    """Return the image URL for this pin, cycling through the list."""
    if client.image_urls:
        return client.image_urls[index % len(client.image_urls)]
    return str(client.logo_url) if client.logo_url else ""


def _build_iframe_cycle(client: ClientProfile) -> list[str]:
    """Return an ordered list of non-empty iframe values to cycle across pins."""
    if client.video_iframes:
        cycle = []
        for key in _IFRAME_ORDER:
            val = client.video_iframes.get(key, "").strip()
            if val:
                cycle.append(val)
        for key, val in client.video_iframes.items():
            if key not in _IFRAME_ORDER and val.strip():
                cycle.append(val.strip())
        return cycle
    if client.iframe_embed_html:
        return [client.iframe_embed_html]
    return []


def _video(iframe_cycle: list[str], index: int) -> str:
    if not iframe_cycle:
        return ""
    return iframe_cycle[index % len(iframe_cycle)]


def build_csv(pins: list[GeneratedPin], client: ClientProfile) -> str:
    """Build a BatchGeo-compatible 14-column CSV."""
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(HEADER)

    iframe_cycle = _build_iframe_cycle(client)

    for i, pin in enumerate(pins):
        address = f"{pin.latitude},{pin.longitude}"
        row = [
            address,                        # Address
            "",                             # City
            "",                             # State
            "",                             # Zipcode
            pin.keyword_title,              # Name
            client.phone,                   # Phone Number
            "",                             # Group
            _pin_url(client, i),            # URL ← citation URL cycled per pin
            str(client.email),              # Email
            _image(client, i),              # Image ← cycled optimized image
            _pin_url(client, i),            # Social ← same citation URL
            pin.latitude,                   # Latitude
            pin.longitude,                  # Longitude
            _video(iframe_cycle, i),        # Video ← one iframe per pin cycled
        ]
        writer.writerow(row)

    return output.getvalue()
