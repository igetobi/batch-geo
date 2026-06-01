"""BatchGeo Playwright publisher with manual-finish fallback.

⚠  IMPLEMENTER NOTE — LIVE VERIFICATION REQUIRED
The selectors used inside publish_to_batchgeo() are *illustrative*.
Before using this module in production the implementer must:
  1. Run the persistent Chrome profile once and manually log into BatchGeo
     (clears Cloudflare managed-challenge cookies for the profile).
  2. Walk the "Map Now" → column-validation → title/slug/description → publish
     flow in the live UI and record the real CSS/text selectors.
  3. Replace every selector marked with  # ← VERIFY IN LIVE UI
     with the verified value.
The unit tests for this module cover ONLY the fallback path and helper
functions — the live flow is verified manually in Task 12.
"""

from __future__ import annotations

import os
from typing import Any


# ---------------------------------------------------------------------------
# Exception
# ---------------------------------------------------------------------------

class ManualFinishRequired(Exception):
    """Raised when the automated BatchGeo publish flow cannot complete.

    Carries a .payload dict containing the finished CSV and step-by-step
    instructions so a team member can finish the job manually.
    """

    def __init__(self, payload: dict[str, Any]) -> None:
        super().__init__("BatchGeo automation could not complete — manual finish required.")
        self.payload = payload


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def manual_finish_payload(csv_text: str, map_title: str) -> dict[str, Any]:
    """Return the manual-finish payload dict.

    The payload contains the finished CSV text and a numbered list of
    plain-English instructions a non-technical team member can follow.
    """
    instructions = [
        "1. Go to https://batchgeo.com and log in with the team BatchGeo account.",
        "2. Click 'Map Now' (or 'Create a New Map') on the BatchGeo dashboard.",
        "3. Paste the spreadsheet text below into the data-entry box and click 'Map Now'.",
        "4. On the column-validation screen, confirm that BatchGeo has correctly identified "
        "Name, Latitude, Longitude, Address, and the other columns, then click 'Continue'.",
        "5. Enter the map title exactly as shown: " + repr(map_title),
        "6. Set the map visibility to 'Public' (or 'Unlisted' as required).",
        "7. Click 'Save Map' / 'Publish'.",
        "8. Copy the resulting map URL (e.g. https://batchgeo.com/map/xxxxxxxx) and paste it "
        "back into the job record so the embed code can be generated.",
    ]
    return {
        "csv_text": csv_text,
        "map_title": map_title,
        "instructions": instructions,
    }


def build_embed_code(map_url: str) -> str:
    """Return BatchGeo's standard iframe embed snippet for *map_url*.

    The snippet mirrors the embed code BatchGeo generates on the map's
    share/embed page.
    """
    return (
        f'<div class="batchgeo-map-outer" style="width:100%;padding-bottom:56.25%;position:relative;">'
        f'<iframe src="{map_url}" '
        f'style="width:100%;height:100%;position:absolute;top:0;left:0;border:0;" '
        f'allowfullscreen loading="lazy">'
        f'</iframe>'
        f'</div>'
    )


# ---------------------------------------------------------------------------
# Publisher
# ---------------------------------------------------------------------------

async def publish_to_batchgeo(csv_text: str, request: Any) -> tuple[str, str]:
    """Publish *csv_text* to BatchGeo using a persistent real-browser profile.

    Uses Playwright's ``launch_persistent_context`` with ``headless=False``
    so that Cloudflare's managed challenge is handled by the warm cookie
    store in the persistent profile.

    Returns ``(map_url, embed_code)`` on success.

    Raises ``ManualFinishRequired`` (carrying the finished CSV and numbered
    instructions) on any timeout, Cloudflare challenge detection, or
    selector-not-found failure.

    ⚠  The selectors below are ILLUSTRATIVE.  They must be re-mapped against
       the live BatchGeo UI before this function can work end-to-end.
       All lines tagged  # ← VERIFY IN LIVE UI  need to be checked.
    """
    # Import here so the module is importable even if playwright is not
    # installed in the current environment.
    try:
        from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
    except ImportError as exc:
        raise ManualFinishRequired(
            manual_finish_payload(csv_text, getattr(request, "map_title", ""))
        ) from exc

    profile_dir = os.path.join(
        os.path.dirname(__file__), "..", "data", "bg-profile"
    )
    os.makedirs(profile_dir, exist_ok=True)

    try:
        async with async_playwright() as pw:
            context = await pw.chromium.launch_persistent_context(
                profile_dir,
                headless=False,
                slow_mo=300,  # human-like pacing to reduce ToS-ban risk
                args=["--disable-blink-features=AutomationControlled"],
            )
            page = await context.new_page()

            try:
                # ── Step 1: Navigate to BatchGeo and handle Cloudflare ──────
                await page.goto(
                    "https://batchgeo.com/",
                    wait_until="domcontentloaded",
                    timeout=30_000,
                )

                # Detect a Cloudflare challenge page — if present, bail early.
                if "challenge" in page.url or "cloudflare" in (await page.title()).lower():
                    raise PlaywrightTimeoutError(
                        "Cloudflare challenge detected — persistent profile may need warm-up."
                    )

                # ── Step 2: Paste the CSV into the data entry box ────────────
                data_box = page.locator("textarea#batchgeo_data")  # ← VERIFY IN LIVE UI
                await data_box.wait_for(state="visible", timeout=20_000)
                await data_box.fill(csv_text)

                map_now_btn = page.locator("input[value='Map Now']")  # ← VERIFY IN LIVE UI
                await map_now_btn.click()

                # ── Step 3: Column-validation screen ────────────────────────
                continue_btn = page.locator("input[value='Continue'], button:has-text('Continue')")  # ← VERIFY IN LIVE UI
                await continue_btn.wait_for(state="visible", timeout=30_000)
                await continue_btn.click()

                # ── Step 4: Map settings (title, slug, description, public) ──
                title_field = page.locator("input#map_name")  # ← VERIFY IN LIVE UI
                await title_field.wait_for(state="visible", timeout=20_000)
                await title_field.fill(request.map_title)

                slug_field = page.locator("input#map_id")  # ← VERIFY IN LIVE UI
                if await slug_field.count():
                    await slug_field.fill(request.map_slug)

                public_radio = page.locator("input[value='public']")  # ← VERIFY IN LIVE UI
                if await public_radio.count():
                    await public_radio.check()

                # ── Step 5: Save / Publish ───────────────────────────────────
                save_btn = page.locator("input[value='Save Map'], button:has-text('Save Map')")  # ← VERIFY IN LIVE UI
                await save_btn.click()

                # ── Step 6: Scrape the resulting map URL ─────────────────────
                await page.wait_for_url("**/map/**", timeout=30_000)  # ← VERIFY URL PATTERN
                map_url = page.url
                embed_code = build_embed_code(map_url)
                return map_url, embed_code

            except PlaywrightTimeoutError as exc:
                raise ManualFinishRequired(
                    manual_finish_payload(csv_text, getattr(request, "map_title", ""))
                ) from exc

            finally:
                await context.close()

    except ManualFinishRequired:
        raise
    except Exception as exc:
        raise ManualFinishRequired(
            manual_finish_payload(csv_text, getattr(request, "map_title", ""))
        ) from exc
