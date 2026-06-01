---
name: solve-problem
description: >
  Deep problem-solving and strategic thinking skill. Use whenever Claude Code needs to
  think harder about a problem instead of just executing. Triggers on: "strategize",
  "deep strategize", "think about this", "step back", "what's the best way to",
  "is there a better way", "I'm stuck", "help me figure this out", "plan this out",
  "how should I approach this", "this isn't working and I don't know why", "rethink this",
  "I keep running into the same problem", or any situation where the user needs strategic
  thinking rather than code execution. Also use when Claude Code has tried something 2+
  times and it's not working — stop executing and start thinking.
---

# Deep Strategize — Problem Solving Engine

This skill is for when you need to **think, not type.** Stop writing code. Stop
executing. Step back and solve the actual problem first.

Deep-debug fixes broken code. Deep-strategize figures out **what you should be
building and how** — before you waste more time building the wrong thing, or
building the right thing the wrong way.

This skill follows the **Plan → Work → Review → Compound → Repeat** loop from
Anthropic engineering practice (see references/). Steps 1-6 cover Plan + Review.
Execution = Work. Steps 7-8 are the Compound step that makes this skill itself
improve over time. Most analysts skip Compound and lose the lessons. Don't.

---

## OUTPUT DISCIPLINE (read first, apply throughout every response)

These rules apply to every output you produce while this skill is active.

**Strip sycophantic openers.** Never open a response with "Great question,"
"Sharp question," "You're absolutely right," "Fair point," "Exactly," "Spot on,"
"Good catch," or any evaluative label on the user's input. State conclusions
directly. The user can tell whether you understood by what you say next, not by
how you label what they said. Sycophantic openers train the analyst to please
rather than to think.

**"I don't know" is a valid output.** When you lack information to recommend
confidently, say so and name the specific gap. Example: "I don't know if your
constraint X is hard or soft — that determines which of these solutions fits.
Can you tell me?" This is different from multi-choice dodging.

**No multi-choice at decision points.** If you're about to write "do you want
(a), (b), or (c)?" — stop. Pick one with explicit reasoning. Let the user
override. Multi-choice is appropriate ONLY when the user has unique context you
lack (e.g., business preferences, risk tolerance specific to their situation).
Otherwise it's outsourcing the call.

**Estimate honestly.** Don't use "weeks" or "multi-week" without specific
evidence. Most planned work is hours-to-days when parallelized across multiple
AI agents. If you're tempted to say "this is a multi-week project," check
whether you mean it or whether you're just signaling "this is big."

---

## Step 0: What Kind of Problem Is This?

Read the user's situation and classify:

**Type 1 — "I'm stuck"**
Something isn't working and they've tried multiple things. The problem might be
technical, architectural, or they might be approaching it from the wrong angle
entirely.

**Type 2 — "Is there a better way?"**
Something works but feels wrong — bloated, fragile, slow, ugly, unmaintainable.
The code does the job but the approach might be fundamentally off.

**Type 3 — "How should I build this?"**
Nothing exists yet. They need to think through the approach before writing code.

**Type 4 — "I keep hitting the same wall"**
A recurring problem that keeps showing up across different parts of the project.
The individual instances get fixed but the pattern keeps repeating. This is
almost always a systemic/upstream issue.

**Type 5 — "This is complex and I need to think it through"**
The problem has multiple moving parts, competing constraints, or the user
doesn't know what they don't know. Needs structured thinking before any action.

Don't announce the type — just use it to calibrate how deep you go.

---

## Step 1: Understand the Problem (Before Solving Anything)

**Do not propose solutions in this step.** Understand first, solve later.

### 1A: State the problem back

In your own words, state what you think the problem is. This catches
misunderstandings before they cascade. Ask the user: "Is this right, or
am I missing something?"

### 1B: Gather context the user didn't provide

The user knows what they told you. They don't know what you need to know.
Proactively investigate:

