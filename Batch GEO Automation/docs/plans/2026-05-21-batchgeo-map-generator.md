# BatchGeo Keyword-Grid Map Generator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A cloud web app that lets a non-technical team produce "BatchGeo keyword-grid citation maps" for SEO clients automatically — replacing work currently done by hand.

**Architecture:** A monorepo with a Python/FastAPI backend and a React/Vite/Tailwind frontend, deployed together on the user's VPS via Docker. The backend has a pure-Python *generation engine* (keywords, coordinates, CSV, description) that is fully unit-testable offline, plus a *publishing module* that drives a real Chrome browser (Playwright) to post the finished map to BatchGeo. The frontend is a simple form-and-results UI.

**Tech Stack:** Python 3.13, FastAPI, Pydantic v2, pytest, httpx, Playwright (Python), SQLite, Anthropic SDK (Claude API); React 19 + Vite + Tailwind; Docker + docker-compose.

---

## Plain-English summary (for the project owner)

This builds an internal website your team logs into. A team member fills in a short form about a client — business name, phone, website, the city, the type of work, a few local landmarks — and clicks one button. The app then does, automatically, everything your employee does by hand today:

1. Invents ~50 local keyword phrases (e.g. "cabinet refacing near Lakeside Mall Sterling Heights").
2. Scatters 50 map pins across the client's city.
3. Builds the BatchGeo spreadsheet in the exact format BatchGeo expects.
4. Writes the long keyword-rich description paragraph.
5. Publishes the map to BatchGeo and returns the finished map link plus the embed code to paste on the client's site.

If BatchGeo ever blocks the automated step, the app does not fail silently — it hands the team the finished spreadsheet and a short "paste this into BatchGeo yourself" instruction, so nobody is ever stuck.

The work is built in three phases. **Phase 1 (the generation engine) is useful on its own** even before the BatchGeo automation is proven, because it produces the finished spreadsheet ready to paste.

---

## Decisions & rationale

| Decision | Rationale |
|---|---|
| Monorepo: `backend/` + `frontend/` | Single small app, single VPS, deployed together. No need for separate repos. |
| SQLite for storage | Volume is a few maps/day — far under 100 writes/sec. No separate database server to run or secure on the VPS. |
| FastAPI + Pydantic v2 | Matches the stack the owner's other projects already use; strong typing makes the generation engine safe to test. |
| Pure-Python generation engine, isolated from web/IO | Keywords, coordinate jitter, and CSV assembly are deterministic — they must be unit-testable with zero network. The web layer and BatchGeo automation wrap this core. |
| Combinatorial keyword engine (not LLM) | The analyzed real map is plainly combinatorial: `service × geo-modifier × landmark`. Deterministic generation is controllable, free, and reproducible. The LLM is used only for the prose description. |
| Nominatim (OpenStreetMap) for geocoding the city bounding box | Free, no API key, returns a `boundingbox`. Rate-limited to ~1 req/sec — fine for our volume. Manual bbox override is always allowed. |
| Overpass API (OpenStreetMap) for optional landmark lookup | Free, no key. Landmarks can also be typed in manually; auto-fetch is a convenience. |
| Claude API (Anthropic SDK) for the description paragraph | The ~400-word keyword-stuffed prose is the one genuinely generative step. Use the latest Claude model; cache the static system prompt. Deterministic template fallback if the API is unavailable. |
| Playwright driving a **persistent, non-headless** Chrome profile for BatchGeo | BatchGeo sits behind a Cloudflare *managed challenge* — confirmed live on 2026-05-21: `curl` and headless fetches are blocked with a JS challenge page. A real (headful) browser with a persistent profile and warm Cloudflare clearance cookies passes the challenge far more reliably than headless automation. |
| Manual-finish fallback in the publisher | If Cloudflare or a BatchGeo UI change breaks automation, the job ends in a `needs_manual_finish` state that returns the finished CSV + step-by-step instructions, instead of failing. |
| Async job model for publishing | Browser publishing takes 1–3 minutes. The API starts a job and the frontend polls a status endpoint. Generation (keywords/CSV/description) stays synchronous — it is fast. |
| Simple shared team login (username + bcrypt-hashed password) | Small trusted team. No per-user roles, no OAuth. One credentials table. |
| Secrets in environment / `.env` (never committed) | BatchGeo account login and the Anthropic API key are secrets. `.env` is git-ignored; `.env.example` documents the keys. |

## Risks

