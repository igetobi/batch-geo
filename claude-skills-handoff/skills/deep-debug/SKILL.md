---
name: deep-debug
description: >
  Multi-pass codebase audit and tiered fix execution. Use ONLY for whole-project audits
  ("deep debug", "audit this project", "review this entire codebase"). DO NOT USE for:
  single bugs, test failures, one-file issues, or "this isn't working" — those go to
  `systematic-debugging`. DO NOT USE for code review of a PR/branch — use `requesting-code-review`
  or `/review`. The test: if you can name the broken file in one sentence, this is the wrong skill.
---

# Deep Debug — Code Audit & Fix System

Two phases: **Audit** (find problems) → **Execute** (fix them in controlled tiers).

---

## Step 0: Triage

Classify the request:

**Mode A — Targeted Fix** ("this button is broken", "fix the login")
1. Locate the relevant code
2. Diagnose root cause
3. Propose fix, get approval
4. Apply, verify, check for collateral damage
5. Log what you changed in `DEEP_DEBUG_CHANGELOG.md`
6. If you noticed deeper issues while diagnosing, mention them and offer to escalate
   to Mode B or C.

**Mode B — Scoped Review** ("review this file", "audit the auth module")
Run Phase 1 passes on the specified scope only. Skip inapplicable passes.

**Mode C — Full Codebase Audit** ("deep debug", "audit the whole thing")
Run the complete Phase 1 + Phase 2 pipeline.

**Mode D — Bring Your Own Findings** ("here's what's broken, just fix it")
Skip Phase 1. Organize user's findings into tiers. Go straight to Phase 2.

Ambiguous? Ask: "Specific fix, scoped review, or full codebase audit?"

---

## Step 0.5: Environment Scan

Run these checks, one line each, move on:
- **Language/framework** (determines what to look for in each pass)
- **Project size**: Count source files for the detected language. Use this to calibrate
  reading depth in Step 1.
- **Tests?** Check for test dirs, configs, scripts
- **Git?** Determines branch safety

---

## Step 1: Code Reading Strategy

This is how you actually look at the code. Do NOT read every file — that burns context.

**For Mode B (scoped):** Read only the specified files + their direct imports (1 level deep).

**For Mode C (full audit):**
1. Read project structure (`find . -type f | head -100` or `tree -L 3`)
2. Read entry points first: main/index files, app bootstrap, route definitions
3. Follow critical imports 2 levels deep from entry points
4. Use `grep -r` to scan for patterns across the full codebase without reading full files
   (e.g., `grep -rn "catch" --include="*.js"` to find error handling patterns)
5. **Hard limit: read ~15-20 files into full context for a full audit.** Prioritize by:
   entry points > core business logic > API routes > data models > utilities
6. For files you don't fully read, grep-scan for the patterns each pass cares about

This strategy prevents context exhaustion while catching issues across the codebase.

---

# PHASE 1: AUDIT

Run passes sequentially. Complete each fully before the next.

**Write findings to `DEEP_DEBUG_NOTES.md` as you complete each pass.** Do not rely on
conversation context alone — early findings will be lost to context truncation on
large audits. Append each pass, read it back during Pass 6.

### Finding Format (ALL passes)

```
- **[file:line]** Severity: [Critical/High/Medium/Low] | Confidence: [High/Med/Low]
  What: [the issue]
  Impact: [what goes wrong]
  Fix: [concrete action]
```

---

## Pass 1: Bugs — Things That Are Broken

Focus: Code that crashes, produces wrong results, or creates security holes.

Look for:
- Logic errors, off-by-one, race conditions, null/undefined access
- Missing error handling (uncaught promises, empty catch, no null checks)
- Resource leaks (unclosed connections, missing cleanup, listener leaks)
- Type mismatches, unsafe coercion
- Security: injection vectors, exposed secrets, unsafe deserialization
- Copy-paste errors (duplicated logic with subtle drift)

Append findings to `DEEP_DEBUG_NOTES.md`.

---

## Pass 2: Functionality — Does It Do What It Should?

Focus: Trace intended behavior, find where it breaks down.

1. Identify the software's purpose (README, comments, file names, or ask)
2. Trace primary user flows end-to-end
3. Find: partially implemented features, edge case failures, missing validation,
   incorrect business logic, broken integrations, silent failures

