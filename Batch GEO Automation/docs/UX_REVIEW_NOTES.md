# UX Review Notes — BatchGeo Keyword-Grid Map Generator

Reviewer: Claude · Date: 2026-05-21
Surface: the full web app (Login → Map Form → Map Preview → Result), for a non-technical team.

## Running findings

### Login screen
- Clean, centered card, logo, clear title + "Sign in to your team account". Good first impression.
- Minor: the password field's placeholder renders as bullet dots (•••••••) — at a glance it looks like a pre-filled password. A plain hint or empty placeholder would be clearer.
- Minor: username placeholder is literally `team` (the real username) — doubles as a helpful hint for the team, acceptable.
- Minor: no show/hide password toggle.

### Map Form screen
- Well organised: "Client Information", "Services", "Local Landmarks", "Map Settings" sections; required fields marked with a red asterisk; helpful example placeholders; niche-preset dropdown auto-fills services. Good.
- Empty-submit triggers the browser's native HTML5 validation ("Please fill out this field" tooltip) and scrolls to the first empty field. Works, but native tooltips are visually plain vs. the otherwise-polished UI.

### Map Preview screen
- Excellent at rest: "Map Preview" title, a clear subtitle ("50 keyword pins generated for … in …"), three stat cards (Pins / Services / Landmarks), a real Leaflet map with all 50 pins, a numbered keyword-titles list, the generated description, and a prominent "Publish to BatchGeo" button. "Back to form" navigation present.
- **[Medium] Visual bug — map overlaps the sticky header on scroll.** The sticky top header has `z-index: 50`; Leaflet's map panes use `z-index: 400`. When the page is scrolled so the map passes beneath the header, the map renders *on top of* the header (pins and the Leaflet attribution bleed over the title bar). Fix: raise the header's z-index above Leaflet's controls (`z-index: 1000+`).
- Minor: the generated description is clamped to ~4 lines with an ellipsis and there is no "show full text" control — the user cannot read the whole paragraph from the preview.

### Publish flow
- Good feedback while publishing: the button becomes disabled, shows a spinner, and its label changes to "Publishing to BatchGeo — this can take 1–3 minutes". The user is not left guessing.

### State persistence
- **[High] A page refresh destroys everything.** The auth token is held only in a JavaScript variable in memory (`api.ts`), and the generated map lives only in React state. Refreshing the page (or an accidental browser reload) logs the user out completely AND discards the generated 50-pin map, forcing a fresh login + re-filling the whole form. There is no URL state, no localStorage, no server-side draft. For a non-technical team this is a real risk.

### Result screen (manual-finish path)
- Well done: a friendly amber warning icon, a clear headline "Manual Finish Required", a reassuring plain-English explanation ("…your spreadsheet is ready to go"), numbered steps, the CSV in a copy box with a "Copy all" button, and a "Generate another map" button. Not a scary error — good for a non-technical user.
- Minor: no "try the automatic publish again" button — if the fallback was caused by a transient glitch, the only options are finishing by hand or regenerating from scratch.
- The success-path result (embed code) was not visually verified — it requires a live BatchGeo publish (user credentials).

### State persistence — CONFIRMED
- Reloading the page returned straight to the Login screen. A refresh logs the user out and discards the generated map. Confirmed.

---

# UX Review Report — BatchGeo Map Generator

## Summary
The app is genuinely well-built and pleasant to use — clean visual design, clear labels, niche presets, good loading feedback, and a friendly fallback screen. No critical defects. The two issues worth fixing are a refresh wiping the user's session + work, and a z-index bug where the map overlaps the header on scroll. Everything else is polish.

## Critical Issues
None. The primary task (generate a map) completes cleanly and nothing gets stuck.

## High Priority
- **Refresh destroys session and generated map.** Auth token lives only in a JS variable; the generated map lives only in React state. An accidental reload = full logout + lost map + re-fill the whole form. Fix: persist the token in `sessionStorage` (or `localStorage`), and keep the last generated map result so a reload restores the screen.

## Medium Priority
- **Map overlaps the sticky header on scroll.** Header `z-index: 50`, Leaflet panes `z-index: 400`. Fix: raise the header to `z-index: 1000+`.

## Low Priority (polish)
- Password field placeholder renders as bullet dots — looks pre-filled. Use a plain/empty placeholder.
- Generated description is clamped to ~4 lines with no "show full text" control.
- Empty-form submit uses plain native browser validation tooltips, inconsistent with the otherwise-polished UI.
- No show/hide password toggle on login.
- Manual-finish screen has no "try automatic publish again" button.

## Quality of Life Upgrades
- **Saved-maps / history view (Med impact, Med effort).** The backend already stores every map and exposes `GET /api/maps`, but the UI has no screen to list or reopen past maps — the data exists with no way to see it. A "Recent maps" list would let the team retrieve prior work.
- **Client templates / remember last client (Med impact, Low-Med effort).** Re-typing full client NAP details for every map is repetitive; saving client profiles would speed up repeat work.
- **Persist in-progress form (Low-Med impact).** Pairs with the refresh fix — keep form input so a reload doesn't lose a half-filled form.

## State Persistence Checklist
- Login/session survives refresh? ❌ (in-memory token)
- Generated map survives refresh? ❌ (React state only)
- In-progress form survives refresh? ❌
- Publish job survives refresh? ❌ on the client (though the job continues server-side and is in the DB — just not re-attached to the UI)
- Saved maps retrievable in UI? ❌ (no screen, despite backend support)

