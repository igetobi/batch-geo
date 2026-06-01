---
name: secure-sweep
description: >
  Comprehensive security audit that spawns specialist subagents in parallel to scan a codebase
  for vulnerabilities, generates a fix path for each finding, then runs a mission-integrity
  check to flag fixes that would break stated capabilities. ONE skill, three phases, report-only
  (does not auto-apply fixes). Use when the user asks for a security review, "find compromises",
  "audit for security risks", "is this safe to deploy", "scan for vulnerabilities", or before
  shipping anything to production. Triggers on `/secure-sweep`. Auto-detects stack (WordPress
  plugin, Python/FastAPI, Node/React, mixed) and dispatches appropriate specialists. Replaces
  the need to manually run wp-security-audit, /security-review, and a separate "will this break
  things" check.
---

# Secure Sweep — Multi-Agent Security Audit with Mission Integrity Check

## Mission

One invocation, three phases, one report. Spawns specialist subagents in parallel to cover the codebase's full security surface, then checks every proposed fix against the project's mission to flag fixes that would break stated capabilities. The user gets a tiered report of findings + fix paths + mission-conflict warnings.

## Hard rules (NON-NEGOTIABLE)

1. **REPORT ONLY.** Never auto-apply fixes. The output is a markdown report. The user decides what to apply.
2. **NO `git commit` / `git push` / destructive git ops.**
3. **NO file modifications outside the report file itself.**
4. **NO external network calls** except `gh api` for repo metadata if needed (already-authenticated).
5. **Subagents cannot write files** beyond returning their findings as text to the orchestrator.
6. **No invented findings.** Every finding must cite file:line. If you can't cite, drop it.
7. **No invented mission claims.** The mission integrity check reads MISSION.md / CLAUDE.md / README.md — does not infer capabilities the user didn't state.

## Phase 0: Stack detection

Identify what kind of codebase this is. Run in this order, stop at first match:

| Signal | Stack | Specialists to dispatch |
|---|---|---|
| `*.php` files + `wp-config` or `plugin-name.php` header | **WordPress plugin/theme** | A, B, C, D, E (see below) |
| `pyproject.toml` or `requirements.txt` + `from fastapi`/`from flask` in imports | **Python web (FastAPI/Flask)** | F, G, H, I, J |
| `package.json` + `react`/`next`/`vite` deps | **Node/React frontend** | K, L, M, N |
| `package.json` without web framework | **Node backend/CLI** | F, H, I, M, O |
| Mixed (multiple of above) | Run specialists for each stack present | union of relevant sets |

If no stack matches, STOP and ask user what to audit.

## Phase 1: Mission anchor (run BEFORE dispatching specialists)

Read these files (whichever exist) and extract STATED CAPABILITIES — things the code is supposed to do. The integrity check in Phase 5 compares fixes against this list.

- `CLAUDE.md` — definition of done, "what this is", "what this is NOT"
- `MISSION.md` — product mission
- `README.md` — user-facing capabilities, install instructions, public API
- Any `*_CONTRACT.md` or `*_SPEC.md` at project root

Write a brief "Mission Anchor" section to internal state (not the final report yet):

```
## Stated capabilities (must be preserved)
- <capability 1>: <where stated>
- <capability 2>: <where stated>
...

## Non-goals / forbidden actions
- <"what this is NOT" items>
```

If no mission file exists, STOP and ask the user for the project's purpose in one paragraph. Don't guess.

## Phase 2: Parallel specialist dispatch

Spawn the relevant specialists from the table below IN PARALLEL using the Agent tool. Each subagent receives:
- The project root path
- Their specialist scope (only their concern)
- The output format (see "Specialist output format" below)
- HARD RULE: return findings as text, do not write files, do not edit code

### Specialist roster

**WordPress specialists:**

- **A. nonce-and-capability** — `wp_verify_nonce`, `check_admin_referer`, `current_user_can` (with object ID), `permission_callback`. Flag missing nonces on state-changing handlers, `__return_true` on REST routes.
- **B. input-pipeline** — `wp_unslash` → sanitize → validate ordering. Flag missing unslash, wrong sanitizer, unsanitized `$_SERVER` headers.
- **C. output-escaping** — `esc_html` / `esc_attr` / `esc_url` / `wp_kses_post`. Flag `echo $foo;` of dynamic data without escaping.
- **D. sql-preparation** — `$wpdb->prepare`, `$wpdb->esc_like`. Flag direct interpolation in queries.
- **E. ajax-rest-files** — `wp_ajax_nopriv_*` exposure, `register_rest_route` permission callback, `move_uploaded_file`, path traversal in `include`/`require`.

