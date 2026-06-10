"""BatchGeo 14-column CSV builder."""
from __future__ import annotations

import csv
import io
import urllib.parse

from app.models import ClientProfile, GeneratedPin

HEADER = [
    "Address", "City", "State", "Zipcode", "Name", "Phone Number",
    "Group", "URL", "Email", "Image", "Social", "Latitude", "Longitude", "Video",
]

# Order in which iframe types are cycled across pins (one per pin, then repeats)
_IFRAME_ORDER = ["website", "gmb", "my_maps", "sheets", "docs", "pearltrees"]


def _maps_url(client: ClientProfile, pin: GeneratedPin) -> str:
    """Build a Google Maps search URL for this pin.

    Format: google.com/maps/search/{Brand}+{keyword}+{city}/@{lat},{lon}z?cid={CID}
    Falls back to the client website when no GMB CID is provided.
    """
    if not client.gmb_cid:
        return str(client.website)
    query = urllib.parse.quote_plus(
        f"{client.business_name} {pin.keyword_title} {client.city}"
    )
    return (
        f"https://www.google.com/maps/search/{query}"
        f"/@{pin.latitude},{pin.longitude}z?cid={client.gmb_cid}"
    )


def _image(client: ClientProfile, index: int) -> str:
    """Return the image URL for this pin, cycling through the list."""
    if client.image_urls:
        return client.image_urls[index % len(client.image_urls)]
    return str(client.logo_url) if client.logo_url else ""


def _social(client: ClientProfile, index: int) -> str:
    """Return the social/citation URL for this pin."""
    if client.social_urls:
        return client.social_urls[index % len(client.social_urls)]
    return str(client.social_url) if client.social_url else ""


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
    """Return the iframe for this pin (one per pin, cycling through the list)."""
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
            _maps_url(client, pin),         # URL  ← Google Maps search URL
            str(client.email),              # Email
            _image(client, i),              # Image ← cycled GMB image
            _social(client, i),             # Social ← per-pin citation URL
            pin.latitude,                   # Latitude
            pin.longitude,                  # Longitude
            _video(iframe_cycle, i),        # Video ← cycled one iframe per pin
        ]
        writer.writerow(row)

    return output.getvalue()
