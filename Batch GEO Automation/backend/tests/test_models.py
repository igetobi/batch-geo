import pytest
from pydantic import ValidationError
from app.models import ClientProfile, MapRequest


def test_client_profile_requires_core_fields():
    p = ClientProfile(
        business_name="My Quality Construction",
        phone="(586) 222-8111",
        email="info@mqcmi.com",
        website="https://mqcmi.com",
        city="Sterling Heights",
        state="MI",
    )
    assert p.business_name == "My Quality Construction"


def test_client_profile_rejects_bad_email():
    with pytest.raises(ValidationError):
        ClientProfile(
            business_name="X", phone="1", email="not-an-email",
            website="https://x.com", city="Y", state="MI",
        )


def test_map_request_defaults_pin_count_to_50():
    req = MapRequest(
        client=ClientProfile(
            business_name="X", phone="1", email="a@b.com",
            website="https://x.com", city="Y", state="MI",
        ),
        services=["cabinet refacing"],
        map_title="Test Map",
        map_slug="testmap",
    )
    assert req.pin_count == 50
