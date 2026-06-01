---
name: solve-loop
description: >
  Autonomous problem-solving loop for ONE specific problem with a verifiable desired state.
  Combines solve-problem's structured analysis with execution and iteration until the problem
  is verifiably solved OR the iteration budget is exhausted. Working tree only — never commits
  or pushes. Use when there's a clearly stated problem with a runnable verifier, especially
  problems that have resisted one or two prior fix attempts. Use ONLY when the user explicitly
  invokes it via `/solve-loop`, "solve-loop until done", "crack this problem", or "iterate on
  this problem until solved". DO NOT USE for: broad missions (use `autopilot`), exploratory
  research (use `solve-problem` for analysis only), or problems without a measurable verifier.
---

# Solve-Loop — Autonomous Problem-Solving Iteration

## What this skill is for

A specific problem exists. It has a verifier — a command, test, score, or observable behavior that proves whether the problem is solved. The first fix attempt may have failed. Subsequent attempts have failed. You want a structured loop that generates hypotheses, tests them, learns from failures, and converges on a solution — without you babysitting each iteration.

## When to use vs other skills

| Situation | Skill |
|---|---|
| **One specific problem with a runnable verifier** | **solve-loop** (this skill) |
| Don't know the right approach yet, need to think | `solve-problem` (analysis only, no execution) |
| Many units toward a broad Definition of Done | `autopilot` |
| Single bug with clear root cause | `/fix-it-smart` |
| Already have a measurable goal + verifier | `goal-it` (simpler — no hypothesis tree) |

The line between `solve-loop` and `goal-it`: goal-it makes one-change-per-iteration toward a known goal. solve-loop is for problems where the SOLUTION isn't known — it generates and tests hypotheses about what would work.

## HARD SAFETY RULES (NON-NEGOTIABLE)

These override every other rule in this skill.

1. **NO `git commit`.** Working tree only.
2. **NO `git push`.** Never contact remote.
3. **NO destructive git ops** (reset --hard, branch -D, checkout -- <file> on uncommitted changes).
4. **NO production deploys, CI triggers.**
5. **NO credential-requiring external calls** not already configured.
6. **NO process killing** beyond your own spawned processes.
7. **NO package downgrades or removals.**
8. **NO editing the verifier to make it pass.** Same rule as goal-it and autopilot.
9. **NO editing the problem statement mid-run.** Problem is fixed at run start.
10. **NO expanding scope beyond THE problem.** If you find a tangential issue, log it — don't fix it.

If any rule would be violated, STOP and write `SOLVE_BLOCKED.md`.

## Required inputs

Before starting, you MUST have:

1. **Problem statement** — what's wrong, observable. Not "auth is buggy"; "POST /api/login returns 500 when password contains a `+` character."
2. **Verifier** — the exact command/test that proves the problem is solved. `curl -X POST -d 'password=foo+bar' http://localhost/api/login | jq .status_code` returns `200`.
3. **Desired state** — what the verifier should output when solved.
4. **Prior attempts** — what's already been tried (so we don't repeat). If nothing has been tried, that's fine, just say so.

If any are missing, STOP and ask the user. Do not invent them.

## Phase 0: Anchor the run

Write `SOLVE_STATE.md` at the project root:

```markdown
# Solve-Loop Run — <ISO timestamp>

## Problem
<verbatim copy of problem statement>

## Verifier
- Command: <exact command>
- Desired output: <what proves it's solved>

## Prior attempts (do not repeat)
- <attempt 1>: <why it failed>
- <attempt 2>: <why it failed>

## Hypothesis budget
- Max iterations: 7
- Max wall-clock: 3 hours
- Same approach 3x in a row: STOP, loop detected
- Start time: <timestamp>
```

## Phase 1: Structured analysis (iteration 1 ONLY)

Apply solve-problem's discipline to generate the hypothesis tree:

1. **Three alternative readings of the problem** — what could "the problem is X" actually mean? If you can only think of one reading, you don't understand it yet.

2. **Root cause hypothesis chain:** Symptom → why → why → decision/missing-decision.

3. **Falsifiable predictions:** If hypothesis A is right, then X, Y, Z should be observable. Run those checks before committing to A.

4. **Hypothesis list (ranked):** 2-4 candidate solutions, ordered by `likelihood × inverse_cost`. Include for each:
   - Core idea (one sentence)
   - What it would do (3 sentences)
   - Why it might work (the root-cause hypothesis it addresses)
   - Verifier prediction (if this works, what specifically changes in the verifier output)
   - Cost (effort, risk)

Save the hypothesis list to `SOLVE_STATE.md`.

## Phase 2: Try the top hypothesis

For the highest-ranked untested hypothesis:

1. Implement the SMALLEST change that would test it. No bundled improvements.
2. Run the verifier.
3. Capture the verifier's full output (not just pass/fail).

## Phase 3: Did it solve THE problem?

- **Verifier shows desired output** → STOP, success. Go to Phase 4 (terminate successfully).
- **Verifier output unchanged** → hypothesis was wrong. Mark it tried in `SOLVE_STATE.md`. Go to Phase 5.
- **Verifier output changed but still not desired** → partial progress. Update the hypothesis tree with what we learned (we now know X was a factor). Go to Phase 5.
- **Verifier errored differently** → the change broke something new. Revert that change in the working tree. Mark hypothesis as "introduces regression." Go to Phase 5.

