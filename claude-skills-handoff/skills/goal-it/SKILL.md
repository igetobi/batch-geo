---
name: goal-it
description: >
  Define a measurable goal + executable verifier, then iterate autonomously until the goal is
  met. Use when the user can express success as a measurable outcome (test passes, score above
  N, page renders, output matches snapshot). Triggers on "goal:", "iterate until", "make it
  pass", "achieve X", or `/goal-it`. DO NOT USE when success is subjective ("make it pretty"),
  when no verifier exists, or when the work is exploratory and the goal would emerge later —
  use `brainstorming` or `solve-problem` for those. Replaces the user-tests-Claude-fixes
  back-and-forth loop with Claude-tests-itself.
---

# Goal-Based Execution

## Mission

The user defines what "done" looks like as something measurable. Claude defines the plan, executes, runs the verifier, reads the output, and iterates. The human reviews the final result, not every intermediate iteration.

## When this skill fires vs other skills

| Situation | Skill |
|---|---|
| User has measurable success + executable verifier | **goal-it** (this skill) |
| User wants to think through approach first | `solve-problem` |
| User has clear scope but needs structured plan | `writing-plans` |
| User has clear plan but no measurable goal | `subagent-driven-development` |

## Required inputs before iterating

Claude MUST have all three before starting the loop. If any are missing, ask the user — do not invent them.

1. **Goal (measurable):** "tests in `tests/auth/` pass" — not "auth works"
2. **Verifier (executable):** the exact command that produces a pass/fail result. `python -m pytest tests/auth/` or `npm test -- --testPathPattern=auth` or `curl -s http://localhost:8060/health | grep ok`
3. **Iteration budget:** how many attempts before stopping to ask for help. Default: **5**. Override with "up to N iterations" in the prompt.

## The loop

```
ITERATION = 1
While ITERATION ≤ BUDGET:
  1. Read current state of affected files
  2. Make the smallest change that could plausibly move toward the goal
  3. Run the verifier
  4. If verifier passes → STOP, report success
  5. Read verifier output carefully — what specifically failed?
  6. If the failure is the SAME as the previous iteration's failure:
       → STOP, the approach isn't working
       → Report what was tried, what failed, what's known
  7. Otherwise increment ITERATION, return to step 1
```

## Hard rules

- **No silent assumptions.** If the goal is ambiguous, ask once before starting.
- **One change per iteration.** Don't fix 3 things at once — you won't know which one mattered.
- **Read the verifier output, don't pattern-match.** "Test failed" is not enough. Read the assertion failure, the stack, the exit code.
- **Same failure twice = stop.** Repeating an approach that didn't work is the v5 anti-pattern.
- **Never modify the verifier to make it pass.** That's cheating. If the verifier itself is wrong, stop and tell the user — don't unilaterally rewrite the success criteria.

## When to stop and report

- ✅ Verifier passes → report what was changed, in one paragraph
- ❌ Same failure twice → report what was tried, what stayed broken, what's known about why
- ❌ Iteration budget hit → report progress made, current state, recommendation
- ❌ Hard blocker (missing credential, requires user decision) → report blocker, do not proceed

## Example invocations

```
Goal: tests in tests/audit/test_quality.py pass. Verifier: python -m pytest tests/audit/test_quality.py -v. Budget: 5 iterations. Go.
```

```
Goal: the Kubaitis score on the roofing page reaches ≥35/44. Verifier: python -m app.audit golden-plumbing --kubaitis. Iterate the writer prompts until met.
```

```
Goal: /api/health returns {"status": "ok"} with HTTP 200. Verifier: curl -s -o /dev/null -w "%{http_code}" http://localhost:8060/api/health. Make it pass.
```

## What this skill does NOT do

- Does not pick the goal — the user does
- Does not invent a verifier when none exists — asks the user
- Does not iterate past the budget — stops and reports
- Does not call other skills mid-loop unless the user invokes them via a chain (see `feedback_prompt_discipline.md` named chains)
