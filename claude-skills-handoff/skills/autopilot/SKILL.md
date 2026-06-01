---
name: autopilot
description: >
  Autonomous self-improvement loop for when the user steps away. Edits files, runs tests,
  dispatches subagents, and iterates against the mission's Definition of Done — but NEVER
  commits, pushes, or touches remote. All work stays in the uncommitted working tree for
  user review on return. Use ONLY when the user explicitly says "autopilot", "self-improve
  until done", "ship it autonomously", "I'm away — finish this", or invokes `/autopilot`.
  DO NOT USE without explicit user invocation. The user comes back to working-tree diff +
  test reports + status files, then decides what to commit themselves.
---

# Autopilot — Autonomous Working-Tree Iteration

## What this skill is for

The user is stepping away. They want to return to code that works, with tests passing, and a clear report of what was done. Not a half-implementation. Not a broken branch.

Autopilot runs iterations of plan → ship → sanity-check against the mission, writing all changes to the working tree. The user reviews the diff on return and commits whatever they want.

## The hard safety rules (NON-NEGOTIABLE)

These override every other rule in this skill and every other skill autopilot invokes.

1. **NO `git commit`.** Working tree changes only. Period.
2. **NO `git push` of any kind.** Never contact a remote.
3. **NO `git reset --hard`, `git checkout -- <file>`, `git branch -D`, `git stash drop`.** No destructive git operations.
4. **NO production deploys, CI triggers, infrastructure changes.**
5. **NO credential-requiring external calls** (calls to services needing new API keys/OAuth).
6. **NO process killing beyond your own spawned processes.** Never `kill` other Python/Node dev servers.
7. **NO package version downgrades or removals.** Adding new deps requires explicit justification in the iteration log.
8. **NO editing CLAUDE.md, MISSION.md, or other constraint files.** Mission is fixed during a run.
9. **NO modifying tests, verifiers, or scoring systems to make them pass.** Same rule as `goal-it` and `calibrate`.
10. **NO skipping the sanity check.** Every iteration runs the sanity check.

If autopilot needs to violate any of these to make progress, it STOPS and writes `AUTOPILOT_BLOCKED.md` with the specific need.

## When this skill fires

ONLY when the user explicitly invokes it:
- Types `/autopilot`
- Says "go autopilot", "self-improve until done", "I'm away — finish this", "ship it autonomously"

NEVER fires implicitly. NEVER from another skill. NEVER from a workflow chain.

## What autopilot reads to anchor the run

In order:

1. `<project>/CLAUDE.md` — mission, Definition of Done, constraints, "what this project is NOT"
2. `<project>/MISSION.md` (if present) — fuller mission detail
3. Any `*_PLAN.md` or `IMPLEMENTATION_PLAN.md` at project root — current plan state
4. Recent `git log --oneline -20` — what's been shipped already
5. The current branch's working tree state (`git status`, `git diff`)

If any of those don't exist, autopilot STOPS and writes BLOCKED — it needs the mission file to anchor against. Don't invent it.

## Phase 0: Context Capture (run ONCE at start)

Write `AUTOPILOT_STATE.md` at project root:

```markdown
# Autopilot Run — <ISO timestamp>

## Mission (from CLAUDE.md)
<verbatim copy>

## Definition of Done (from CLAUDE.md)
<verbatim copy>

## "What this project is NOT" (from CLAUDE.md)
<verbatim copy>

## Current State at Run Start
- Branch: <current branch>
- Last commit: <hash + message>
- Test suite status: <run tests, capture output>
- Open files (uncommitted): <git status --short>
- Active plan doc: <path if any>

## Iteration Budget
- Max iterations: 10
- Max wall-clock: 4 hours
- Start time: <timestamp>

## Interpretation of the user's request
<one paragraph in your own words — what is the user actually asking autopilot to ship?>
```

If the test suite is currently failing, autopilot's first iteration's goal is to make it pass. Do not start new work while tests are red.

## Phase 1: Plan (start of each iteration N)

1. Re-read `CLAUDE.md` (mission + DoD)
2. Re-read `AUTOPILOT_STATE.md`
3. Run `git status` and the test suite to capture *actual* current state
4. Pick ONE next concrete unit of work that moves toward Definition of Done

The unit must satisfy ALL:
- One outcome (not bundled)
- Verifiable (a runnable command tells you if it worked)
- Within scope per CLAUDE.md (do not expand the mission)
- Achievable in ~30-60 minutes of agent work

Update `AUTOPILOT_STATE.md` with: iteration number, unit chosen, success criteria for the unit.

## Phase 2: Execute the unit

The execution chain for a unit:

1. **Brief plan** — name files, decisions, test scenarios. ~10 lines. Do NOT invoke `writing-plans` for full ceremony; this is a single unit.
2. **Implement** — edit files in the working tree
3. **Verify** — run the test/command that proves the unit works
4. **If verifier fails:**
   - Read the failure carefully
   - One retry with a focused fix
   - If second retry fails, STOP this iteration, log the failure pattern
