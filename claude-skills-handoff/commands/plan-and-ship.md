---
description: New feature with unclear scope, all the way to shipped. Brainstorm → plan → subagents → verify → document.
argument-hint: "<feature idea — what you want to build, even if rough>"
---

# Plan and Ship

Execute the **plan-and-ship** workflow for:

$ARGUMENTS

## The chain

1. **`brainstorming`** — explore intent, design, scope. Triggers ONLY for net-new features with unclear scope. If the user already has a clear spec, SKIP this step and go to writing-plans.

2. **PAUSE** — present the design, get user approval. Hard gate.

3. **`writing-plans`** — formal plan with file paths, decisions, test scenarios. Apply the Plan Quality Bar.

4. **PAUSE** — present the plan, get user approval before subagent dispatch.

5. **`subagent-driven-development`** — dispatch fresh subagent per task with two-stage review.

6. **`verification-before-completion`** — run the feature end-to-end. Prove it works.

7. **`compound-document`** — if any non-obvious problems were solved during the build, write the solution doc.

## Gates

- After brainstorming: user approves the design before plan is written
- After writing-plans: user approves the plan before subagents fire
- Between subagents: review each task's diff
- Before claiming done: end-to-end verification, not just unit tests

## Anti-patterns

- ❌ Brainstorming when scope is already clear (use ship-it-smart instead)
- ❌ Skipping the design-approval gate
- ❌ Writing a 200-line plan for a 3-file feature (use ship-it-smart's complexity routing instead)
- ❌ "Should work" instead of end-to-end verification

## When to use ship-it-smart instead

If the user says "build X" and X has a clear definition (specific files, specific behavior), use `/ship-it-smart` directly. plan-and-ship is for genuinely fuzzy "I want a thing that does Y somehow" cases.

Begin with brainstorming.
