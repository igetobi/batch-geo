"""BatchGeo 14-column CSV builder."""
from __future__ import annotations

import csv
import io

from app.models import ClientProfile, GeneratedPin

HEADER = [
    "Address", "City", "State", "Zipcode", "Name", "Phone Number",
    "Group", "URL", "Email", "Image", "Social", "Latitude", "Longitude", "Video",
]


def build_csv(pins: list[GeneratedPin], client: ClientProfile) -> str:
    """Build a BatchGeo-compatible 14-column CSV from a list of pins and a client profile.

    Column mapping:
    - Address: "{lat},{lon}"
    - City/State/Zipcode/Group: blank
    - Name: pin.keyword_title
    - Phone Number: client.phone
    - URL: client.website (as string)
    - Email: client.email
    - Image: blank
    - Social: client.social_url or blank
    - Latitude: pin.latitude
    - Longitude: pin.longitude
    - Video: client.iframe_embed_html or blank
    """
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    writer.writerow(HEADER)

    for pin in pins:
        address = f"{pin.latitude},{pin.longitude}"
        row = [
            address,                                         # Address
            "",                                              # City
            "",                                              # State
            "",                                              # Zipcode
            pin.keyword_title,                               # Name
            client.phone,                                    # Phone Number
            "",                                              # Group
            str(client.website),                             # URL
            str(client.email),                               # Email
            str(client.logo_url) if client.logo_url else "",  # Image
            str(client.social_url) if client.social_url else "",  # Social
            pin.latitude,                                    # Latitude
            pin.longitude,                                   # Longitude
            client.iframe_embed_html or "",                  # Video
        ]
        writer.writerow(row)

    return output.getvalue()