5. **If verifier passes:**
   - Run the FULL test suite to confirm nothing regressed
   - If regression detected, STOP this iteration, log the regression

NEVER `git commit`. NEVER `git push`. Working tree only.

If `compound-document` would apply (the unit involved a non-trivial fix), write the solution doc — it's just a file write, no git involved.

## Phase 3: Sanity Check Against Mission

Re-read `CLAUDE.md`. For each of these questions, answer in 1-2 sentences and write to `AUTOPILOT_LOG.md`:

1. **Did this iteration move toward Definition of Done?** Cite a specific DoD criterion.
2. **Did we accumulate tech debt that will block done?** Name it specifically if yes.
3. **Did we violate any "NOT" constraints?** (e.g., for BSM SEO v5: did we start v6? Did we create new top-level planning docs? Did we regenerate full pages?)
4. **Did the unit's scope creep beyond what was planned?** What did we add and why?
5. **Is the verifier still honest?** (We didn't change it to make it pass, right?)

Any "yes" to questions 3 or 4 is a WARNING. Three iterations with warnings = STOP.

## Phase 4: Definition of Done Check

Read `CLAUDE.md`'s Definition of Done. For EACH criterion:

- Run the verifier (test, command, observable behavior)
- Mark: MET / PARTIAL / NOT YET

If all criteria are MET → STOP, write `AUTOPILOT_DONE.md`, exit successfully.
If any PARTIAL or NOT YET → proceed to Phase 5.

## Phase 5: Continue or Stop

Check termination conditions in order:

| Condition | Action |
|---|---|
| All DoD criteria MET | STOP — success |
| Iteration counter ≥ budget (default 10) | STOP — budget |
| Wall-clock ≥ 4 hours | STOP — time |
| Same test failure 3 iterations in a row | STOP — loop |
| 3 iterations with sanity-check warnings | STOP — drift |
| Hard safety rule would be violated | STOP — blocked |

If any STOP, write status to either `AUTOPILOT_DONE.md` (success) or `AUTOPILOT_BLOCKED.md` (anything else). See "Status files" below.

Otherwise, return to Phase 1 for iteration N+1.

## Status files autopilot writes

| File | When | Purpose |
|---|---|---|
| `AUTOPILOT_STATE.md` | Updated every iteration | Living state for next iteration |
| `AUTOPILOT_LOG.md` | Appended every iteration | History: chosen unit, files touched, verifier output, sanity-check answers |
| `AUTOPILOT_DONE.md` | Once, on success | What was completed, current state, recommended next steps |
| `AUTOPILOT_BLOCKED.md` | Once, on any non-success stop | What blocked, what's the next user action, what's in the working tree |

All four go at the project root. They are autopilot's authorized exceptions to the general "no new top-level docs" rule — they exist specifically so the user can find autopilot's output quickly when returning.

## What the user sees on return

1. `AUTOPILOT_DONE.md` or `AUTOPILOT_BLOCKED.md` at project root — one-page summary
2. `AUTOPILOT_LOG.md` — iteration-by-iteration detail if they want more
3. `git status` — uncommitted changes, all of autopilot's edits
4. `git diff` — the actual code changes ready to review
5. Full test suite passing (if `AUTOPILOT_DONE.md` was written) OR clear note about what's failing

The user then:
- Reviews the diff
- Commits whatever they want (autopilot does NOT do this)
- Optionally discards changes they don't want with `git checkout -- <file>` (their call, not autopilot's)

## Anti-patterns autopilot must not do

- ❌ "Almost done — one more iteration past the budget" — NO, the budget is hard
- ❌ "Tests are failing but the change is conceptually right — commit anyway" — NO, autopilot doesn't commit
- ❌ "The mission says X but actually Y would be better" — NO, mission is fixed during a run
- ❌ "Let me just push this branch for backup" — NO, no remote contact
- ❌ "The verifier is too strict, let me relax it" — NO, autopilot doesn't modify verifiers
- ❌ "Three iterations failed the same way but the fourth might work" — NO, stop and report

## Example invocation

```
/autopilot

Ship BSM SEO v5 Wave 0 (audit extensions in `app/audit/quality.py` and `publish_sanity.py`).
Mission: CLAUDE.md "Definition of Done" items 1-6.
Budget: 10 iterations, 4 hours.
I'll be back at 6pm.
```

Autopilot then:
1. Writes AUTOPILOT_STATE.md capturing current state
2. Iterates against the Wave 0 audit dimensions
3. Each iteration: pick one dimension, implement, test, verify, sanity-check
4. Stops when all dimensions land + tests pass + sanity-check is clean
5. Writes AUTOPILOT_DONE.md
6. Leaves the working tree with all edits ready for the user to review and commit

## What autopilot is NOT

- Not an excuse to skip planning — every iteration plans its unit
- Not an excuse to skip verification — every iteration verifies
- Not a way to commit code that bypasses review — autopilot never commits
- Not a way to redefine the mission — mission is fixed at run start
- Not a substitute for the user being there when stakes are high — for production-critical work, the user reviews each step