- Read the relevant code/files/configs — don't just take the user's description
- **Read project-intent docs FIRST** (look for MISSION.md, README.md, ARCHITECTURE.md,
  PAGE_CONTRACT.md, STRATEGY_NOTES.md, CHANGELOG.md, or equivalent before reading code).
  Code tells you what IS; docs tell you what's INTENDED. Don't propose changes against
  what is without checking what's intended.
- Check what's been tried already (git log, conversation history, existing files)
- Identify what the system is supposed to do vs what it actually does
- Look for constraints the user might not have mentioned (platform limits,
  dependencies, existing architecture that can't change)

### 1C: Ask the right questions

Ask 2-3 targeted questions maximum. Not a laundry list. Focus on:
- What does success look like? (defines the goal)
- What can't change? (defines the constraints)
- What have you already tried? (prevents repeating failed approaches)

### 1D: Generate three plausible alternative readings

**Before** stating the problem back, list 3 plausible alternative readings of
what the user is asking. If you can only think of one interpretation, you
haven't understood it yet — you've anchored on the first plausible frame.

Example: "Fix the page generation cost" could mean:
- (a) reduce per-page cost across the board
- (b) make hubs specifically cheaper (different from money pages)
- (c) make the cost more predictable even if not lower
- (d) the cost is showing a structural problem deeper than money

If you can't generate 3 alternatives, you don't have enough context yet. Go
back to 1B.

This prevents the most common failure mode in any analysis: jumping on the
first interpretation and building elegant solutions against the wrong problem.

### 1E: Make falsifiable predictions and verify them

**Before** proposing solutions, articulate 2-3 things that should be observable
if your understanding is correct. Then verify.

Example: "If my hypothesis is right, function X should be called from Y. File Z
should contain a TODO comment about W. The error log should show pattern P."
Then check. If predictions don't hold, your model is wrong — back to Step 1.

This is the structural gate between "I have a hypothesis" and "I understand the
problem." Skipping it produces confident misdiagnoses. Eager analysts skip it.

### 1F: Map the user's existing working process

If the user has a working manual process for the thing being automated (a
spreadsheet, a checklist, a written SOP), count its inputs, count its steps,
count its assumptions. Your proposed solution should mostly automate that
process — not invent new abstractions. If your solution has 3x more steps than
the manual one, justify each step explicitly or strip it.

Append your understanding to `STRATEGY_NOTES.md`.

---

## Step 2: Find the Real Problem

The stated problem is almost never the real problem. Dig deeper.

### Stable model checkpoint (every turn)

At the start of every conversation turn after Step 1, compare your current
problem model to the previous turn's model. If it changed, name what evidence
forced the change. Frequent unforced changes mean your understanding isn't
stable enough. Stop and go back to Step 1.

### The Upstream Chain

Ask "why?" until you hit a **decision** — not a symptom, not a bug, but a
choice that was made (or not made) that caused the problem to exist.

```
Symptom: [What the user sees]
  → Why? [One level deeper]
  → Why? [Another level]
  → Root: [The decision or missing decision that causes this]
```

### Reframe the problem

Once you have the root, restate the problem at the right level:

- **Wrong**: "The HTML output is 339KB" (symptom)
- **Better**: "There's no shared style system" (cause)
- **Best**: "The generator architecture treats each section as a standalone
  document" (decision that needs changing)

- **Wrong**: "The webhook isn't firing" (symptom)
- **Better**: "The endpoint URL changed and isn't updated" (cause)
- **Best**: "There's no config management — URLs are hardcoded in 12 places"
  (systemic issue)

- **Wrong**: "Claude Code keeps writing bloated code" (symptom)
- **Better**: "There are no style/architecture guidelines in the project" (cause)
- **Best**: "The project has no CLAUDE.md or design system that constrains
  output" (fixable upstream)

Share the reframed problem with the user. **Get confirmation before proceeding.**
If you solve the wrong problem perfectly, you've wasted everyone's time.

Append to `STRATEGY_NOTES.md`.

---

## Step 3: Challenge the Framing

Before generating solutions, challenge everything — including your own
assumptions from Step 2.

### Six challenges to run:

1. **"Does this problem actually need solving?"**
   Sometimes the problem is real but the impact doesn't justify the effort.
   Is this a 10-hour fix for a 1-hour annoyance?

2. **"Am I solving the right problem at the right level?"**
   Too shallow = patch that'll break again. Too deep = rewriting the universe
   when a config change would do. Find the level where effort and impact meet.

3. **"What would happen if we did nothing?"**
   Seriously. What's the actual cost of leaving this as-is? If the answer is
   "not much," maybe the problem is lower priority than it feels.

4. **"Who else has solved this?"**
   Use web search. Search for "[problem] + solution", check if existing tools,
   libraries, or patterns solve this. Don't reinvent what exists.

5. **"What would I tell someone else to do?"**
   Remove yourself from the sunk cost. If a friend showed you this codebase
   and asked for advice, what would you say?

6. **"Am I cargo-culting structure?"**
   If you're about to adopt a pattern from another system (a reference design,
   a competitor's approach, the user's existing workflow), VERIFY it actually
   produces the claimed result. Open it. Run it. Confirm the structure is
   doing the work you think it is. If you can't verify, label it as folklore
   and proceed cautiously. Don't anchor on unverified patterns.

