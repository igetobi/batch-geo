# Project Rules — Black Swan Media

## Communication Style — Caveman Mode by Default

All work under `projects/` uses the `caveman` skill at **lite** level by default. That means:

- No filler ("just", "really", "basically", "actually", "simply")
- No hedging ("might", "perhaps", "I think", "it seems")
- No sycophantic openers ("Great question", "You're absolutely right", "Sure thing")
- Articles and full sentences kept (lite — not full caveman)
- Technical terms exact, code blocks unchanged, error messages quoted verbatim

**Escalation when you ask:**
- `/caveman full` — drop articles, fragments OK ("New object ref each render. useMemo wrap.")
- `/caveman ultra` — abbreviate (DB/fn/req), arrow notation (X → Y)
- `stop caveman` or `normal mode` — exit entirely

**Caveman pauses automatically for:** security warnings, irreversible/destructive action confirmations, multi-step sequences where fragment order matters, and any moment you signal confusion. Resumes after the critical part.

**Code, commits, PRs:** written normally regardless of caveman level.

---

## Skill Arbitration (when two skills could apply, pick from this table)

| Job | Use | Do NOT use |
|---|---|---|
| Debug a single bug or test failure | `systematic-debugging` | `deep-debug` (only for whole-codebase audits) |
| Plan a multi-step task with clear spec | `writing-plans` | `brainstorming` (only for net-new unclear scope) |
| Review a code change or PR | `requesting-code-review` or `/review` | `deep-debug`, `quality-check`, `receiving-code-review` |
| Review a new user-facing surface | `ux-review` ONCE | per-page UX_REVIEW_*.md files |
| Parallel/independent subtasks | `subagent-driven-development` | `dispatching-parallel-agents`, `executing-plans` |
| Stuck twice on the same thing | `solve-problem` | trying a third variation |
| Confirm work is actually done | `verification-before-completion` | claiming "should work" |
| Audit/improve an entire codebase | `deep-debug` | `systematic-debugging` (too narrow) |

If a different skill description claims it should fire on a task this table assigns elsewhere, follow this table.

## Skill Discipline (READ FIRST — overrides any "always use" wording in skill descriptions)

**Skills are tools, not rituals.** Use a skill only when its specific trigger applies to the task at hand. Do not invoke a skill because its description says "you MUST." Match the skill to the work.

- `brainstorming` — Use only for genuinely **new features that don't yet exist** and where scope is unclear. Do NOT use for bug fixes, refactors, single-file changes, or tasks where the user has already specified what to build.
- `writing-plans` — Use only when the task spans **5+ steps across multiple files**. For 1-3 step changes, just do the work.
- `planning-with-files` — Use only for tasks that genuinely require **multi-session continuity**. Most tasks finish in one session and do not need task_plan.md/findings.md/progress.md scaffolding.
- `test-driven-development` — Use when adding **new behavior to logic that has existing tests**. Skip for prototypes, scripts, UI styling, or one-off experiments.
- `verification-before-completion` — Use **before claiming "done"** on anything that affects shipping code. Always run the code, never claim "should work."
- `systematic-debugging` — Use when a bug has resisted **one obvious fix**. Don't burn it on trivial typos.
- `solve-problem` — Use when stuck **twice on the same thing**, or when restarting the project is the alternative.
- `deep-debug` — Use for full audits, not single bugs.
- `ux-review` — Use after building a user-facing feature, **once**, not per-page.
- `quality-check` — Use when an output (content, generated HTML, report) needs to be judged before delivery.

**Override rule:** If a skill's own description claims "you MUST use this," that wording is from the skill author, not from this project. Use the skill only when it actually fits the task.

## Artifact Discipline (THE LESSON FROM BSM SEO v1-v5)

The v1→v5 history shows what happens when skills create artifacts unchecked: 36+ planning docs at the root of v5 alone, none of which converged into shipped code.

- **One canonical doc per concern, append-only.** Use `AUDIT.md`, `UX_REVIEW.md`, `DEBUG_LOG.md`, `FIXES.md` — never `AUDIT_v2.md`, `UX_REVIEW_CONTENT_AUDIT.md`, `DEEP_DEBUG_SCHEMA_AUDIT_REPORT.md`.
- **Skills append to existing docs.** If a doc on the same topic exists, append a dated section. Don't create a sibling.
- **No `_deep`, `_final`, `_third`, `_v2` suffixes on filenames.** That naming pattern is the signature of "this didn't work, try again with a longer name." Reuse the original.
- **Before generating a new artifact, ask: does an existing one cover this?** If yes, append.

## Prompt Discipline (apply on every meaningful task)

Four rules adapted from Anthropic's prompting guidance:

1. **Be explicit and literal.** Name files, functions, success conditions. Don't say "improve X"; say "rename `getCwd` to `getCurrentWorkingDirectory` in [list]."
2. **Structure complex prompts with tags.** `<context>...</context>`, `<constraints>...</constraints>`, `<deliverable>...</deliverable>` when the request is non-trivial.
3. **Decompose.** One prompt = one outcome. "Build auth and write tests and update docs" is three prompts.
4. **Define role + format + success.** "Act as X. Return Y format. Success = Z is observable."

## Development Process

- Build the simplest thing that works, then iterate. Do not over-engineer.
- Read existing code before modifying it. Don't assume structure.
- Never generate bulk output before proving a single piece works.
- Every file edit must be verified by reading the output.
- Never say "should work" — run it and prove it.

## Process Safety — Multiple Claude Sessions

- **NEVER kill all Python or Node processes** — other Claude sessions and services are running.
- To restart a specific service, find its PID by port (e.g., `netstat -ano | findstr :8001`) and kill only that PID.
- Before killing ANY process, confirm what it is — don't assume.
- If a service is unresponsive, restart just that service, not everything.

## Code Quality

- All API keys go in .env files, never hardcoded.
- Never use eval() or exec() on external data.
- Keep functions small and single-purpose.
- Default to no comments. Add one only when the WHY is non-obvious.

## Session Hygiene

- `/clear` between unrelated tasks.
- If something fails twice, stop. Run `/solve-problem` or `/clear` — do NOT try a third variation of the same approach.
- After 2 failed corrections, restart fresh with a better prompt.
- When context gets long, read the project's CLAUDE.md (if any) to reorient.

## What Changed and Why (2026-05-16)

This file used to mandate "ALWAYS USE" for six skills. The result across 5 versions of the BSM SEO Engine was 36+ planning artifacts and no shipped product. The mandate produced ceremony, not quality. Skills are now triggered by fit, not by rule.