- **BatchGeo automation is the high-risk task (Task 9).** The Cloudflare managed challenge is confirmed live. The persistent-real-browser approach is the best-known mitigation but cannot be *fully* verified without the owner's real BatchGeo account and live runs. The selectors in Task 9 are illustrative and **must be re-mapped against the live BatchGeo UI** by the implementer during that task. The manual-finish fallback exists precisely so the product still ships value if automation proves unreliable.
- **BatchGeo Terms of Service.** Automating BatchGeo with a browser robot is against BatchGeo's ToS and risks an account ban. The owner was informed and chose this approach on 2026-05-21. Keep automation gentle (human-like pacing, one map at a time) to reduce ban risk.
- **Nominatim city ambiguity / rate limits.** Some city names are ambiguous. Mitigation: always show the resolved bounding box in the UI and allow manual override.

## File structure

```
batchgeo-map-generator/
  backend/
    app/
      __init__.py
      main.py                 # FastAPI app + routes
      config.py               # settings from environment
      models.py               # Pydantic schemas
      auth.py                 # team login, password hashing, session token
      storage.py              # SQLite: clients, maps, jobs
      jobs.py                 # in-process async job runner + status
      core/
        __init__.py
        keywords.py           # combinatorial keyword engine
        coordinates.py        # jittered coordinate generator
        geo.py                # Nominatim geocode + Overpass landmarks
        description.py        # Claude API description generator + fallback
        csv_builder.py        # BatchGeo 14-column CSV assembly
        generator.py          # orchestrator: ties the core together
      publish/
        __init__.py
        batchgeo.py           # Playwright BatchGeo publisher + fallback
    tests/
      test_keywords.py
      test_coordinates.py
      test_geo.py
      test_description.py
      test_csv_builder.py
      test_generator.py
      test_api.py
      test_storage.py
      conftest.py
    pyproject.toml
    pytest.ini
  frontend/
    src/
      main.tsx
      App.tsx
      api.ts                  # backend API client
      components/
        LoginForm.tsx
        MapForm.tsx           # the client-input form
        MapPreview.tsx        # pin list + map preview
        ResultPanel.tsx       # final URL + embed code + copy buttons
      index.css
    index.html
    package.json
    vite.config.ts
    tailwind.config.js
  docs/
    plans/2026-05-21-batchgeo-map-generator.md   # this file
  .env.example
  .gitignore
  docker-compose.yml
  Dockerfile.backend
  Dockerfile.frontend
  README.md
```

---

# PHASE 1 — Generation engine (works standalone)

## Task 1: Project scaffold & tooling

**Files:**
- Create: `.gitignore`, `.env.example`, `README.md`
- Create: `backend/pyproject.toml`, `backend/pytest.ini`, `backend/app/__init__.py`, `backend/app/config.py`, `backend/app/main.py`, `backend/tests/conftest.py`
- Create: `frontend/` via Vite scaffold

- [ ] **Step 1: Initialize git and create `.gitignore`**

```bash
cd batchgeo-map-generator
git init
```

`.gitignore`:
```
__pycache__/
*.pyc
.venv/
.env
*.db
node_modules/
dist/
.playwright/
backend/app/data/
```

- [ ] **Step 2: Create `.env.example`**

```
ANTHROPIC_API_KEY=sk-ant-xxxxx
BATCHGEO_EMAIL=your-batchgeo-login-email
BATCHGEO_PASSWORD=your-batchgeo-password
APP_SECRET=change-this-to-a-long-random-string
TEAM_USERNAME=team
TEAM_PASSWORD=change-me
NOMINATIM_USER_AGENT=batchgeo-map-generator (contact: bruno@blackswanmedia.co)
```

- [ ] **Step 3: Create `backend/pyproject.toml`**

```toml
[project]
name = "batchgeo-map-generator"
version = "0.1.0"
requires-python = ">=3.13"
dependencies = [
  "fastapi>=0.115",
  "uvicorn[standard]>=0.32",
  "pydantic>=2.9",
  "pydantic-settings>=2.6",
  "httpx>=0.27",
  "anthropic>=0.40",
  "playwright>=1.48",
  "bcrypt>=4.2",
  "python-multipart>=0.0.12",
]

[project.optional-dependencies]
dev = ["pytest>=8.3", "pytest-asyncio>=0.24", "respx>=0.21"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

- [ ] **Step 4: Create `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    anthropic_api_key: str = ""
    batchgeo_email: str = ""
    batchgeo_password: str = ""
    app_secret: str = "dev-secret"
    team_username: str = "team"
    team_password: str = "change-me"
    nominatim_user_agent: str = "batchgeo-map-generator"

settings = Settings()
```

- [ ] **Step 5: Create minimal `backend/app/main.py`**

```python
from fastapi import FastAPI

app = FastAPI(title="BatchGeo Map Generator")