Document which challenges changed your thinking and which didn't.

Append to `STRATEGY_NOTES.md`.

---

## Step 4: Generate Solutions

Now — and only now — generate solutions. You've earned the right to propose
things because you actually understand the problem.

### How to generate genuinely different solutions:

Think along these axes:
- **Eliminate**: What if we removed the thing causing the problem entirely?
- **Automate**: What if a system prevented this problem from occurring?
- **Simplify**: What if we solved 80% of the problem with 20% of the effort?
- **Restructure**: What if we reorganized so the problem can't exist?
- **Buy**: What if an existing tool/library solves this?
- **Constrain**: What if we added rules/guidelines that prevent the bad pattern?

### For each solution:

```
### Solution [N]: [Name]

**Core idea**: [One sentence]
**How it works**: [3-5 sentences]
**What it solves**: [Which aspects of the root problem]
**What it costs**: [Effort, tradeoffs, risks]
**Falsifiable prediction**: [What should be observable if this works?
                              Concrete enough that we'd know if it failed.]
**Best if**: [When this is the right choice]
```

**Rules**:
1. 2-4 solutions. Not 1 (too narrow), not 6 (too scattered).
2. At least one must be radically simpler than expected
3. "Just fix the code" is NOT a solution — that's deep-debug territory
4. Every solution must be actionable — no theoretical handwaving
5. Be honest about tradeoffs — no solution is free
6. If you can't predict the effect of a solution, it's not specified enough yet

Append to `STRATEGY_NOTES.md`.

---

## Step 5: Recommend and Plan

### Make the call

Pick the best solution and say why. Be direct:

"Go with Solution 2. It solves the root problem, the effort is reasonable, and
it prevents the issue from recurring. Solution 1 is simpler but it's a patch —
you'll be back here in a month. Solution 3 is better long-term but the effort
isn't justified at your current scale."

If it's genuinely close, say what would tip it: "If you're under 20 sites,
Solution 1. Over 20, Solution 3."

### Required: scope-drift comparison

Every recommendation must include a one-line summary:

> *"Original ask: X. Current proposal: X + Y + Z, justified because [specific reason]."*

If you can't justify Y or Z, strip them. Scope grows silently otherwise — every
round of user feedback tempts you to ADD instead of FOCUS. The comparison line
forces you to make the growth visible.

### Build the plan

Once the user agrees (or picks differently), create the implementation plan:

```
# Implementation Plan: [Problem] → [Solution]
## Date: [date]

## What we're doing and why
[2-3 sentences — the root problem and chosen solution]

## Steps
1. [ ] [Concrete action — completable in one session]
2. [ ] [Next action]
3. [ ] ...
N. [ ] [Final action]

## How we'll know it worked
[What's different when this is done — measurable if possible]

## Risks
- [What could go wrong] → [How to handle it]

## Rollback
[How to undo this if it doesn't work]
```

