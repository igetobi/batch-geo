---
description: Verify a codebase is safe to deploy or layer something on top of. REPORT-ONLY by default — does not auto-fix.
argument-hint: "<what to check — project name, plugin, branch, or 'this codebase'>"
---

# Pre-Deploy Check

Execute the **pre-deploy check** workflow for:

$ARGUMENTS

## The chain

1. **`deep-debug`** — find anything broken or unintended. Tier the findings: critical (blocks deploy), major (should-fix-before-deploy), minor (cosmetic).

2. **`/security-review`** — security audit of the deploy-exposed surface. Especially important for plugins, public APIs, user-facing components, anything that controls or is controlled by other systems.

3. **`verification-before-completion`** — run the code path that will be deployed. Confirm the happy path works.

## REPORT ONLY — do not fix unless instructed

This chain produces a deploy-readiness report. It does NOT auto-fix findings.

The user reads the report and decides:
- Ship as-is (if findings are acceptable)
- Address specific findings first (re-invoke `/audit-and-ship` for those)
- Halt the deploy

## Report format

```
# Pre-Deploy Check — <target>
## Date: <YYYY-MM-DD>

## Critical (blocks deploy)
- <finding>: <one-line description>
  - File: <path:line>
  - Why critical: <reason>
  - Fix: <recommendation, not implementation>

## Major (should fix)
- ...

## Minor (cosmetic, optional)
- ...

## Security
- Surface exposed: <what's reachable>
- Vulnerabilities found: <list with severity>
- Recommended hardening: <list>

## Verification
- Happy path: <command run, exit status, output excerpt>
- Edge cases tested: <list>
- Edge cases NOT tested: <list — call out gaps>

## Recommendation
[ ] Safe to deploy as-is
[X] Fix critical findings first, then re-check
[ ] Halt — too many unknowns

## What to fix first if any
1. ...
2. ...
```

## Anti-patterns

- ❌ Auto-fixing during a pre-deploy check (silently fixes hide problems — user needs to see them)
- ❌ Glossing over security findings as "minor"
- ❌ Skipping verification because "deep-debug already covered it" — deep-debug audits static code, verification runs it
- ❌ Recommending "safe to deploy" when there are unaddressed criticals

If the user says "and fix what you find" explicitly, then chain into `audit-and-ship` after the report. Otherwise, stop at the report.

Begin with deep-debug.
