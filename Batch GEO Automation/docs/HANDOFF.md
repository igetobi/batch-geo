# Handoff — BatchGeo Keyword-Grid Map Generator

**Last updated:** 2026-05-22 · **For:** any AI or operator taking over this project.

Read this first, then drill into the linked docs below as needed. This is a complete-as-of-handoff snapshot — what the project is, what works, what doesn't, what's outstanding, and the gotchas that bit during the initial build.

---

## The project in one paragraph

A cloud web app that automates production of **BatchGeo keyword-grid citation maps** for BlackSwan Media's local-SEO clients. This is a *specific* kind of map — **not** a store locator. Each map plots ~50 pins of the **same** client business, jittered across random points inside the client's city, each pin titled with a unique long-tail keyword (`{service} {geo-modifier} {business-name}`). The map gets published to BatchGeo and the embed code is dropped onto the client's website. The app replaces the manual work of one employee.

---

## Where it lives

- **Path:** `C:\Users\bmsbr\Projects\Batch GEO Automation`
- **Repo:** git, branch `main`, no remote configured
- **State as of handoff:** clean working tree, 50 backend tests passing, frontend production build clean, ~20 commits total.

---

## Current state

| Area | Status |
|---|---|
| Generation engine (keywords → coords → 14-column CSV → description) | ✅ Working, 50 tests pass |
| Frontend (form, preview, result, recent maps) | ✅ Working, verified live |
| Manual-finish publish fallback | ✅ Working, verified live |
| Refresh persistence (sessionStorage restores screen + map) | ✅ Working, verified live |
| Auth — feature-flagged off by default | ✅ Working, verified live |
| **Automatic BatchGeo publishing** | ⚠ **Not verified** — Playwright selectors are placeholders, needs the owner's BatchGeo login + live testing |
| **Docker deployment** | ⚠ **Never actually built/run** — logically correct, untested |
| Anthropic API descriptions | ⚠ Falls back to a short built-in template until an API key is provided |

---

## How to run it

**Dev:**

```
cd backend
python -m pytest -q                   # 50 tests should pass
python -m uvicorn app.main:app --port 8000

cd frontend
npm run dev                            # serves at :5173, proxies /api → :8000
```

**Production:**

```
cp .env.example .env                   # then edit
docker compose up -d
```

**Login:** off by default (`AUTH_ENABLED=false`). To require the team login, set `AUTH_ENABLED=true` + `TEAM_PASSWORD=...` + `APP_SECRET=<long random string>` in `.env`. With `AUTH_ENABLED=true` and `ENVIRONMENT=production`, the app refuses to start if `APP_SECRET`/`TEAM_PASSWORD` are still default values (see `config.assert_production_secrets`).

---

## Architecture in 60 seconds

Monorepo. Single deployable. Tight scope.

**Backend** (`backend/app/`, Python 3.13 + FastAPI + Pydantic v2):

- `core/` — pure-Python generation engine, fully offline-testable:
  - `keywords.py` — combinatorial `services × geo-modifiers × landmarks`, business-name suffix, seeded sample.
  - `coordinates.py` — seeded uniform-random jitter inside a bounding box.
  - `geo.py` — Nominatim geocode (city → bbox) + Overpass landmarks. `httpx`, mocked in tests.
  - `description.py` — Claude API (`claude-sonnet-4-6`) + deterministic template fallback when no API key.
  - `csv_builder.py` — exact 14-column BatchGeo CSV.
  - `generator.py` — orchestrator: `generate_map(MapRequest) -> MapResult`.
- `publish/batchgeo.py` — Playwright publisher: **persistent non-headless Chrome profile** (`backend/app/data/bg-profile/`) + manual-finish fallback (raises `ManualFinishRequired` on any failure).
- `main.py` — FastAPI routes: `/api/login`, `/api/generate`, `/api/publish`, `/api/jobs/{id}`, `/api/maps`. Login rate-limited in-memory.
- `storage.py` — SQLite, **per-operation connections** (no shared mutable connection). DB path overridable via `DB_PATH`.
- `auth.py` — HMAC-signed token (`<base64-json>.<hex-hmac>`). `require_token` no-ops when `AUTH_ENABLED=false`.
- `jobs.py` — async publish-job state machine: `generating` → `publishing` → `done` / `needs_manual_finish` / `error`. Error messages sanitized before storage (full exception logged, generic message returned).
- `config.py` — pydantic-settings env config.

**Frontend** (`frontend/src/`, React 19 + Vite + Tailwind v4 + TypeScript):

- `App.tsx` — screen state machine (form/preview/result/recent) + `sessionStorage` restore (token + last screen + last `MapResult` + active job id; resumes job polling after refresh).
- `components/MapForm.tsx` — the client-input form with niche presets and inline validation.
- `components/MapPreview.tsx` — Leaflet preview map + keyword list + description with show-more.
- `components/ResultPanel.tsx` — embed code (success) or numbered manual-finish instructions + CSV copy + retry button.
- `components/RecentMaps.tsx` — list of saved maps from `GET /api/maps`.
- `components/LoginForm.tsx` — **dormant** under `AUTH_ENABLED=false`; nothing imports it currently.
- `api.ts` — typed API client, token persisted in `sessionStorage`.

**Deploy:** `Dockerfile.backend` (multi-stage, includes `xvfb`, entrypoint is `xvfb-run -a uvicorn ...`), `Dockerfile.frontend` (Vite build → nginx, proxies `/api` to backend), `docker-compose.yml` with named volumes for the SQLite DB and the persistent Chrome profile.

---

## What's outstanding (concrete next steps)

In priority order. All are genuine — there are no hidden bugs to chase; three audit passes (security, functional, UX) were completed and every Critical/Important finding was fixed.