## Phase 4: Successful termination

Write `SOLVE_DONE.md`:

```markdown
# Solve-Loop Complete — <ISO timestamp>

## Problem
<from SOLVE_STATE.md>

## Solution that worked
<the hypothesis that succeeded, with the actual change made>

## Why it worked
<root cause it addressed>

## Verifier output (before vs after)
Before: <captured>
After: <captured>

## Iterations used: <N> / 7

## What's in the working tree
<git status --short output>

## Recommended next step for the user on return
<commit advice, regression test suggestion>
```

Then STOP.

## Phase 5: Continue or stop

Check termination conditions in order:

| Condition | Action |
|---|---|
| Verifier shows desired output | Phase 4 (success) |
| Iteration counter ≥ 7 | STOP — budget exhausted |
| Wall-clock ≥ 3 hours | STOP — time exhausted |
| Same hypothesis variation tried 3x in a row | STOP — loop detected |
| All hypotheses in the tree have been tried | STOP — exhausted |
| Hard safety rule would be violated | STOP — blocked |

If terminating without success, write `SOLVE_BLOCKED.md`:

```markdown
# Solve-Loop Blocked — <ISO timestamp>

## Problem
<from SOLVE_STATE.md>

## What was tried (in order)
1. <hypothesis> → <result> (verifier output excerpt)
2. <hypothesis> → <result>
...

## What we learned that we didn't know at start
<new facts about the problem surfaced during attempts>

## What's still NOT YET
<the gap between current verifier output and desired output>

## Recommendation for the user on return
<specific suggestion: "try X angle next" OR "this needs human judgment because Y" OR "the verifier itself may be wrong because Z">

## What's in the working tree
<git status --short output — note that the last attempted change may still be there>
```

Otherwise, **regenerate or reorder hypotheses** based on what was learned, then return to Phase 2 for the next iteration. Increment iteration counter.

## Hypothesis regeneration rules

After a failed hypothesis:

- **Don't just try variations of the same idea.** If "tighten the threshold" failed, "tighten the threshold more" is a variation, not a new hypothesis. New hypothesis = different root cause.
- **Use the verifier output to constrain new hypotheses.** If the verifier now says X instead of Y, that's data. New hypotheses must be consistent with it.
- **If all initial hypotheses fail, expand the alternative-readings list.** Maybe the problem isn't what you thought. Re-run Phase 1's 3-alternative-readings step.

## Status files solve-loop writes

| File | When | Purpose |
|---|---|---|
| `SOLVE_STATE.md` | Created Phase 0, updated each iteration | Hypothesis tree + what's been tried |
| `SOLVE_LOG.md` | Appended each iteration | Detail: hypothesis chosen, change made, verifier output, what was learned |
| `SOLVE_DONE.md` | Once, on success | The winning hypothesis and how to confirm |
| `SOLVE_BLOCKED.md` | Once, on non-success stop | What was tried, what's still unsolved, recommended next step |

All four go at project root. Authorized exception to "no new top-level docs."

## What the user comes back to

1. `SOLVE_DONE.md` or `SOLVE_BLOCKED.md` — one-page summary
2. `SOLVE_LOG.md` — full iteration history
3. `git status` / `git diff` — uncommitted changes ready to review
4. Verifier output captured in the log

User reviews diff, decides what to commit. solve-loop never commits.

## Anti-patterns

- ❌ "Iteration 7 failed but iteration 8 might work" — budget is hard, stop and report
- ❌ Trying the same hypothesis 3 different ways — that's one hypothesis, not three
- ❌ Modifying the verifier when the change doesn't solve the problem
- ❌ Silently expanding the problem to include nearby issues
- ❌ Committing in the middle of a run "for safety" — solve-loop never commits
- ❌ Editing SOLVE_STATE.md's problem statement mid-run — problem is fixed at start

## Example invocation

```
/solve-loop

Problem: BSM SEO roofing landing page scores 31.5/100 on Kubaitis SEO audit, target is ≥80%
(≥35/44).
Verifier: `python -m app.audit golden-plumbing --kubaitis` exits 0 AND prints "score: N" where N ≥ 35.
Desired state: score 35 or higher.
Prior attempts: Wave 0 audit-dimension extensions implemented but verifier shows 28.
Budget: 7 iterations, 3 hours.
```

solve-loop then:
1. Writes SOLVE_STATE.md capturing all the above
2. Generates 3 alternative readings: maybe the writer prompts need updates, maybe entity coverage is the bottleneck, maybe the new audit dimensions are themselves miscalibrated
3. Tests hypothesis 1 (e.g., update writer prompts for BLUF + brand-in-block) → runs verifier → 31
4. Hypothesis 1 failed (still <35). Updates state, picks hypothesis 2 (entity coverage from EAV)
5. Tests hypothesis 2 → runs verifier → 36 ✅
6. Writes SOLVE_DONE.md, stops
7. User returns to: uncommitted changes in writer prompts + EAV module, verifier passing, SOLVE_DONE.md describing what worked
