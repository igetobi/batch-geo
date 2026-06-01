---
name: compound-document
description: >
  After solving a non-trivial problem, write a small markdown doc capturing symptom,
  root cause, and fix so future searches find it. Use ONLY after a real fix has shipped
  (test passes, bug resolved, feature working). Use when the user says "document this fix",
  "compound this", "save this for next time", or after `/solve-problem` ends with a working
  resolution. DO NOT USE for trivial fixes (typos, one-liners), for failed attempts, or
  pre-emptively before a fix is verified. Adapted from EveryInc's ce-compound concept —
  the point is knowledge that compounds, not ceremony.
---

# Compound Document

## Purpose

Solved problems become free lookups for the future. Without docs, every recurrence costs the original research time again. With docs, recurrence costs minutes.

This skill writes ONE small markdown file per solved problem. No multi-phase orchestration, no subagents, no review loop. Capture and move on.

## When to use vs not use

| Use | Don't use |
|---|---|
| Bug that took >30 min to diagnose | Typo fix |
| Confusing behavior whose root cause wasn't obvious | Anything one-shot from docs |
| Workaround for a library/tool quirk | Failed attempts (write only when a fix works) |
| Solution that's likely to be needed again | Pure scaffolding/setup |
| Learning that contradicts your prior mental model | Anything obvious in retrospect |

## Output

ONE file at `docs/solutions/<problem-slug>-<YYYY-MM-DD>.md`. Create the `docs/solutions/` directory if missing. Use repo-relative paths only.

If the project has no `docs/` convention, write to `docs/solutions/` anyway — the directory becomes the convention.

## Template

```markdown
---
title: <one-line problem statement>
date: 2026-MM-DD
problem_type: bug | quirk | workaround | learning
component: <area or filename, e.g. "auth middleware" or "app/web/server.py">
keywords: [keyword1, keyword2, keyword3]
---

## Symptom

What the user/developer saw. Quote error messages exact, including stack lines that mattered.

## Root Cause

The actual underlying cause — one or two sentences. Not "the function was wrong"; the specific decision or constraint that made it wrong.

## Fix

```diff
- old code
+ new code
```

Or for non-code fixes, the exact action taken.

## Why This Works

One paragraph explaining why the fix addresses the root cause. If a future reader needs to understand the change without context, this is the section.

## What Didn't Work

If real time was spent on dead-ends, list them. Saves the next person from repeating. Keep terse — one line per failed attempt.

## Prevention

What would have caught this earlier? A test, a lint rule, a doc note, a CLAUDE.md rule? Concrete if possible.
```

## Rules

1. **One doc per problem.** Don't bundle multiple problems even if found in the same session.
2. **Repo-relative paths.** Never absolute (`/Users/...`, `C:\Users\...`).
3. **No process exhaust.** Don't include "captured by compound-document skill at Phase X" or "Next steps: invoke skill Y." The doc is for the future reader, not the engineering trail.
4. **No invented entities.** Don't reference functions, files, or commits that don't exist.
5. **Filename convention:** lowercase-hyphenated slug + ISO date. Example: `wp-multisite-bulk-install-2026-05-17.md`.
6. **Keywords are search-future-self bait.** Put the words you would google. Not "fix" or "bug" — the specific terms ("CSRF token", "401 after deploy", "Pydantic validator").

## Anti-pattern

Don't write this skill's output as a story or postmortem. It's a search artifact. Future-you will skim the YAML frontmatter and the Symptom section. Optimize for that.

## Discoverability

If the project has a `docs/README.md` or `AGENTS.md` or `CLAUDE.md` that lists doc directories, add `docs/solutions/` to the list. One-line entry. This is the only "maintenance" step — without it, future agents won't know the directory exists.
