---
description: Fix a single known bug with root-cause discipline and verification. For when you can name the broken file in one sentence.
argument-hint: "<bug description — what's broken, where, how it manifests>"
---

# Fix It Smart

Execute the **fix-it-smart** workflow for:

$ARGUMENTS

## The chain

1. **`systematic-debugging`** — find ROOT CAUSE before any code change. No guesses, no shotgun fixes. Required questions answered first:
   - What's the exact symptom (error message, observed behavior)?
   - What's the minimal reproduction?
   - What's the root cause (the decision or invariant that's wrong, not just "the value was wrong")?
   - What's the smallest change that addresses the root cause?

2. **Implement the fix.** Smallest change possible. No bundled refactors.

3. **`verification-before-completion`** — prove the fix works:
   - The reproducing case now passes
   - The full test suite still passes (no regression)
   - The fix is what we said the fix would be (not silently extended)

4. **`compound-document`** — if the root cause was non-obvious (took >30 min to find), write the solution doc. Skip for trivial typos.

## Gates

- After root-cause identification: user can sanity-check the diagnosis before fix is written
- After fix: verification output shown, not summarized
- Before claiming done: regression check passed

## Anti-patterns

- ❌ "I think the issue is X" without confirming — guess fixes mask root causes
- ❌ Bundled fixes that change more than the bug requires
- ❌ Skipping the regression check
- ❌ Skipping compound-document on a non-trivial fix (the v5 lesson)
- ❌ Modifying the failing test to make it pass — same rule as goal-it and autopilot

Begin with systematic-debugging.
