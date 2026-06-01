"""Description generator: Claude API with template fallback."""
from __future__ import annotations

import logging

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)

_MODEL = "claude-sonnet-4-6"

_SYSTEM_PROMPT = (
    "You are an expert local SEO copywriter. "
    "Write a 350–450-word, keyword-rich paragraph that naturally weaves together "
    "the business name, all services, all landmarks, and the city. "
    "Write in third person, no bullet points, no headers — just flowing prose. "
    "Mention each service and landmark at least once."
)


def _claude_call(system: str, user: str) -> str:
    """Thin wrapper around the Anthropic SDK. Returns the text of the first content block."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model=_MODEL,
        max_tokens=1024,
        system=[
            {
                "type": "text",
                "text": system,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user}],
    )
    return message.content[0].text


def _template_description(request) -> str:
    """Deterministic template fallback — no network required."""
    client = request.client
    services_str = ", ".join(request.services)
    landmarks_str = ", ".join(request.landmarks) if request.landmarks else "the local area"

    return (
        f"{client.business_name} is a trusted provider of {services_str} "
        f"serving {client.city}, {client.state} and the surrounding communities. "
        f"With deep roots in the area, the team at {client.business_name} brings "
        f"years of expertise to every project. "
        f"Whether you're near {landmarks_str} or elsewhere in {client.city}, "
        f"{client.business_name} is ready to help with all your {services_str} needs. "
        f"Homeowners throughout {client.city} count on {client.business_name} "
        f"for quality workmanship and outstanding customer service. "
        f"From {request.services[0]} to "
        f"{request.services[-1] if len(request.services) > 1 else 'every project'}, "
        f"the crew handles every job with care and professionalism. "
        f"Serving neighbors near {landmarks_str} and across all of {client.city}, "
        f"{client.business_name} combines local knowledge with proven techniques "
        f"to deliver results that exceed expectations. "
        f"Contact {client.business_name} today to learn more about {services_str} "
        f"in {client.city}, {client.state}."
    )


def generate_description(request) -> str:
    """Generate a keyword-rich description via Claude API, falling back to template."""
    if not settings.anthropic_api_key:
        return _template_description(request)

    client = request.client
    services_str = ", ".join(request.services)
    landmarks_str = ", ".join(request.landmarks) if request.landmarks else "local landmarks"

    user_prompt = (
        f"Business: {client.business_name}\n"
        f"City: {client.city}, {client.state}\n"
        f"Services: {services_str}\n"
        f"Landmarks: {landmarks_str}\n\n"
        f"Write the SEO description paragraph now."
    )

    try:
        return _claude_call(_SYSTEM_PROMPT, user_prompt)
    except Exception:
        logger.exception("Claude API call failed; falling back to template description")
        return _template_description(request)