**Rules**:
1. Each step is one Claude Code session of work
2. The system works after every step — no "broken until step 7"
3. Front-load the riskiest step (fail fast)
4. For big changes, step 1 should be a proof-of-concept
5. Steps should be concrete enough for Claude Code to execute without
   needing further strategic thinking — that's the handoff

Save to `IMPLEMENTATION_PLAN.md`.

---

## Step 6: Sanity Check

Before anyone writes code:

1. Does this solve the **root** problem, not just the symptom?
2. Is this the **simplest** solution that works?
3. Can we **prove it** with a small test before going all-in?
4. Is it **worth the effort** relative to the problem's impact?
5. Did I run my falsifiable predictions from Step 1E? Did they hold?
6. Did I generate 3 alternative readings in Step 1D? Did I rule them out?

If any answer is no, go back to the relevant step. If all yes, proceed.

---

## Step 7: After Execution — Review

The Plan → Work → Review → Compound → Repeat loop (from Anthropic engineering
practice — see references/) doesn't end when the code ships. After the user
executes the recommendation (or any chunk of it), explicitly review:

1. **What happened that we predicted?**
   Confirm the model. Predictions that held = the model is calibrated for this
   problem class.

2. **What happened that we didn't predict?**
   These are the failure modes we missed. Each one is a candidate skill update.

3. **What did the user push back on?**
   Pushbacks are signal — they reveal where reasoning was off, where the
   analyst was over- or under-engineering, where assumptions didn't match
   user intent. Don't dismiss pushbacks as preference; treat them as data.

4. **What would have prevented the mistake?**
   Specifically: "If this skill had told me to X, I wouldn't have done Y."

Document findings in `STRATEGY_NOTES.md` under "Post-execution review."

---

## Step 8: Compound — Update the Skill AND Document the Problem

This is the step most analysts skip. It's the step that makes everything else
worth doing.

**Two compounding loops, both required:**

1. **Skill compounding** (this step, original meaning) — update *this* skill so the next /solve-problem session inherits today's lesson. Details below.
2. **Knowledge compounding** — if the problem was non-trivial and got resolved, invoke the `compound-document` skill to write a small searchable doc at `docs/solutions/<problem>-<date>.md`. Skill updates compound the *process*; solution docs compound the *answers*. Both are needed; neither replaces the other.

Reference quote from Anthropic engineering:
> *"Every time you run a skill and the output isn't exactly what you want, ask
> yourself one question. Is this a one-time fix or should this be in the skill
> forever? If it's forever, update the skill. Add the rule, the example, the
> edge case."*

> *"Anthropic engineers use a skill, get the output, then update the skill so
> that there's a compounding loop that improves over time."*

After Step 7, run this prompt against the conversation history:

> *"Review the back and forth I had while using /solve-problem in this session.
> What mistake did I make that this skill should have prevented? Propose a
> specific addition to the skill (a new step, a new check, a new rule) that
> would prevent the same mistake in future sessions. The addition must be
> universal — work across any project, not just this one — and concrete enough
> that following it would change behavior."*

If the answer surfaces a real improvement:
- **Universal patterns** (would apply to any /solve-problem invocation) → edit
  this file directly at `C:\Users\bmsbr\.claude\skills\solve-problem\SKILL.md`
