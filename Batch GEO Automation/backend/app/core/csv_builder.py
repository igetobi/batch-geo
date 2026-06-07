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

# Labels shown for each iframe type (order matters — they stack top-to-bottom)
_IFRAME_ORDER = ["youtube", "my_maps", "sheets", "docs", "pearltrees"]


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


def _video(client: ClientProfile) -> str:
    """Concatenate all iframe embeds into one Video cell value."""
    if client.video_iframes:
        parts = []
        for key in _IFRAME_ORDER:
            if key in client.video_iframes and client.video_iframes[key].strip():
                parts.append(client.video_iframes[key].strip())
        # Include any keys not in the ordered list
        for key, val in client.video_iframes.items():
            if key not in _IFRAME_ORDER and val.strip():
                parts.append(val.strip())
        return "\n".join(parts)
    return client.iframe_embed_html or ""


def build_csv(pins: list[GeneratedPin], client: ClientProfile) -> str:
    """Build a BatchGeo-compatible 14-column CSV."""
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(HEADER)

    video_cell = _video(client)

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
            video_cell,                     # Video ← stacked iframes
        ]
        writer.writerow(row)

    return output.getvalue()
