---
description: Whole-codebase audit, then fix what's broken — with root-cause discipline, verification, and one doc per non-trivial fix.
argument-hint: "<what to audit — project name, directory, or 'this project'>"
---

# Audit and Ship

Execute the **audit-and-ship** workflow chain for:

$ARGUMENTS

## The chain

1. **`deep-debug`** — whole-project audit. Surface findings in tiers: critical (blocks deploy), major (should fix), minor (cosmetic). Use the project's CLAUDE.md mission as the lens — what would make this fail to ship?

2. **PAUSE** — show the tiered findings list. User decides which tiers to fix in this pass.

3. **For each critical/major finding selected:**
   - `systematic-debugging` — root cause before any code change. No symptom-fixes.
   - Implement the fix
   - `verification-before-completion` — prove the fix runs, prove nothing else regressed

4. **`compound-document`** — for each non-trivial fix, one solution doc at `docs/solutions/<problem>-<date>.md`. Skip trivial fixes.

## Gates

- After audit: user picks which tiers to address (not all by default)
- After each fix: regression check on the rest of the codebase
- Before claiming done: full test suite passes

## Anti-patterns

- ❌ Auto-fixing everything the audit finds — user picks scope
- ❌ Symptom fixes that don't address root cause
- ❌ Skipping the regression check (a fix that breaks something else is not a fix)
- ❌ One mega-doc covering 10 fixes — one doc per non-trivial fix, not bundled

Begin with deep-debug.
