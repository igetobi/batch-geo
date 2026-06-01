---
name: Skill Design Principles
description: Rules for writing and editing skill files — adapted from EveryInc's compound-engineering AGENTS.md after rejecting their full plugin install
type: feedback
originSessionId: 5ddd84f3-6eda-475b-b6a0-eec561e2d04f
---
When writing or editing any skill in `~/.claude/skills/`, apply these principles. Adapted from EveryInc's compound-engineering plugin AGENTS.md.

**Why:** Skills tend toward over-prescription (mandates that fire on every task) or under-prescription (vague guidance the agent ignores). The wrong calibration produced the BSM SEO v1-v5 artifact explosion. The rules below come from a team that ships these skills professionally.

**How to apply:**

## 1. Three-tier prescription — match the level to the failure mode

- **Hard rules** for deterministic safety. Use when the failure mode is bad enough that mechanical adherence is correct. Example: "don't silently `cd` to another repo and write outputs there."
- **Strong guidance with examples** for judgment calls where there's a clear bias to teach. Use bad-vs-good pairs anchored at the principle level. Example: "name the decision; don't expand it" with two contrasting examples.
- **Trust** for cases where prescription would harm. Codebase exploration tactics, how many clarifying questions to ask, when to lean on memory, prose phrasing — these vary by context. Over-prescription robs the agent of intelligence and memory.

**Test:** Can you name a specific bad outcome the prescription prevents? If yes, prescription is justified. If the rule exists "to be safe" without a concrete failure mode, lean toward trust.

## 2. SKILL.md content caches at session start; references load on demand

- Load-bearing rules (those that MUST fire reliably) go at the top of the relevant phase in SKILL.md, not just in a reference. References can be skipped.
- When a rule is duplicated across SKILL.md and a reference, both must update together. Drift confuses the agent — it follows whichever copy is loaded.
- Default to backtick paths (\`references/whatever.md\`) for large reference docs to keep skill load lean. Use full inline content only when the rule is short and must always fire.

## 3. Process exhaust stays out of artifacts

Engineering process metadata — "captured at Phase X.Y" notes, "## Next Steps pointing to skill Y," italic provenance lines — does NOT belong in user-facing docs.

**Test:** Would removing the section degrade a downstream reader's ability to evaluate the artifact correctly?
- Yes → audit content, keep it (e.g., `## Assumptions` in a headless-mode plan)
- No → process exhaust, strip it

## 4. Test the spec by running it, not just by reading it

When a real run reveals unexpected behavior, ask three questions BEFORE tightening the spec:

- Is the agent's behavior actually wrong, or is it expressing better judgment than the rule encoded?
- Did the spec drift between SKILL.md and references such that the agent saw inconsistent rules?
- Is this load-reliability (rule never reached) or rule-content (rule reached but produces wrong output)?

The fix differs by answer. Sometimes "fix the spec" means loosening over-prescription, not adding more rules. Sometimes the right answer is "accept the variance — the agent's adaptation was correct."

## 5. YAML frontmatter discipline

- `description:` ≤ 1024 characters (some harnesses reject longer)
- Quote `description:` if it contains colons (unquoted colons break js-yaml strict parsing)
- No raw angle-bracket tokens (`<placeholder>`) in descriptions — backtick-wrap or rephrase
- `name:` matches directory name, lowercase-hyphenated

## 6. Split orthogonal decisions into sequential questions

When a blocking question's options span multiple decision axes (e.g., "where to operate" AND "which approach"), users have to reason about both axes simultaneously and options end up underspecified. Use sequential menus — one axis at a time.

## When to violate these rules

Never. If a rule blocks the work, the rule is wrong — propose the edit to this file first.
