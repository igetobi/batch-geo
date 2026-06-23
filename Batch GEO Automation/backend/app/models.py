from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, EmailStr, Field, HttpUrl, model_validator


class ClientProfile(BaseModel):
    business_name: str = Field(..., max_length=200)
    phone: str = Field(..., max_length=50)
    email: EmailStr
    website: HttpUrl
    city: str = Field(..., max_length=100)
    state: str = Field(..., max_length=100)
    # GMB CID — used to build Google Maps search URLs in the URL column
    gmb_cid: str | None = Field(None, max_length=30)
    # Up to 5 GMB image URLs cycled across pins
    image_urls: list[str] = Field(default_factory=list, max_length=5)
    # Up to 50 citation/social URLs — one assigned per pin (cycled if fewer than pin count)
    social_urls: list[str] = Field(default_factory=list, max_length=50)
    # Named iframe embeds stacked into the Video column
    video_iframes: dict[str, str] = Field(default_factory=dict)
    # Legacy single fields — kept for backwards compatibility
    logo_url: HttpUrl | None = None
    social_url: HttpUrl | None = None
    iframe_embed_html: str | None = Field(None, max_length=2000)


class BoundingBox(BaseModel):
    min_lat: float
    max_lat: float
    min_lon: float
    max_lon: float

    @model_validator(mode="after")
    def check_min_lt_max(self) -> "BoundingBox":
        if self.min_lat >= self.max_lat:
            raise ValueError("min_lat must be less than max_lat")
        if self.min_lon >= self.max_lon:
            raise ValueError("min_lon must be less than max_lon")
        return self


class MapRequest(BaseModel):
    client: ClientProfile
    services: Annotated[list[str], Field(max_length=50)]
    landmarks: Annotated[list[str], Field(max_length=50)] = []
    geo_modifiers: Annotated[list[str], Field(max_length=50)] = []
    pin_count: int = Field(50, ge=1, le=200)
    map_title: str = Field(..., min_length=1, max_length=200)
    map_slug: str = Field(..., min_length=1, max_length=200)
    bounding_box: BoundingBox | None = None
    seed: int | None = None

    @model_validator(mode="after")
    def check_string_lengths(self) -> "MapRequest":
        for item in self.services:
            if len(item) > 200:
                raise ValueError("Each service string must be at most 200 characters")
        for item in self.landmarks:
            if len(item) > 200:
                raise ValueError("Each landmark string must be at most 200 characters")
        for item in self.geo_modifiers:
            if len(item) > 200:
                raise ValueError("Each geo_modifier string must be at most 200 characters")
        return self


class GeneratedPin(BaseModel):
    keyword_title: str
    latitude: float
    longitude: float


class MapResult(BaseModel):
    pins: list[GeneratedPin]
    csv_text: str
    description: str
    map_url: str | None = None
    embed_code: str | None = None


