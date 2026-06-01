---
description: Run the ship-it-smart chain — plan, dispatch subagents per task, verify, then document if non-trivial. For tasks with clear scope where execution is the goal.
argument-hint: "<what to ship — paste plan, link to spec, or describe the unit of work>"
---

# Ship It Smart

Execute the **ship-it-smart** workflow chain for:

$ARGUMENTS

## Pre-flight check (do this FIRST)

Apply the **Task Complexity Routing** rule from `memory/feedback_prompt_discipline.md`:

- **1-2 files, ≤30 min** → skip the full chain. Direct implementation + `verification-before-completion`. State this and proceed.
- **3-5 files** → light chain. Inline ~15-line plan in chat (no plan doc), then implement, then verify.
- **6+ files OR cross-system** → full chain below.

State your classification before proceeding.

## The chain (for 6+ file tasks)

1. **`writing-plans`** — turn the outline into a formal plan with file paths, decisions, test scenarios. Apply the Plan Quality Bar (repo-relative paths, decisions with rationale, peer-pattern references, enumerated test scenarios per implementation unit).

2. **PAUSE** — show the plan, wait for user approval before subagent dispatch.

3. **`subagent-driven-development`** — dispatch a fresh subagent per task with two-stage review. Each subagent gets only the task's context, not the whole session.

4. **`verification-before-completion`** — for each task and at the end, run the actual code, capture output, prove it works. No "should work" claims.

5. **`compound-document`** — if any non-trivial fix or learning happened along the way, write the solution doc at `docs/solutions/<problem>-<date>.md`. Skip for trivial work.

## Gates

- Before subagent dispatch: user approves the plan
- Between subagents: review the diff, decide if next subagent fires
- Before claiming done: verification output captured and shown
- Before considering compound-document: was this non-trivial? If trivial, skip and say so.

## Anti-patterns

- ❌ Skipping the complexity classification — produces overkill or underkill
- ❌ Dispatching subagents without showing the plan first
- ❌ "Should work" instead of running it
- ❌ Writing a solution doc for a one-line typo

Begin now.
