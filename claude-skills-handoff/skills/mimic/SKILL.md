---
name: mimic
description: >
  Before writing new code that's structurally similar to existing code in this repo, FIRST
  read 1-2 comparable files and match their style, naming, error handling, and patterns.
  Use when creating a new file that has peers (a new API route when other routes exist;
  a new test when other tests exist; a new component when other components exist). Triggers
  on "create a new X like Y", "add another X", "follow the existing pattern", or `/mimic`.
  DO NOT USE when no peer file exists, when the user has explicitly asked for a different
  style, or for trivial one-line additions to existing files.
---

# Mimic the Existing Pattern

## Mission

Most new code in a healthy codebase is *not* novel — it's a new instance of an existing pattern. New routes look like the other routes. New tests look like the other tests. New components look like the other components.

When Claude generates code from training data instead of the local pattern, the result "works" but breaks repo conventions: wrong logger, wrong error pattern, wrong import order, wrong naming convention, wrong test structure. The reviewer pushes back. Iterate. Three round-trips on style alone.

This skill prevents that by **reading first, writing second**.

## The procedure

### Step 1: Identify the peer

Find 1-2 existing files that are the closest analog to what you're about to create:

- New API route → read another API route in the same router
- New service/module → read another service/module with similar responsibilities
- New test → read another test in the same test directory at a similar layer
- New component → read another component of similar complexity

If you can't find a peer, STOP and either ask the user for a reference example, or fall back to general best practices and announce that you're doing so (so the reviewer knows).

### Step 2: Read it thoroughly

Not just skim. Look for:

- **Naming conventions:** camelCase / snake_case / kebab-case? Verb-noun order? Prefixes?
- **Error handling:** try/except patterns? Custom exception types? How are errors logged?
- **Logging:** which logger is used? At what levels? With what context?
- **Imports:** order, grouping, absolute vs relative
- **Comments:** docstring style? Inline comment density?
- **Tests:** assertion style? Fixture patterns? Mock conventions?
- **File structure:** what's at the top? What's at the bottom? Section dividers?

### Step 3: Write the new file to match

Write the new file *as if a contributor wrote it on the same team as the peer file*. Same imports order. Same error pattern. Same naming. Same docstring style.

### Step 4: Diff-check before claiming done

After writing, mentally compare the new file to the peer. Where do they diverge stylistically? For each divergence, ask: is this a deliberate improvement, or am I about to introduce inconsistency? Default toward consistency.

## When to deviate from the peer

Only when one of these is true:
1. The peer has a bug or anti-pattern you've identified explicitly (announce: "I'm not matching the peer's X pattern because Y.")
2. The user has explicitly asked for a different approach
3. The peer is from a different era and the codebase has migrated (verify by checking if newer files follow the same peer pattern)

If none of these apply, match the peer.

## Anti-patterns to avoid

- **Reading the peer then forgetting it.** If you read `users.py` for the auth pattern and then write `posts.py` with a completely different auth pattern, you didn't mimic — you just skimmed.
- **Mixing styles from multiple peers.** Pick ONE peer as the primary anchor. Use a second peer only for confirming the pattern is consistent across the codebase.
- **Cargo-culting structure that doesn't apply.** If the peer has a complex 3-layer abstraction because *its* problem needed it, don't copy the abstraction for a simpler new file. Match style, not unjustified complexity.

## What success looks like

A reviewer reads the new file and the peer file side by side. They can't tell at a glance which one is older. The naming, error handling, import order, test style, and comment density are consistent. No "this looks AI-generated" reaction.

## Trigger phrases

- "Add another route like `/users` for `/orders`"
- "Create a new test for X — follow the pattern in `tests/foo/test_bar.py`"
- "Build a component like Header but for Footer"
- `/mimic` followed by what to build