- **Project-specific patterns** → add to the project's CLAUDE.md or equivalent
- **Domain-specific patterns** (e.g., "always check X before designing Y for
  Python projects") → suggest a new specialized skill via skill-creator

Don't just note improvements. UPDATE the file. The skill compounds only when
the updates land.

Reference: *"Our goal is that Claude on day 30 of working with you is going to
be a lot better than Claude on day one."*

If the user has switched contexts and won't return to /solve-problem for a
while, save the compound recommendations to `SKILL_IMPROVEMENTS_PENDING.md` in
the skill directory so they're not lost.

---

## When to Escalate to Opus

Some problems are genuinely hard — multiple valid approaches, subtle tradeoffs,
competing constraints. If you hit this at any point, draft a brief for the user
to bring to Claude.ai chat (Opus):

```
# Problem Brief: [Title]

## Situation
[What exists, who it's for, current state]

## The Real Problem
[Root cause — from Step 2]

## Constraints
[What can't change — budget, platform, timeline, dependencies]

## Solutions Under Consideration
[2-4 solutions from Step 4 with tradeoffs]

## The Decision I Can't Make
[The specific tradeoff or question that's unclear]

## My Lean
[What I'd pick and why — so Opus can pressure-test it]

## Code/Context to Attach
[List key files the user should attach when pasting this into Claude.ai]
```

Save to `PROBLEM_BRIEF.md`. Tell the user: "Copy this into Claude.ai chat and
attach the files I listed. Bring back the recommendation and we'll build the
plan here."

---

## When NOT to Use This Skill

- The code is broken and needs fixing → `/deep-debug`
- Quick feature addition within existing architecture → just build it
- The user already knows what they want and just needs execution → just do it

**The test**: If the problem is "the code doesn't work," use deep-debug.
If the problem is "I don't know what to build or how to build it," use
deep-strategize.

---

## Tools Layer (the part most analysts skip)

Per Anthropic engineers, a skill is more than instructions — it has three layers:
1. **Description** (when to use) — the YAML frontmatter
2. **Instructions** (how to use) — most of this file
3. **Tools** (deterministic templates/scripts/checklists) — what most skills lack

This skill's tools:

- **`STRATEGY_NOTES.md` template** — running analysis from Steps 1-4, appended
  incrementally as the analyst works
- **`IMPLEMENTATION_PLAN.md` template** — the action plan from Step 5
- **`PROBLEM_BRIEF.md` template** — only if escalating to Opus
- **`WORK_LOG.md` template** — comprehensive checkpoint when work pauses or
  switches contexts (so the next session can resume without losing state)
- **Three-readings discipline** — Step 1D
- **Falsifiable-prediction discipline** — Steps 1E + 4
- **Scope-drift comparison line** — required in every Step 5 recommendation
- **Skill-improvement prompt** — Step 8

The reason a tool beats prose: tools are deterministic. The same input
produces the same output. Prose instructions get interpreted, sometimes
skipped, sometimes embellished. Tools force structure.

---

## Output Files

- **`STRATEGY_NOTES.md`**: Running analysis (Steps 1-4 + Step 7 post-execution
  review), written incrementally as you work through each step
- **`IMPLEMENTATION_PLAN.md`**: The action plan (Step 5)
- **`PROBLEM_BRIEF.md`**: Only if escalating to Opus
- **`WORK_LOG.md`**: Comprehensive context dump when pausing/switching gears
- **`SKILL_IMPROVEMENTS_PENDING.md`** (in skill dir): Step 8 outputs that
  haven't been merged into the skill yet

Write to project root, or working directory if read-only.

---

## Progress Tracking

```
[ ] Step 0: Problem type identified
[ ] Step 1A-F: Problem understood, three readings generated, predictions verified, confirmed with user
[ ] Step 2: Root problem found (upstream chain, stable model)
[ ] Step 3: Framing challenged (six challenges run)
[ ] Step 4: Solutions generated (each with falsifiable prediction)
[ ] Step 5: Recommendation made, scope-drift line included, plan created
[ ] Step 6: Sanity check passed
[ ] === HANDOFF TO EXECUTION ===
[ ] Step 7: Post-execution review completed (what happened vs predicted, pushbacks documented)
[ ] Step 8: Skill update proposed and applied (or saved to SKILL_IMPROVEMENTS_PENDING.md)
```

---

## References

Source material for this skill's compound loop:
- `references/anthropic-engineers-claude-code-prompting.txt` — transcript of
  Anthropic engineers' Code Summit talk on skills, tools, and the compounding
  improvement loop
- `references/claude-plugins-compound-engineering.txt` — transcript of the
  Compound Engineering plugin walkthrough (Plan → Work → Review → Compound →
  Repeat 5-step loop)

These transcripts are durable evidence for the skill's structure. If the skill
needs to be re-derived from first principles, start there.
