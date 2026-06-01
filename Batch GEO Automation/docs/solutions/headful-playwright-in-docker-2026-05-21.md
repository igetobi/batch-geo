# Headful Playwright in Docker — Solution Notes

**Date:** 2026-05-21
**Symptom:** Every `/api/publish` job silently falls back to `needs_manual_finish`
when running inside the Docker container, even when the BatchGeo browser profile
is warmed up and the selectors are correct.

**Root cause:** `backend/app/publish/batchgeo.py` launches Playwright's Chromium
with `headless=False`. A headless Docker container has no X11 display server.
Chromium immediately aborts when it cannot connect to a display, which is caught
by the outer `except Exception` handler and re-raised as `ManualFinishRequired`.
The traceback is logged but the team sees only the fallback panel — there is no
obvious error in the UI.

**Fix:** Install `xvfb` (X Virtual Framebuffer) in the runtime image and wrap the
uvicorn process with `xvfb-run -a` in the container entrypoint:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends xvfb \
    && rm -rf /var/lib/apt/lists/*

CMD ["xvfb-run", "-a", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

`xvfb-run -a` auto-selects a free display number, sets `$DISPLAY`, and starts an
Xvfb server that lives for the lifetime of the child process (uvicorn). The
Playwright browser launched by background tasks inside uvicorn inherits `$DISPLAY`
and renders to the virtual framebuffer — no physical screen required.

**Files changed:** `Dockerfile.backend`