Append findings to `DEEP_DEBUG_NOTES.md`.

---

## Pass 3: Usability

Always run this pass — adapt the lens to what you're looking at:

- **UI/CLI apps**: intuitive flow, loading states, error messages, form validation,
  accessibility, mobile responsiveness, destructive action confirmation
- **Libraries/APIs/backends**: developer experience — intuitive API surface, helpful
  errors, sensible defaults, adequate docs for public interfaces
- **Pure config/infra**: skip this pass

Append findings to `DEEP_DEBUG_NOTES.md`.

---

## Pass 4: Code Quality — Works But Messy

Distinct from Pass 1: Pass 1 = *broken*. Pass 4 = *works but shouldn't look like this*.

Look for: dead code, unused imports, repeated patterns needing extraction, oversized
functions (>40 lines), poor naming, outdated/unnecessary dependencies, inconsistent
patterns, hardcoded values, missing/misleading comments.

Append findings to `DEEP_DEBUG_NOTES.md`.

---

## Pass 5: Improvements

What would make this meaningfully better — not just cleaner, but more capable/robust?

Consider: performance (caching, lazy loading, debouncing), error recovery (retry,
graceful degradation), logging/observability, testing gaps, security hardening,
architecture (coupling, separation of concerns, scalability).

Rank by **impact vs effort**. Don't pad the list.

Append findings to `DEEP_DEBUG_NOTES.md`.

---

## Pass 6: Synthesis & Report

Read back `DEEP_DEBUG_NOTES.md`. Compile into:

```
# Deep Debug Report: [Project Name]
## Scope: [what was audited] | Date: [date]

## Executive Summary
[2-3 sentences: health assessment, biggest risk, top priority]

## Critical Issues (fix immediately)
[Critical + High severity from all passes]

## Quick Wins (high impact, low effort, <30 min each)

## Improvement Roadmap
### Short-term (this sprint)
### Medium-term (next 2-4 weeks)
### Long-term (architectural)

## Full Findings
[Include sections only for passes that were run]
### Bugs (Pass 1)
### Functionality (Pass 2)
### Usability (Pass 3)
### Code Quality (Pass 4)
### Improvements (Pass 5)

## Summary: X total (X critical, X high, X medium, X low)
```

Rules:
1. Lead with what matters most
2. Every finding has a concrete action
3. Group related findings across passes
4. If the code is solid, say so — don't manufacture issues
5. Be direct: "This will crash when X" not "There may be potential concerns"
6. Omit sections for passes that were skipped

---

# PHASE 2: EXECUTION ENGINE

Present the report, then ask:

> "How do you want to proceed?
> 1. **Fix everything** — all tiers, in order
> 2. **Critical only** — Tier 1 + any Critical-severity items from other tiers
> 3. **Let me pick** — I'll list all findings numbered, you tell me which ones
> 4. **Review first** — let's discuss before I touch anything"

**Wait for the answer. Do NOT start fixing without approval.**

**Git safety**: If git is initialized, create branch `deep-debug/fixes` before starting.
Commit after each tier.

---

## Execution Tiers

Strict order. Complete and verify each before starting the next.
**Cross-tier rules (bottom of this section) override all tier-specific rules.**

### Tier 1: Critical Fixes (It Stops Crashing)

Fix: Critical/High bugs, broken flows, crashes, security holes.
Cross-tier rules apply.

1. One fix at a time. Verify after each.
2. Assess blast radius before touching shared code.
3. Log each fix in changelog.
4. Uncertain? Flag for user — don't guess.
5. After fixing, re-read changed code to confirm correctness.

**Checkpoint**: What was fixed, what was flagged, test results. "Ready for Tier 2?"

---

### Tier 2: Functional Completeness (It Works)

Fix: Half-built features, missing validation, silent failures, broken integrations.
Cross-tier rules apply.

1. Trace each broken flow end-to-end before writing any fix.
2. Unclear intent on half-built feature? Ask: complete or remove?
3. Silent failures → loud, actionable error messages.
4. Verify external APIs before "fixing" integrations.
5. Minimal new code — make existing things work, don't add things.

**Checkpoint**: Summary presented. "Ready for Tier 3?"

---