**Python/FastAPI specialists:**

- **F. auth-and-authz** — JWT validation, OAuth flows, session management, missing auth dependencies on routes, role checks.
- **G. input-validation** — Pydantic completeness, `Field` constraints, custom validators, raw `request.json()` usage without schema.
- **H. secrets-and-config** — `os.environ.get('X', 'default')` fail-open patterns, hardcoded keys in code, debug mode in production, CORS `*`.
- **I. sql-injection** — Raw SQL with string concatenation, `f"SELECT ... {var}"`, unparameterized queries even in SQLAlchemy.
- **J. cors-csrf-headers** — CORS allowed_origins, CSRF tokens on state-changing routes, security headers (CSP, X-Frame-Options, HSTS).

**Node/React specialists:**

- **K. xss-and-injection** — `dangerouslySetInnerHTML`, `innerHTML`, eval, Function constructor, unsanitized template strings in JSX.
- **L. auth-and-token-storage** — JWT in localStorage (XSS-stealable), token expiry, refresh logic, OAuth redirect validation.
- **M. dep-and-supply-chain** — `npm audit` known vulns, deps with single maintainer, suspicious recent installs, lockfile freshness.
- **N. env-and-secrets** — `process.env` usage in client-side code (leaks to bundle), `.env` in repo, hardcoded API keys.

**Cross-stack:**

- **O. command-injection** — `exec` / `eval` / `subprocess.run(..., shell=True)` / `child_process.exec` with any user input.

### Specialist output format (each subagent returns this)

```
## Specialist: <name>
## Files scanned: <count>

### Findings

1. **<severity: CRITICAL | MAJOR | MINOR>** — <one-line issue>
   - File: <path:line>
   - Code (1-3 lines): `<actual code>`
   - Attack scenario: <how this gets exploited>
   - Suggested fix: <specific code change>
   - Confidence: <HIGH | MEDIUM | LOW>

2. ...

### What I did NOT find / could not check
- <gaps in this specialist's coverage>
```

## Phase 3: Aggregation

Collect all specialist reports. Deduplicate findings that multiple specialists flagged. Group by:
1. Severity (CRITICAL → MAJOR → MINOR)
2. Within severity, by file (cluster findings affecting the same file)

If two specialists conflict on the same line (one flags CRITICAL, another says fine), keep the CRITICAL and note the disagreement.

## Phase 4: Fix path generation

For each finding (already has a "Suggested fix" from the specialist), expand to a fix path:

```
## Fix path: <finding ID>

### Recommended fix
<code change, repo-relative file path, line numbers>

### Why this fix addresses the root cause
<one sentence>

### Implementation order
1. <step>
2. <step>

### Tests to add/verify
<which test would catch a regression of this finding>

### Estimated effort
<minutes / hours — be honest>
```

## Phase 5: Mission Integrity Check (the differentiator)

For EACH fix path, evaluate against the Mission Anchor from Phase 1:

```
For fix in all_fixes:
  For capability in stated_capabilities:
    Does this fix break, restrict, or alter this capability?
```

Outcomes:

- **OK** — Fix preserves all stated capabilities. Mark "Mission integrity: OK".
- **CONFLICT** — Fix would break a stated capability. Mark "Mission integrity: CONFLICT" and explain:
  - Which capability is affected
  - How the fix breaks it
  - Alternative fix that addresses the security finding without breaking the capability (if one exists)
- **UNKNOWN** — Mission file doesn't specify whether this is OK to break. Mark "Mission integrity: UNKNOWN" and ask the user to clarify.

Examples:

| Finding | Naïve fix | Mission integrity |
|---|---|---|
| `wp_ajax_nopriv_subscribe` exposed without auth | "Remove nopriv handler" | **CONFLICT** if README says "public newsletter signup is supported." Alternative: keep nopriv but add rate limiting + email validation + honeypot. |
| `/api/health` returns 200 with no auth | "Add auth to /api/health" | **CONFLICT** if CLAUDE.md says "load balancer health checks must work without credentials." Alternative: rate-limit /api/health or restrict to internal IP range. |
| `dangerouslySetInnerHTML` rendering user content | "Use textContent" | **CONFLICT** if README says "users can format posts with HTML." Alternative: sanitize with DOMPurify, allowlist tags. |

If a mission file doesn't exist, every fix gets "Mission integrity: UNKNOWN" — ask the user.

## Phase 6: Final report

Write the final report. Format:

```markdown
# Security Sweep Report — <project name>
## Date: <YYYY-MM-DD>
## Stack detected: <e.g. "WordPress plugin + minor JS">
## Specialists run: <list>
## Files scanned: <count>

## Mission Anchor
<copy of stated capabilities from Phase 1>

## Summary
- CRITICAL findings: <N>
- MAJOR findings: <N>
- MINOR findings: <N>
- Mission conflicts in proposed fixes: <N>

## CRITICAL (fix before deploy)

### CRIT-1: <issue>
- File: <path:line>
- Specialist: <which one found it>
- Code:
```<lang>
<actual code>
```
- Attack scenario: <how this gets exploited>
- Suggested fix:
```<lang>
<fix code>
```
- **Mission integrity: <OK | CONFLICT | UNKNOWN>**
  <if CONFLICT, explain + propose alternative>
- Tests to add: <description>
- Estimated effort: <time>

### CRIT-2: ...

## MAJOR (fix before next release)
<same format>

## MINOR (hardening, optional)
<same format>

## Cross-cutting patterns
<patterns that appear in multiple findings — e.g., "5 endpoints all missing rate limiting">

## What was NOT checked
- <each specialist's "did not find" notes consolidated>
- <gaps in this skill's coverage>

## Recommended action priority
1. Apply CRITICAL fixes with "Mission integrity: OK" first.
2. Resolve CRITICAL fixes with "Mission integrity: CONFLICT" — pick the alternative fix or accept the risk with documentation.
3. Schedule MAJOR fixes for the next milestone.
4. MINOR fixes when convenient.

## How to apply

This is a REPORT. To actually apply fixes, invoke `/fix-it-smart` for individual findings or `/audit-and-ship` to fix them as a batch with verification.
```

## When to use this skill vs others

| Situation | Skill |
|---|---|
| Whole-codebase security audit + fix recommendations + mission check | **secure-sweep** (this) |
| WordPress-specific check only | `wp-security-audit` (lighter, no parallelism) |
| Pre-deploy verification of pending changes | `/security-review` |
| One specific known bug | `/fix-it-smart` |
| General code review (not security-focused) | `requesting-code-review` |

`secure-sweep` is heavier than the others. Use it for:
- Pre-launch hardening sweeps
- Before installing a manager/controller plugin on top of an audited plugin
- Quarterly security reviews
- After a security incident, to find similar patterns

Do NOT use for:
- Routine commits (too heavy)
- Single-file changes (use the specific-purpose skills)
- Code review of a PR (`/review` or `requesting-code-review`)

## Anti-patterns

- ❌ Spawning specialists for stacks not present in the codebase
- ❌ Inventing findings without file:line citations
- ❌ Skipping the Mission Integrity check (Phase 5) to save time
- ❌ Marking everything "Mission integrity: OK" without actually checking
- ❌ Auto-applying any fix (this skill is report-only)
- ❌ Combining findings across files in one entry (each finding gets its own entry)

## Example invocation

```
/secure-sweep

Audit the pageforge plugin in projects/PageForge/ before I install the manager on blackswanmedia.co.
```

Or for a different project:

```
/secure-sweep

Audit the Mission Command FastAPI backend + Python daemon + React dashboard. Focus on the agent-to-dashboard auth path.
```

## Output location

The final report goes to `docs/security/sweep-<YYYY-MM-DD>.md` if the project has a `docs/` dir. Otherwise to project root as `SECURITY_SWEEP_<YYYY-MM-DD>.md`. ONE report per run — append a dated section if a prior sweep report exists for the same project (do not create a sibling file).
