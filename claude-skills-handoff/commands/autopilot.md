---
description: Autonomous self-improvement loop — edits files, runs tests, dispatches subagents, iterates against the mission's Definition of Done. NEVER commits or pushes. User returns to working-tree diff + status report.
argument-hint: "<what to ship + how long you'll be away — e.g. 'BSM SEO Wave 0, I'll be back at 6pm'>"
---

# Autopilot

The user is stepping away. Run the **autopilot** skill on:

$ARGUMENTS

## Activate the autopilot skill

Use the `autopilot` skill. Follow its phases exactly:

1. **Phase 0: Context Capture** — Read CLAUDE.md, MISSION.md, current state. Write `AUTOPILOT_STATE.md` at project root with: mission, Definition of Done, current state, iteration budget, your interpretation of what the user wants.

2. **Phase 1-5 loop** — pick one unit per iteration, execute, verify, sanity-check against the mission, check Definition of Done.

3. **Termination** — when DoD met OR budget exhausted OR loop detected OR blocker hit, stop and write `AUTOPILOT_DONE.md` or `AUTOPILOT_BLOCKED.md`.

## HARD SAFETY RULES (NON-NEGOTIABLE)

These apply to the entire autopilot run:

- **NO `git commit`** — working tree only
- **NO `git push`** — never contact remote
- **NO destructive git ops** (reset --hard, branch -D, etc.)
- **NO production deploys, CI triggers**
- **NO credential-requiring external calls** that aren't already configured
- **NO process killing** beyond your own
- **NO package downgrades or removals**
- **NO editing CLAUDE.md / MISSION.md** mid-run
- **NO modifying tests/verifiers to make them pass**

If any of these would be violated, STOP and write `AUTOPILOT_BLOCKED.md`.

## Default budgets

- Max iterations: 10
- Max wall-clock: 4 hours (autopilot stops itself at 4h regardless)
- Same failure 3 iterations in a row: STOP, loop detected

The user can override budgets in the argument: "budget 15 iterations" or "until 9pm".

## What the user comes back to

1. `AUTOPILOT_DONE.md` or `AUTOPILOT_BLOCKED.md` at project root
2. `AUTOPILOT_LOG.md` — iteration history
3. `git status` — uncommitted changes
4. `git diff` — the actual edits ready for review
5. Test suite output (passing if DONE, failing if BLOCKED)

User reviews diff, commits what they want, discards what they don't. Autopilot does NOT decide what's mergeable.

## Pre-flight checks before starting

Confirm before Phase 0:
1. Is there a CLAUDE.md or MISSION.md at the project root? (If no → STOP, ask user)
2. Is there a Definition of Done section? (If no → STOP, ask user to add one)
3. Is the test suite currently passing? (If no → autopilot's first iteration goal is to make it pass)
4. Has the user explicitly invoked autopilot? (Confirm — autopilot NEVER fires implicitly)

If all four pass, begin Phase 0.

## Anti-patterns

- ❌ Starting without a mission file — autopilot has nothing to anchor against
- ❌ Continuing past the budget on "almost done" — budget is hard
- ❌ Modifying any constraint file mid-run — mission is fixed
- ❌ Auto-committing "for backup" — never commits
- ❌ Skipping sanity checks to save time — every iteration sanity-checks

Begin Phase 0 now.