### 1. Live BatchGeo selector capture (the biggest open item)

`backend/app/publish/batchgeo.py` contains CSS selectors marked `# ← VERIFY IN LIVE UI`. To turn automatic publishing from placeholder into working:

1. Have the owner log into BatchGeo **once** inside the persistent Chrome profile at `backend/app/data/bg-profile/`. This warms Cloudflare clearance cookies for that profile.
2. Walk the create-map flow live (paste CSV → Map Now → column-validation Continue → set title/slug/public → Save Map) and record the real DOM selectors and the post-publish map URL pattern.
3. Replace each `# ← VERIFY IN LIVE UI` selector in `publish_to_batchgeo()` and test end-to-end against a real map.

**Honest risk:** even with correct selectors, Cloudflare's managed challenge may still block automation. The manual-finish fallback exists precisely because this risk is real. If automation proves unreliable, ship with the fallback as the primary path — the app's value is mostly the generation engine + the spreadsheet output, not the click-automation.

### 2. First real `docker compose up`

`Dockerfile.backend`, `Dockerfile.frontend`, and `docker-compose.yml` are logically correct but have **never actually been built**. The first deploy is the moment of truth. Likely friction points: the `playwright install --with-deps chromium` step, the `xvfb-run` + `uvicorn` entrypoint, the SQLite/Chrome-profile volume mounts. Run `docker compose up -d` once on the VPS, then walk the app end-to-end to shake out anything subtle.

### 3. Anthropic API key wiring

Set `ANTHROPIC_API_KEY` in `.env`. The description model id in `backend/app/core/description.py` is `claude-sonnet-4-6` — verify it's a current (non-retired) model at the time you wire the key. Without the key the description silently falls back to a short deterministic template (~150 words instead of ~400).

---

## Working with this user

- **Bruno** (bruno@blackswanmedia.co), agency owner of BlackSwan Media. **NOT a hands-on coder.** Don't show him code. Frame technical choices as business outcomes, not implementation alternatives.
- Deliverables must be **cloud-hosted and usable by a non-technical team**. No CLI tools, no localhost-only setups, no "open this terminal and run that command" instructions.
- Values **security-first thinking** AND wanted this app open-access for now — both are true. The security review was completed before flipping to open access; the `AUTH_ENABLED` switch makes locking back down trivial.
- He likes thorough planning, intermediate check-ins, and being given clear choices (e.g. "fix all / critical only" with the recommended option clearly marked).
- Adjacent project context: he runs a fleet of 300+ WordPress sites via MainWP (see project memory `project_pageforge_fleet_rollout`). MainWP auto-embedding of generated maps is a deliberately-deferred Phase 2 idea.
- Another manual-task automation candidate exists: YouTube video silos done by a second employee. Not built. Has YouTube ToS risks + declining SEO ROI in 2026. Don't build without explicit go-ahead.

---

## Important gotchas (the things that bit during the initial build)

- **BatchGeo sits behind Cloudflare's managed challenge.** `curl` and headless Playwright are blocked outright. Only a real, persistent, non-headless Chrome profile with warm cookies passes — and that may still fail. This is the single largest technical risk in the project.
- **Headful Chrome in a Docker container needs Xvfb.** Without a virtual display every publish silently degrades to manual-finish. Recorded in [`docs/solutions/headful-playwright-in-docker-2026-05-21.md`](solutions/headful-playwright-in-docker-2026-05-21.md). The Dockerfile uses `xvfb-run -a uvicorn ...` as its CMD for this reason.
- **Test isolation matters.** `app.main` instantiates a `Storage` singleton at import time. `backend/tests/conftest.py` sets `DB_PATH` to a temp file **before** any `app.*` import to keep the test suite from writing into the real `backend/app/data/maps.db`. Don't bypass this in new test modules.
- **Vite dev proxy** is configured in `frontend/vite.config.ts` — local dev proxies `/api` to `:8000`. Production uses nginx. The frontend must never hard-code backend URLs.
- **Tokens are HMAC-signed, not JWT.** Format: `<base64-json>.<hex-hmac>`. See `backend/app/auth.py`.
- **`backend/app/data/bg-profile/`** is the persistent Chrome profile dir — git-ignored. Committing it would leak Cloudflare/BatchGeo cookies.
- **The 14-column BatchGeo CSV header order is exact:** `Address, City, State, Zipcode, Name, Phone Number, Group, URL, Email, Image, Social, Latitude, Longitude, Video`. Don't reorder.
- **The CSV `Address` column contains a `lat,lon` string** (not a street address). The blank `City`/`State`/`Zipcode` columns are intentional — BatchGeo geocodes from the coord-string `Address` plus the explicit `Latitude`/`Longitude` columns.
- **Pins are synthetic, not real locations.** ~50 random jittered points inside the city bounding box; the same NAP is repeated on every pin. This is the keyword-grid pattern, not a real multi-location business. Some keyword titles may repeat across the 50 — that matches the observed real-world pattern.
- **Auth tokens live in `sessionStorage`**, not `localStorage` — survives a refresh, clears on tab close. This was a deliberate choice during the UX pass; do not switch to localStorage without considering it.

---

## Pointers to other docs

- [`docs/plans/2026-05-21-batchgeo-map-generator.md`](plans/2026-05-21-batchgeo-map-generator.md) — full original implementation plan with decision rationale, file structure, and test scenarios for every task.
- [`docs/UX_REVIEW_NOTES.md`](UX_REVIEW_NOTES.md) — UX review report (every finding was fixed; the notes record the analysis).
- [`docs/solutions/headful-playwright-in-docker-2026-05-21.md`](solutions/headful-playwright-in-docker-2026-05-21.md) — the xvfb-in-container gotcha.
- [`README.md`](../README.md) — first-run setup instructions for an operator.
