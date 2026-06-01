# BatchGeo Keyword-Grid Map Generator

> **🤖 New here (operator or AI)? Start with [docs/HANDOFF.md](docs/HANDOFF.md)** — current state, what's outstanding, gotchas, and how to work with this project.

An internal web app that auto-generates "keyword-grid" local-SEO citation maps
for BatchGeo. A team member fills in a short form and clicks one button — the
app produces 50 geo-distributed keyword pins, builds the BatchGeo spreadsheet,
writes the description paragraph, publishes the map, and returns the embed code.

If the automatic BatchGeo publish step cannot complete (Cloudflare challenge,
UI change, etc.) the app hands the team the finished spreadsheet and clear
numbered instructions to finish manually — it never silently fails.

---

## Access mode

The app currently runs in **open-access mode** — no login screen is shown and
anyone who can reach the URL can use it.

To re-enable the team login, set `AUTH_ENABLED=true` in your `.env` file (or
as an environment variable) and restart the backend. When auth is on, users
must enter the `TEAM_USERNAME` / `TEAM_PASSWORD` credentials before accessing
the app.

---

## Quick start (Docker)

### 1. Copy and fill in the environment file

```bash
cp .env.example .env
```

Open `.env` in a text editor and set every value:

| Variable | What to set |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (for the description paragraph). Leave blank to use the template fallback. |
| `BATCHGEO_EMAIL` | The email address your team uses to log into BatchGeo. |
| `BATCHGEO_PASSWORD` | The BatchGeo account password. |
| `APP_SECRET` | A long random string — used to sign session tokens. Generate one with: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `TEAM_USERNAME` | The username your team uses to log into this app (default: `team`). |
| `TEAM_PASSWORD` | A strong password for the team login. |
| `NOMINATIM_USER_AGENT` | Leave as-is (identifies your app to OpenStreetMap). |

### 2. Build and start

```bash
docker compose up -d
```

The first build takes a few minutes (downloads Chromium for Playwright).
Subsequent starts are fast.

### 3. Open the app

Navigate to `http://your-server-ip` (or `http://localhost` if running locally).

---

## Required first-run step: warm up the BatchGeo browser profile

The automatic publish step uses a persistent real-browser Chrome profile to
pass BatchGeo's Cloudflare managed challenge. You must log into BatchGeo
manually **once** inside that profile to store warm Cloudflare clearance cookies.

**How to do it:**

1. On the server (or your local machine if testing), open a terminal inside the
   running backend container:

   ```bash
   docker compose exec backend bash
   ```

2. Launch Playwright's Chromium with the persistent profile:

   ```bash
   python - <<'EOF'
   import asyncio
   from playwright.async_api import async_playwright

   async def warm():
       async with async_playwright() as pw:
           ctx = await pw.chromium.launch_persistent_context(
               "/app/app/data/bg-profile",
               headless=False,
           )
           page = await ctx.new_page()
           await page.goto("https://batchgeo.com/")
           print("Browser open — log in and then press Enter here.")
           input()
           await ctx.close()

   asyncio.run(warm())
   EOF
   ```

   > **Note:** `headless=False` requires a display. On a headless VPS, use
   > X11 forwarding (`ssh -X`) or run this step locally and copy the profile
   > directory to the server's `chrome_profile` Docker volume.

3. In the browser window that opens, log into BatchGeo with your team
   credentials. Cloudflare will issue clearance cookies to the profile.

4. Press Enter in the terminal to close the browser. The profile (and its
   cookies) are now stored in the `chrome_profile` Docker volume and will be
   used for all future automatic publishes.

You only need to repeat this step if Cloudflare invalidates the session
(typically every few weeks).

---

## End-to-end verification

After setup, run through this checklist at least once with a real client:

1. Open the app and log in.
2. Fill the form (use the Sterling Heights cabinets example as a test).
3. Click **Generate Map** — confirm 50 pins appear on the preview map and the
   keyword titles look correct.
4. Download/copy the CSV — open it and confirm the 14-column header and
   `Address` column contains `lat,lon` strings.
5. Click **Publish to BatchGeo**.
   - **Success:** a real `batchgeo.com/map/…` URL appears. Open it and confirm
     50 pins render.
   - **Manual-finish fallback:** the Result panel shows the CSV and numbered
     steps (not a raw error). Follow the steps to publish manually.
6. Paste the embed code into a scratch HTML file and confirm the map renders.

**The product is not considered fully verified until step 5's success path has
been demonstrated at least once with the owner's real BatchGeo account, OR the
owner has explicitly accepted the manual-finish fallback as the interim default.**

---

## Development (without Docker)

### Backend

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

Run tests:

```bash
cd backend
pytest -v
```

### Frontend

```bash
cd frontend
npm install
npm run dev       # dev server on http://localhost:5173
npm run build     # production build
```

`vite.config.ts` already includes a `/api` proxy pointing at `http://localhost:8000`.
Local development works once both servers are running — no manual proxy configuration
is required.

---

## Architecture

```
frontend/          React + Vite + Tailwind v4 — the team-facing UI
backend/
  app/
    core/          Pure-Python generation engine (keywords, coords, CSV, description)
    publish/       Playwright BatchGeo publisher + manual-finish fallback
    main.py        FastAPI routes
    auth.py        HMAC-signed session tokens
    storage.py     SQLite (maps, jobs)
    jobs.py        Async background publish runner
```

Key design decisions:

- **Generation is synchronous and fast** (keywords, coordinates, CSV, description
  via Claude API). The `/api/generate` call returns in ~5–15 seconds.
- **Publishing is async** — `/api/publish` starts a background job and returns
  a `job_id`. The frontend polls `/api/jobs/{id}` every 2 seconds until the job
  reaches a terminal state (`done`, `needs_manual_finish`, or `error`).
- **Manual-finish fallback** — if the Playwright publish flow fails for any
  reason, the job moves to `needs_manual_finish` and the result panel shows the
  finished CSV + plain-English instructions. The team is never left with a raw
  error.
- **SQLite storage** — volume is a few maps/day. No separate database server.
- **Persistent real-browser profile** — BatchGeo is protected by Cloudflare's
  managed challenge. A persistent profile with warm cookies bypasses it without
  headless detection.

---

## Security notes

- `.env` is git-ignored. Never commit it.
- The session token is HMAC-signed (not JWT); the secret is `APP_SECRET`.
- The app is intended for a small trusted internal team. There is no per-user
  roles system.
- The BatchGeo automation is against BatchGeo's Terms of Service. Automation
  is kept gentle (one map at a time, human-like pacing) to reduce ban risk. The
  owner accepted this risk on 2026-05-21.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Every publish ends in `needs_manual_finish` | The BatchGeo browser profile needs a warm-up (see above), or the live UI selectors have changed. Check `backend/app/publish/batchgeo.py` — all lines marked `# ← VERIFY IN LIVE UI` may need updating. |
| `geocode_city` raises `ValueError: City not found` | The city name is ambiguous or not in Nominatim. Set `bounding_box` manually in the form (currently requires editing the request JSON; a UI override field can be added). |
| Description falls back to template | `ANTHROPIC_API_KEY` is not set or the Claude API is unreachable. Set the key in `.env` and restart. |
| Docker build fails on `playwright install chromium` | Ensure the server has internet access during build. Chromium download is ~150 MB. |
