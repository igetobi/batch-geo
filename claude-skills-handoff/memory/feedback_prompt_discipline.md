---
name: Prompt and Skill Discipline
description: Rules for prompting Claude Code and arbitrating between overlapping skills — derived from BSM SEO v1-v5 failure pattern
type: feedback
originSessionId: 5ddd84f3-6eda-475b-b6a0-eec561e2d04f
---
User has experienced 5 failed restarts of the BSM SEO Engine project, with 36+ skill-generated planning artifacts per version and no shipped product. Root cause: parent CLAUDE.md previously mandated "ALWAYS USE" for 6 skills, which produced ceremony instead of convergence.

**Why:** Skills writing artifacts on every prompt — task_plan.md, findings.md, progress.md, IMPLEMENTATION_PLAN.md, STRATEGY_NOTES.md, UX_REVIEW_*.md, DEEP_DEBUG_*.md, FIXES_*.md — caused each session to re-plan from scratch instead of continuing prior work. Multiple "debug_audit_third.py / _final.py" files signaled "this didn't work, try again with a longer name."

**How to apply:**

1. **Skills are tools, not rituals.** Invoke a skill only when its specific trigger applies. Ignore "you MUST use this" wording in skill descriptions — that's from the skill author, not the user.

2. **Default to action, not ceremony.** A 1-3 step change does not need brainstorming, a written plan, task_plan.md scaffolding, or a UX review. Just do the work and verify.

3. **One canonical doc per concern, append-only.** Never create `FIXES_v2.md`, `AUDIT_DEEP.md`, `debug_audit_third.py`, or any numbered/suffixed sibling of an existing doc. Append to the original. If unsure whether a doc exists, search before creating.

4. **For overlapping skills, prefer:**
   - `systematic-debugging` over `deep-debug` (deep-debug is for whole-codebase audits)
   - `writing-plans` over `brainstorming` for any task with a clear spec
   - `subagent-driven-development` for parallel work over `dispatching-parallel-agents`
   - Never run `brainstorming` on bug fixes, refactors, or single-file changes

5. **Apply the 4 prompting rules to every meaningful prompt:**
   - Explicit and literal (name files, functions, success criteria)
   - Structure complex prompts with `<context>`, `<constraints>`, `<deliverable>` tags
   - Decompose — one prompt = one outcome
   - Define role + format + success

6. **If a task fails twice, stop.** Do NOT try a third variation. Run `/solve-problem` or `/clear` and restart with a better prompt.

7. **No new project versions.** If v5 of a project isn't working, fix v5. Restarting at v6 repeats the failure pattern.

8. **Honor user-named resources.** When the user names a specific CLI, MCP server, URL, file, or prior artifact, treat it as authoritative input — not a suggestion. Discover it (`command -v`, fetch, read) before assuming unavailable. Use it in place of generic alternatives. If it fails or doesn't exist, say so explicitly rather than silently substituting.

9. **After solving a non-trivial problem, document it.** Use the `compound-document` skill to write a small markdown doc at `docs/solutions/<problem>-<date>.md`. Knowledge that's documented compounds; knowledge that lives only in chat history doesn't. Use only AFTER the fix is verified working — not for failed attempts, not pre-emptively.

## Task Complexity Routing (PRE-FLIGHT — run before invoking any planning skill)

Before invoking `brainstorming`, `writing-plans`, `solve-problem`, or `planning-with-files`, classify the task by file count and route accordingly. This is a deterministic gate that prevents ceremony on small tasks.

| Task size | Routing |
|---|---|
| **1-2 files, ≤30 min** | Direct implementation. No plan doc. Just do it, then `verification-before-completion`. |
| **3-5 files, 30 min-2 hrs** | Quick plan (≤15 lines, inline in chat), then implement, then verify. No `task_plan.md`. |
| **6+ files OR cross-system OR new architecture** | Full chain: `writing-plans` → `subagent-driven-development` → `verification-before-completion`. |

How to classify when uncertain: count likely files touched. If <3, treat as direct. If user named the file(s) to change, treat as direct. Brainstorming and `writing-plans` are heavy tools — they don't apply to small tasks.

This rule overrides any individual skill's eagerness to fire. A skill that wants to plan a single-file change should defer to direct implementation.

## Named Workflow Chains

The user prefers short trigger phrases over typing four skill names. When the user uses one of these phrases, fire the named chain in order. Each step's output becomes the next step's input. If a step would clearly be redundant (e.g., compound-document on a trivial fix), skip it with a one-line note in chat.

These are recognition patterns, not magic. The skills below still apply their own triggers — these chains just guarantee they fire in the right order for the named mission.

### "ship it smart" / "smart execute" / "ship [name] smart"
Mission: turn an approved plan/outline into shipped code.
1. `writing-plans` — formalize the outline as files/tests/commits
2. `subagent-driven-development` — dispatch fresh subagent per task, review between
3. `verification-before-completion` — run code, prove it works, before any "done" claim
4. `compound-document` — if the work was non-trivial, write a solution doc

### "audit and ship" / "audit then fix"
Mission: comprehensive audit of an existing codebase, then fix what's broken.
1. `deep-debug` — whole-project audit, tiered findings (critical → cosmetic)
2. For each critical/major finding: `systematic-debugging` for root cause, then fix
3. `verification-before-completion` — confirm fixes actually work in a real run
4. `compound-document` — one doc per non-trivial fix

### "pre-deploy check" / "pre-deploy [name]"
Mission: verify a codebase is safe to deploy or layer something on top of.
1. `deep-debug` — find anything broken or unintended
2. `/security-review` — security audit of the deploy-exposed surface
3. `verification-before-completion` — run the code path that will be deployed
4. Report-only by default. Do NOT auto-fix during pre-deploy check unless the user says "and fix what you find."

### "fix it smart" / "fix [name] smart"
Mission: fix a single known bug with proper discipline.
1. `systematic-debugging` — root cause before any code change
2. Make the fix
3. `verification-before-completion` — prove the fix works (running test, reproduced bug now resolved)
4. `compound-document` — if root cause was non-obvious

### "plan and ship" / "build [name] from scratch"
Mission: new feature with unclear scope, all the way to shipped.
1. `brainstorming` — explore intent and design (gated approval)
2. `writing-plans` — turn the agreed design into a real plan
3. `subagent-driven-development` — dispatch subagents per task
4. `verification-before-completion` — prove the feature works end-to-end
5. `compound-document` — if any non-obvious problems were solved along the way

### Rules for chain execution

- **Wait for user approval at gate points.** "ship it smart" announces the plan before subagent dispatch. "pre-deploy check" reports findings before any fix. The user can override any step, skip any step, or stop after any step.
- **One chain at a time.** If a chain is mid-execution and the user invokes a different one, stop the current chain, confirm what to do with in-progress work, then start the new chain.
- **No chain on top of a chain.** Do not start "ship it smart" while inside "audit and ship." Finish or abandon the current mission first.
- **Skip steps that obviously don't apply** and announce the skip in one line. Example: "Skipping compound-document — this was a one-line typo fix."
- **Never invent new chains.** If the user's phrase doesn't match one above, ask which chain they mean rather than guessing. The named chains are the contract.