@app.get("/api/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Verify the backend runs**

Run: `cd backend && pip install -e ".[dev]" && uvicorn app.main:app --port 8000`
Expected: `GET http://localhost:8000/api/health` returns `{"status":"ok"}`.

- [ ] **Step 7: Scaffold the frontend**

Run: `npm create vite@latest frontend -- --template react-ts`, then add Tailwind per the current Tailwind+Vite install guide. Confirm `npm run dev` serves the default page.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: project scaffold (FastAPI backend + Vite/React frontend)"
```

---

## Task 2: Data models

**Files:**
- Create: `backend/app/models.py`
- Test: `backend/tests/test_models.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_models.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_models.py -v`
Expected: FAIL — `app.models` does not exist.

- [ ] **Step 3: Implement `backend/app/models.py`**

Define with Pydantic v2:
- `ClientProfile`: `business_name, phone, email (EmailStr), website (HttpUrl), city, state` (required); `logo_url, social_url (HttpUrl | None)`, `iframe_embed_html: str | None` (the `Video` column content).
- `GeoModifiers`: defaults `["{city}", "{city} {state}", "{city} {state_full}", "{county}"]` — directional; the engine fills templates.
- `MapRequest`: `client: ClientProfile`, `services: list[str]`, `landmarks: list[str] = []`, `geo_modifiers: list[str] = []`, `pin_count: int = 50`, `map_title: str`, `map_slug: str`, `bounding_box: BoundingBox | None = None`, `seed: int | None = None`.
- `BoundingBox`: `min_lat, max_lat, min_lon, max_lon: float` with a validator that `min < max`.
- `GeneratedPin`: `keyword_title, latitude, longitude` plus the constant client fields.
- `MapResult`: `pins: list[GeneratedPin]`, `csv_text: str`, `description: str`, `map_url: str | None`, `embed_code: str | None`.
- `JobStatus`: `id: str`, `state: Literal["generating","publishing","done","needs_manual_finish","error"]`, `result: MapResult | None`, `message: str | None`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_models.py -v` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/models.py backend/tests/test_models.py
git commit -m "feat: data models for client profile, map request, job status"
```

---

## Task 3: Keyword engine

**Files:**
- Create: `backend/app/core/keywords.py`
- Test: `backend/tests/test_keywords.py`

**Decision:** Generate the cartesian product of `services × geo_modifiers`, then a second set of `services × landmark-phrases` ("{service} near {landmark} {city}"). Deduplicate, shuffle deterministically by `seed`, and sample exactly `pin_count`. If unique combinations are fewer than `pin_count`, allow repeats (the real analyzed map repeats some titles). Each title gets ` {business_name}` appended — matching the observed pattern.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_keywords.py
from app.core.keywords import generate_keyword_titles

def test_generates_exact_count():
    titles = generate_keyword_titles(
        services=["cabinet refacing", "custom kitchen cabinets"],
        geo_modifiers=["Sterling Heights", "Sterling Heights MI"],
        landmarks=["Dodge Park", "Lakeside Mall"],
        business_name="My Quality Construction",
        count=50, seed=1,
    )
    assert len(titles) == 50

def test_titles_end_with_business_name():
    titles = generate_keyword_titles(
        services=["cabinet refacing"], geo_modifiers=["Sterling Heights"],
        landmarks=[], business_name="My Quality Construction", count=10, seed=1,
    )
    assert all(t.endswith("My Quality Construction") for t in titles)

def test_landmark_phrases_appear():
    titles = generate_keyword_titles(
        services=["cabinet refacing"], geo_modifiers=["Sterling Heights"],
        landmarks=["Dodge Park"], business_name="X", count=20, seed=1,
    )
    assert any("near Dodge Park" in t for t in titles)

def test_deterministic_with_seed():
    kw = dict(services=["a", "b"], geo_modifiers=["X"], landmarks=["L"],
              business_name="Biz", count=15, seed=42)
    assert generate_keyword_titles(**kw) == generate_keyword_titles(**kw)

def test_unique_until_pool_exhausted():
    # 1 service x 1 modifier x 0 landmarks = 1 unique combo; asking for 5 -> repeats allowed
    titles = generate_keyword_titles(
        services=["s"], geo_modifiers=["m"], landmarks=[],
        business_name="B", count=5, seed=1,
    )
    assert len(titles) == 5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_keywords.py -v` — Expected: FAIL — module missing.

- [ ] **Step 3: Implement `generate_keyword_titles`**

Directional implementation:
```python
import random

def generate_keyword_titles(services, geo_modifiers, landmarks,
                             business_name, count, seed=None):
    combos = []
    for s in services:
        for g in geo_modifiers:
            combos.append(f"{s} {g}")
        for lm in landmarks:
            # use the first geo_modifier as the city anchor
            anchor = geo_modifiers[0] if geo_modifiers else ""
            combos.append(f"{s} near {lm} {anchor}".strip())
    seen, unique = set(), []
    for c in combos:
        norm = " ".join(c.split())
        if norm not in seen:
            seen.add(norm); unique.append(norm)
    rng = random.Random(seed)
    rng.shuffle(unique)
    chosen = list(unique)
    while len(chosen) < count:                  # pool exhausted -> allow repeats
        chosen.append(rng.choice(unique))
    chosen = chosen[:count]
    return [f"{t} {business_name}".strip() for t in chosen]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_keywords.py -v` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/keywords.py backend/tests/test_keywords.py
git commit -m "feat: combinatorial keyword title engine"
```

---

## Task 4: Coordinate jitter

**Files:**
- Create: `backend/app/core/coordinates.py`
- Test: `backend/tests/test_coordinates.py`

**Decision:** Generate `count` uniform-random points inside the bounding box. Seeded for reproducibility. Round to 8 decimal places (matches the precision observed on the real map, e.g. `42.61742777`).

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_coordinates.py
from app.models import BoundingBox
from app.core.coordinates import jitter_coordinates

BBOX = BoundingBox(min_lat=42.59, max_lat=42.63, min_lon=-83.05, max_lon=-83.02)

def test_generates_exact_count():
    pts = jitter_coordinates(BBOX, count=50, seed=1)
    assert len(pts) == 50

def test_all_points_inside_bbox():
    for lat, lon in jitter_coordinates(BBOX, count=200, seed=1):
        assert 42.59 <= lat <= 42.63
        assert -83.05 <= lon <= -83.02

def test_deterministic_with_seed():
    assert jitter_coordinates(BBOX, 30, seed=7) == jitter_coordinates(BBOX, 30, seed=7)

def test_rounded_to_8_decimals():
    lat, lon = jitter_coordinates(BBOX, count=1, seed=1)[0]
    assert len(str(lat).split(".")[-1]) <= 8
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_coordinates.py -v` — Expected: FAIL.

- [ ] **Step 3: Implement `jitter_coordinates`**

```python
import random

def jitter_coordinates(bbox, count, seed=None):
    rng = random.Random(seed)
    pts = []
    for _ in range(count):
        lat = round(rng.uniform(bbox.min_lat, bbox.max_lat), 8)
        lon = round(rng.uniform(bbox.min_lon, bbox.max_lon), 8)
        pts.append((lat, lon))
    return pts
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_coordinates.py -v` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/coordinates.py backend/tests/test_coordinates.py
git commit -m "feat: jittered coordinate generator"
```

---

## Task 5: Geo services (Nominatim + Overpass)

**Files:**
- Create: `backend/app/core/geo.py`
- Test: `backend/tests/test_geo.py`

**Decision:** `geocode_city(city, state)` calls Nominatim `search` and returns a `BoundingBox` from the `boundingbox` field. `fetch_landmarks(bbox, limit)` calls the Overpass API for parks, malls, and named major roads inside the bbox. Both use `httpx`; tests mock HTTP with `respx` — **no live network in tests**. Send the configured `User-Agent` (Nominatim requires it).

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_geo.py
import respx, httpx
from app.core.geo import geocode_city, fetch_landmarks

@respx.mock
def test_geocode_city_returns_bbox():
    respx.get("https://nominatim.openstreetmap.org/search").mock(
        return_value=httpx.Response(200, json=[{
            "boundingbox": ["42.5901", "42.6301", "-83.0501", "-83.0201"]
        }])
    )
    bbox = geocode_city("Sterling Heights", "MI")
    assert bbox.min_lat == 42.5901
    assert bbox.max_lon == -83.0201

@respx.mock
def test_geocode_city_raises_on_no_result():
    respx.get("https://nominatim.openstreetmap.org/search").mock(
        return_value=httpx.Response(200, json=[])
    )
    import pytest
    with pytest.raises(ValueError):
        geocode_city("Nowheresville", "ZZ")

@respx.mock
def test_fetch_landmarks_parses_names():
    respx.post("https://overpass-api.de/api/interpreter").mock(
        return_value=httpx.Response(200, json={"elements": [
            {"tags": {"name": "Dodge Park"}},
            {"tags": {"name": "Lakeside Mall"}},
            {"tags": {}},  # unnamed -> skipped
        ]})
    )
    names = fetch_landmarks_bbox_stub()  # see implementation note
    assert "Dodge Park" in names and "Lakeside Mall" in names
```

> Implementation note: name the real function `fetch_landmarks(bbox, limit=8)`; the test stub name above is a placeholder — the implementer wires the real signature and passes a `BoundingBox`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_geo.py -v` — Expected: FAIL.

- [ ] **Step 3: Implement `geo.py`**

- `geocode_city`: GET `https://nominatim.openstreetmap.org/search` with params `{q: f"{city}, {state}, USA", format: "json", limit: 1}` and the `User-Agent` header from `settings`. Raise `ValueError` if the result list is empty. Map `boundingbox` `[min_lat, max_lat, min_lon, max_lon]` (Nominatim order) to `BoundingBox`.
- `fetch_landmarks`: POST an Overpass QL query to `https://overpass-api.de/api/interpreter` selecting `leisure=park`, `shop=mall`, and `highway` named roads within the bbox; return up to `limit` distinct `tags.name` values, skipping unnamed elements.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_geo.py -v` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/geo.py backend/tests/test_geo.py
git commit -m "feat: Nominatim geocoding and Overpass landmark lookup"
```

---

## Task 6: Description generator (Claude API)

**Files:**
- Create: `backend/app/core/description.py`
- Test: `backend/tests/test_description.py`

**Decision:** `generate_description(request)` calls the Claude API (Anthropic SDK) to produce a ~350–450-word paragraph weaving every service and landmark plus the city into prose. Use the latest Claude model. Put the static instruction block in the system prompt with a `cache_control` breakpoint (prompt caching). If the API call fails or no key is set, fall back to `_template_description(request)` — a deterministic string that still mentions every service and landmark. Tests **mock the Anthropic client** — no live API calls.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_description.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_description.py -v` — Expected: FAIL.

- [ ] **Step 3: Implement `description.py`**

- `_template_description(request)`: f-string template that lists all services and landmarks and the city — guaranteed deterministic, no network.
- `_claude_call(system, user)`: thin wrapper around `anthropic.Anthropic(...).messages.create(...)`, latest model, `system` passed as a list with a `cache_control` breakpoint on the static block. Returns the text of the first content block.
- `generate_description(request)`: build the prompt from the request; `try` `_claude_call`; on any exception (or empty key) return `_template_description(request)`.

> Use the `claude-api` skill conventions for the SDK call shape, model id, and prompt-cache breakpoint.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_description.py -v` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/description.py backend/tests/test_description.py
git commit -m "feat: Claude-API description generator with template fallback"
```

---

## Task 7: CSV builder

**Files:**
- Create: `backend/app/core/csv_builder.py`
- Test: `backend/tests/test_csv_builder.py`

**Decision:** Emit BatchGeo's exact 14-column header in exact order: `Address, City, State, Zipcode, Name, Phone Number, Group, URL, Email, Image, Social, Latitude, Longitude, Video`. Per pin: `Address` = `"{lat},{lon}"` string; `City/State/Zipcode/Group` blank; `Name` = keyword title; `Phone Number/Email/URL/Image/Social` = constant client fields; `Latitude/Longitude` = the pin coords; `Video` = the client's iframe embed HTML. Use Python's `csv` module so embedded commas/quotes (the iframe HTML contains both) are escaped correctly.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_csv_builder.py
import csv, io
from app.core.csv_builder import build_csv
from app.models import GeneratedPin

EXPECTED_HEADER = ["Address","City","State","Zipcode","Name","Phone Number",
    "Group","URL","Email","Image","Social","Latitude","Longitude","Video"]

def _pin(title, lat, lon):
    return GeneratedPin(keyword_title=title, latitude=lat, longitude=lon)

def test_header_is_exact():
    text = build_csv([_pin("kw A Biz", 42.6, -83.0)], client=_client())
    rows = list(csv.reader(io.StringIO(text)))
    assert rows[0] == EXPECTED_HEADER

def test_address_column_is_latlon_string():
    text = build_csv([_pin("kw A Biz", 42.61742777, -83.02740218)], client=_client())
    rows = list(csv.reader(io.StringIO(text)))
    assert rows[1][0] == "42.61742777,-83.02740218"

def test_iframe_with_commas_survives_round_trip():
    iframe = '<iframe src="https://x.com/a" width="500px" height="400px"></iframe>'
    text = build_csv([_pin("kw", 42.6, -83.0)], client=_client(iframe=iframe))
    rows = list(csv.reader(io.StringIO(text)))
    assert rows[1][13] == iframe  # Video column intact after CSV escaping

def test_one_row_per_pin():
    pins = [_pin(f"kw{i} Biz", 42.6, -83.0) for i in range(50)]
    text = build_csv(pins, client=_client())
    rows = list(csv.reader(io.StringIO(text)))
    assert len(rows) == 51  # header + 50
```

> `_client()` / `_client(iframe=...)` are test helpers building a `ClientProfile`; the implementer adds them to the test file.

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_csv_builder.py -v` — Expected: FAIL.

- [ ] **Step 3: Implement `build_csv(pins, client)`**

Use `csv.writer` into a `StringIO`. Write `EXPECTED_HEADER`, then one row per pin with the column mapping from the Decision above. Return `output.getvalue()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_csv_builder.py -v` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/csv_builder.py backend/tests/test_csv_builder.py
git commit -m "feat: BatchGeo 14-column CSV builder"
```

---

## Task 8: Generation orchestrator

**Files:**
- Create: `backend/app/core/generator.py`
- Test: `backend/tests/test_generator.py`

**Decision:** `generate_map(request)` is the single entry point that ties Phase 1 together: resolve the bounding box (use `request.bounding_box` if provided, else `geocode_city`), generate keyword titles, jitter coordinates, zip them into `GeneratedPin`s, build the CSV, generate the description, and return a `MapResult` with `map_url`/`embed_code` left `None` (Phase 2 fills those). It must be callable with no network when `bounding_box` is supplied and the description falls back to template.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_generator.py
from app.core.generator import generate_map
from app.models import MapRequest, ClientProfile, BoundingBox

def _req():
    return MapRequest(
        client=ClientProfile(business_name="My Quality Construction", phone="(586) 222-8111",
            email="info@mqcmi.com", website="https://mqcmi.com",
            city="Sterling Heights", state="MI"),
        services=["cabinet refacing", "custom kitchen cabinets", "cabinet installation"],
        landmarks=["Dodge Park", "Lakeside Mall"],
        geo_modifiers=["Sterling Heights", "Sterling Heights MI"],
        pin_count=50, map_title="Cabinet Map", map_slug="cabinetmap",
        bounding_box=BoundingBox(min_lat=42.59, max_lat=42.63,
                                 min_lon=-83.05, max_lon=-83.02),
        seed=1,
    )

def test_generates_50_pins(monkeypatch):
    monkeypatch.setattr("app.core.generator.generate_description", lambda r: "desc")
    result = generate_map(_req())
    assert len(result.pins) == 50

def test_csv_has_51_lines(monkeypatch):
    monkeypatch.setattr("app.core.generator.generate_description", lambda r: "desc")
    result = generate_map(_req())
    assert len(result.csv_text.strip().splitlines()) == 51

def test_no_url_until_published(monkeypatch):
    monkeypatch.setattr("app.core.generator.generate_description", lambda r: "desc")
    result = generate_map(_req())
    assert result.map_url is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_generator.py -v` — Expected: FAIL.

- [ ] **Step 3: Implement `generate_map`**

Compose Tasks 3–7. If `request.bounding_box` is `None`, call `geocode_city`. Build pins by zipping titles with coordinates. Return `MapResult`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_generator.py -v` — Expected: PASS.

- [ ] **Step 5: Run the full Phase 1 suite & commit**

Run: `pytest -v` — Expected: all tests PASS.
```bash
git add backend/app/core/generator.py backend/tests/test_generator.py
git commit -m "feat: generation orchestrator (engine complete, Phase 1)"
```

---

# PHASE 2 — BatchGeo publishing

## Task 9: BatchGeo publisher (Playwright) — HIGH RISK

**Files:**
- Create: `backend/app/publish/batchgeo.py`
- Test: `backend/tests/test_batchgeo.py`

**⚠ Implementer note:** This task requires the owner's real BatchGeo login and a live BatchGeo session to map the current UI. The selectors below are **illustrative** — the first step of implementation is a manual discovery pass: log into BatchGeo in the persistent Chrome profile, walk the "create map" flow, and record the real selectors. Cloudflare's managed challenge (confirmed live 2026-05-21) must be passed by the persistent real browser profile, not headless. Keep automation human-paced (one map at a time, small delays).

**Decision:** `publish_to_batchgeo(csv_text, request)` launches Playwright with a **persistent context** (`launch_persistent_context`, `headless=False`) pointed at a profile directory that stays logged into BatchGeo with warm Cloudflare cookies. It navigates to the create-map page, pastes `csv_text`, advances through column validation, sets title/slug/description, sets the map public, publishes, and scrapes the resulting map URL. On any timeout, challenge wall, or missing selector it raises `ManualFinishRequired` carrying the CSV + instructions. Unit tests verify the **fallback path and result-shaping logic only** — the live browser flow is verified manually in Task 12.

- [ ] **Step 1: Write the failing test (fallback + helpers)**

```python
# backend/tests/test_batchgeo.py
import pytest
from app.publish.batchgeo import ManualFinishRequired, build_embed_code, manual_finish_payload

def test_build_embed_code_wraps_map_url():
    code = build_embed_code("https://batchgeo.com/map/abc123")
    assert "batchgeo.com/map/abc123" in code
    assert code.strip().startswith("<")

def test_manual_finish_payload_includes_csv_and_steps():
    payload = manual_finish_payload(csv_text="Address,City\n1,2", map_title="My Map")
    assert payload["csv_text"] == "Address,City\n1,2"
    assert "instructions" in payload
    assert len(payload["instructions"]) >= 3  # step-by-step list

def test_manual_finish_required_is_raisable():
    with pytest.raises(ManualFinishRequired):
        raise ManualFinishRequired(manual_finish_payload("csv", "T"))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_batchgeo.py -v` — Expected: FAIL.

- [ ] **Step 3: Implement `batchgeo.py`**

- `ManualFinishRequired(Exception)` — carries a `.payload` dict.
- `manual_finish_payload(csv_text, map_title)` — returns `{"csv_text":..., "map_title":..., "instructions": [...]}` with a plain-English numbered list ("1. Go to batchgeo.com and log in. 2. Paste the spreadsheet text below. 3. Click Map Now…").
- `build_embed_code(map_url)` — returns BatchGeo's standard `<iframe>`/`<script>` embed snippet for that map URL.
- `publish_to_batchgeo(csv_text, request)` — async; `launch_persistent_context` with `headless=False` and a profile dir under `backend/app/data/bg-profile/`; perform the create-map flow inside a `try`; on `PlaywrightTimeoutError` / challenge detection / selector failure, `raise ManualFinishRequired(manual_finish_payload(csv_text, request.map_title))`. On success return `(map_url, build_embed_code(map_url))`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_batchgeo.py -v` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/publish/batchgeo.py backend/tests/test_batchgeo.py
git commit -m "feat: BatchGeo Playwright publisher with manual-finish fallback"
```

---

## Task 10: Storage, jobs, auth & API

**Files:**
- Create: `backend/app/storage.py`, `backend/app/jobs.py`, `backend/app/auth.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_storage.py`, `backend/tests/test_api.py`

**Decision:** SQLite via the stdlib `sqlite3` module — tables `clients`, `maps`, `jobs`. `jobs.py` runs publishing in a background task and exposes `get_job(id)`. `auth.py` checks the single team credential (bcrypt) and issues a signed session token. API routes:
- `POST /api/login` → session token.
- `POST /api/generate` (auth) → runs `generate_map`, returns `MapResult` (synchronous; no publishing).
- `POST /api/publish` (auth) → starts a publish job, returns `{job_id}`.
- `GET /api/jobs/{id}` (auth) → `JobStatus`.
- `GET /api/maps` (auth) → saved maps list.

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_api.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def _token():
    r = client.post("/api/login", json={"username": "team", "password": "change-me"})
    assert r.status_code == 200
    return r.json()["token"]

def test_login_rejects_bad_password():
    r = client.post("/api/login", json={"username": "team", "password": "wrong"})
    assert r.status_code == 401

def test_generate_requires_auth():
    r = client.post("/api/generate", json={})
    assert r.status_code == 401

def test_generate_returns_csv_and_pins(monkeypatch):
    monkeypatch.setattr("app.core.generator.generate_description", lambda r: "desc")
    token = _token()
    r = client.post("/api/generate", headers={"Authorization": f"Bearer {token}"},
                     json=_sample_request_json())  # helper in conftest
    assert r.status_code == 200
    body = r.json()
    assert len(body["pins"]) == 50
    assert body["csv_text"].count("\n") >= 50
```

```python
# backend/tests/test_storage.py
from app.storage import Storage

def test_save_and_get_map(tmp_path):
    s = Storage(tmp_path / "t.db")
    map_id = s.save_map(title="T", slug="t", csv_text="csv", description="d")
    got = s.get_map(map_id)
    assert got["title"] == "T"

def test_job_lifecycle(tmp_path):
    s = Storage(tmp_path / "t.db")
    jid = s.create_job(state="publishing")
    s.update_job(jid, state="done", message="ok")
    assert s.get_job(jid)["state"] == "done"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_api.py tests/test_storage.py -v` — Expected: FAIL.

- [ ] **Step 3: Implement storage, auth, jobs, and routes**

- `Storage`: `sqlite3` wrapper; creates tables on init; methods `save_map/get_map/list_maps`, `create_job/update_job/get_job`, `save_client`.
- `auth.py`: `verify_login`, `issue_token`, `require_token` FastAPI dependency (HMAC-signed token using `settings.app_secret`).
- `jobs.py`: `start_publish_job(map_result, request)` runs `publish_to_batchgeo` via `asyncio` / FastAPI `BackgroundTasks`; on `ManualFinishRequired` sets job state `needs_manual_finish` with the payload; on success sets `done` with URL + embed code.
- `main.py`: wire the five routes; apply `require_token` to all except `/api/login` and `/api/health`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest -v` — Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/storage.py backend/app/jobs.py backend/app/auth.py backend/app/main.py backend/tests/test_api.py backend/tests/test_storage.py
git commit -m "feat: storage, auth, async publish jobs, and API routes"
```

---

# PHASE 3 — Frontend & deployment

## Task 11: Frontend (login, form, preview, results)

**Files:**
- Create: `frontend/src/api.ts`, `frontend/src/App.tsx`, `frontend/src/components/LoginForm.tsx`, `MapForm.tsx`, `MapPreview.tsx`, `ResultPanel.tsx`

**Decision:** Plain, friendly UI for non-technical users. One screen at a time: Login → Map Form → (Generating…) → Preview with "Publish to BatchGeo" → (Publishing…) → Result. The form has clear labels, sensible defaults (pin count 50), and **niche presets** (a dropdown that pre-fills the services list for "Cabinets", "Windows", "Roofing", etc.). If a publish job ends in `needs_manual_finish`, the Result panel shows the CSV in a copy box plus the numbered instructions — never a raw error.

- [ ] **Step 1: Build `api.ts`** — typed `fetch` wrappers for the five endpoints; stores the session token in memory.
- [ ] **Step 2: Build `LoginForm.tsx`** — username/password, calls `/api/login`.
- [ ] **Step 3: Build `MapForm.tsx`** — all `MapRequest` fields; niche-preset dropdown; landmarks as add/remove chips; "Look up the city automatically" button that resolves the bounding box; submit calls `/api/generate`.
- [ ] **Step 4: Build `MapPreview.tsx`** — shows the resolved bounding box, the 50 keyword titles, and an embedded Leaflet preview of the pins; a "Publish to BatchGeo" button calling `/api/publish` then polling `/api/jobs/{id}`.
- [ ] **Step 5: Build `ResultPanel.tsx`** — on `done`: map URL + embed code with copy buttons. On `needs_manual_finish`: the CSV in a copy box + numbered instructions.
- [ ] **Step 6: Wire `App.tsx`** screen-state machine; verify the full flow against the running backend with description mocked.
- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: React UI — login, map form, preview, result panel"
```

---

## Task 12: Deployment & end-to-end verification

**Files:**
- Create: `Dockerfile.backend`, `Dockerfile.frontend`, `docker-compose.yml`, `README.md`

- [ ] **Step 1: `Dockerfile.backend`** — Python 3.13 base; install deps; `playwright install chromium` + OS deps; run `uvicorn`.
- [ ] **Step 2: `Dockerfile.frontend`** — build the Vite app, serve static via nginx; proxy `/api` to the backend.
- [ ] **Step 3: `docker-compose.yml`** — `backend` + `frontend` services; mount a named volume for the SQLite DB and the persistent Chrome profile; read secrets from `.env`.
- [ ] **Step 4: `README.md`** — plain-English setup: copy `.env.example` to `.env`, fill in the BatchGeo login + Anthropic key, `docker compose up -d`, open the site.
- [ ] **Step 5: One-time BatchGeo login** — run the persistent Chrome profile once, manually log into BatchGeo, and clear Cloudflare so the profile holds warm cookies. Document this in the README as a required first-run step.
- [ ] **Step 6: End-to-end verification** — see the Verification section below. Generate a real map for a test client and publish it.
- [ ] **Step 7: Commit**

```bash
git add Dockerfile.backend Dockerfile.frontend docker-compose.yml README.md
git commit -m "chore: Docker deployment and setup docs"
```

---

## End-to-end verification (before claiming done)

1. `docker compose up -d`; open the site; log in.
2. Fill the form for a test client (use the real Sterling Heights cabinet example) and click Generate.
3. Confirm: 50 keyword titles shown, bounding box resolved, 50 pins on the preview map.
4. Download/copy the CSV — open it and confirm the 14-column header and `Address` = `lat,lon`.
5. Click "Publish to BatchGeo".
   - **Success path:** a real `batchgeo.com/map/...` URL comes back; open it and confirm 50 pins render.
   - **Fallback path:** the Result panel shows the CSV + instructions cleanly (no raw error).
6. Paste the embed code into a scratch HTML file and confirm the map renders.
7. Confirm the map appears in `GET /api/maps`.

**This is not done until step 5's success path has been demonstrated at least once with the owner's real BatchGeo account, OR the owner has explicitly accepted shipping with the fallback path as the interim default.**

---

## Self-review notes

- **Spec coverage:** form input → Task 2/11; geocode bbox → Task 5; keyword engine → Task 3; jittered coords → Task 4; 14-column CSV → Task 7; description via Claude → Task 6; orchestration → Task 8; BatchGeo publish + fallback → Task 9; URL + embed code → Task 9/10; auth + cloud app → Task 10/11; deploy → Task 12. No gaps.
- **Scope guard:** No MainWP auto-deploy (correctly out of scope). Output stops at embed code.
- **Sequencing:** Phase 1 (Tasks 1–8) is independently testable and shippable. Phase 2 (9–10) depends on Phase 1's `MapResult`. Phase 3 (11–12) depends on the Phase 2 API. Task 9 is the high-risk task and is isolated so its uncertainty does not block Phase 1 value.
