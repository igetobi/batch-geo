from unittest.mock import patch, MagicMock
from app.core.description import generate_description, _template_description
from app.models import MapRequest, ClientProfile


def _req():
    return MapRequest(
        client=ClientProfile(business_name="My Quality Construction", phone="1",
            email="a@b.com", website="https://x.com", city="Sterling Heights", state="MI"),
        services=["cabinet refacing", "custom kitchen cabinets"],
        landmarks=["Dodge Park"], map_title="T", map_slug="t",
    )


def test_template_fallback_mentions_all_terms():
    text = _template_description(_req())
    assert "cabinet refacing" in text
    assert "custom kitchen cabinets" in text
    assert "Dodge Park" in text
    assert "Sterling Heights" in text


def test_generate_uses_api_when_available():
    fake = MagicMock()
    fake.content = [MagicMock(text="A long generated paragraph about cabinets.")]
    with patch("app.core.description._claude_call", return_value=fake.content[0].text):
        text = generate_description(_req())
    assert "cabinets" in text


def test_generate_falls_back_on_api_error():
    with patch("app.core.description._claude_call", side_effect=RuntimeError("boom")):
        text = generate_description(_req())
    assert "Dodge Park" in text  # template fallback used
