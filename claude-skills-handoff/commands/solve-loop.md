---
description: Autonomous problem-solving loop — generate hypotheses, test them, iterate until ONE specific problem is verifiably solved. Working tree only, never commits or pushes.
argument-hint: "<problem statement + verifier + prior attempts + duration you're away>"
---

# Solve-Loop

The user has ONE specific problem. They want autonomous iteration until it's solved. Activate the `solve-loop` skill on:

$ARGUMENTS

## Activate the solve-loop skill

Use the `solve-loop` skill. Follow its phases exactly:

1. **Phase 0: Anchor the run** — Read CLAUDE.md and the user's problem statement. Write `SOLVE_STATE.md` at project root with the problem, verifier, desired state, prior attempts, and budget.

2. **Phase 1: Structured analysis** (iteration 1 only) — three alternative readings of the problem, root cause hypothesis, falsifiable predictions, 2-4 ranked hypotheses.

3. **Phase 2-3 loop:** Try top hypothesis → run verifier → check if THE problem is solved.

4. **Phase 4 or 5:** Terminate on success, budget exhausted, loop detected, or hypotheses exhausted.

## HARD SAFETY RULES (NON-NEGOTIABLE)

- **NO `git commit`** — working tree only
- **NO `git push`** — never contact remote
- **NO destructive git ops** (reset --hard, branch -D, etc.)
- **NO production deploys, CI triggers**
- **NO credential-requiring external calls** not already configured
- **NO process killing** beyond your own
- **NO package downgrades or removals**
- **NO modifying the verifier to make it pass**
- **NO editing the problem statement mid-run**
- **NO expanding scope beyond THE problem**

## Default budget

- Max iterations: 7
- Max wall-clock: 3 hours
- Same hypothesis variation 3x in a row: STOP, loop detected

User can override: "budget 10 iterations" or "until 8pm".

## Required inputs

Confirm before Phase 0:

1. **Problem statement** — what's observable
2. **Verifier** — the exact runnable command that proves solved
3. **Desired state** — what the verifier should output when solved
4. **Prior attempts** (if any) — so we don't repeat

If any are missing, STOP and ask the user. Do not invent.

## What the user comes back to

1. `SOLVE_DONE.md` or `SOLVE_BLOCKED.md` at project root — one-page summary
2. `SOLVE_LOG.md` — iteration-by-iteration detail
3. `git status` — uncommitted changes ready to review
4. `git diff` — the actual edits
5. Verifier output captured (passing if DONE, current state if BLOCKED)

User reviews diff, commits what they want. solve-loop does not commit.

## Anti-patterns

- ❌ Trying the same hypothesis with minor variations — that's one hypothesis
- ❌ Modifying the verifier when the change doesn't solve the problem
- ❌ Silently expanding scope to fix nearby issues
- ❌ Committing mid-run "for safety"
- ❌ Continuing past budget on "almost there"
- ❌ Editing the problem statement mid-run

Begin Phase 0 now.