### Tier 3: Usability (It's Easy to Use)

Fix: Loading states, error messages, form validation, confirmations, accessibility.
Cross-tier rules apply.

1. Fix friction within existing design — don't redesign.
2. Primary user flow first.
3. Lightweight — no new deps for a spinner.
4. Larger design changes → recommendation, not implementation.

**Checkpoint**: Summary presented. "Ready for Tier 4?"

---

### Tier 4: Code Quality (It's Clean)

Fix: Dead code, extract utilities, break up large functions, naming, style, deps.
Cross-tier rules apply.

1. **Most dangerous tier.** Extreme caution.
2. One refactor at a time. Verify all callers after each.
3. Extract with identical interfaces — don't "improve" during extraction.
4. Project-wide search on every rename.
5. Tests after EVERY refactor.
6. Touching >5 files? Pause, confirm with user.
7. Never refactor AND change behavior in the same step.

**Checkpoint**: Summary presented. **Default stopping point** unless user wants upgrades.

---

### Tier 5: Upgrades (It's Better)

Add: Performance, retry logic, logging, tests, config, security hardening.
Cross-tier rules apply.

1. Each upgrade is self-contained.
2. Tests for new functionality.
3. Performance changes must not alter behavior.
4. Present each individually with tradeoffs.

**Checkpoint**: Summary presented. "Want Tier 6?"

---

### Tier 6: Architecture (It Scales)

Address: Decoupling, separation of concerns, state, queries, API consistency.
Cross-tier rules apply.

1. **Explicit approval per change.** Present plan, affected files, risk.
2. Incremental, not big-bang.
3. Every change leaves code working.
4. >30 min of changes → break into stages.
5. Often better as a plan than executed code — ask the user.

**Final Checkpoint**: Complete summary across all tiers.

---

## Post-Execution Verification

After the final approved tier completes:
1. Run the full test suite (if tests exist)
2. Re-read all files listed in `DEEP_DEBUG_CHANGELOG.md`
3. Check for cross-tier regressions (did a Tier 4 refactor break a Tier 1 fix?)
4. Present final verification results to the user

---

## Cross-Tier Rules (Override All Tier Rules)

1. **One fix at a time.** Fix, verify, next.
2. **Track everything** in the changelog.
3. **Test after every fix.** Run tests or trace affected paths.
4. **Uncertain? Ask.** Don't guess at intent.
5. **Preserve behavior** unless explicitly fixing behavior.
6. **Stop if it cascades.** 10+ files or unexpected test failures → STOP, present,
   let user decide.

---

## Progress Tracking

Maintain a TodoList adapted to the approved mode:

```
[x] Step 0: Triage — Mode: [A/B/C/D]
[x] Step 0.5: Env — [lang], [size], [tests: y/n], [git: y/n]
[x] Step 1: Reading strategy set

Phase 1: Audit
  [x] Pass 1: Bugs
  [x] Pass 2: Functionality
  [x] Pass 3: Usability
  [x] Pass 4: Code Quality
  [x] Pass 5: Improvements
  [x] Pass 6: Report presented

Phase 2: Execution — Mode: [fix all / critical / cherry-pick]
  [ ] Tier 1: Critical Fixes → Checkpoint
  [ ] Tier 2: Functional → Checkpoint
  [ ] Tier 3: Usability → Checkpoint
  [ ] Tier 4: Code Quality → Checkpoint (default stop)
  [ ] Tier 5: Upgrades → Checkpoint
  [ ] Tier 6: Architecture → Final checkpoint
  [ ] Post-execution verification
```

Only show tiers the user approved.

---

## Changelog

Maintain `DEEP_DEBUG_CHANGELOG.md` in the project root (or working directory if root
is read-only):

```markdown
# Deep Debug Changelog — [Project Name]
## Date: [date] | Mode: [full/critical/cherry-pick/targeted]

### Tier 1: Critical Fixes
- **[file.js:42]** Fixed null crash on undefined user data
  - Was: `user.name.toLowerCase()` — no null check
  - Now: `user?.name?.toLowerCase() ?? 'unknown'`

### Tier 2: Functional Completeness
- **[api/auth.js]** Login failed silently on expired tokens
  - Added expiry check + redirect with error message
```

This is your deliverable. Present it at the end.
