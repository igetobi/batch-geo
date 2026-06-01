---
name: ux-review
description: >
  Post-build user experience review for a NEW user-facing surface. Use ONCE per genuinely
  new surface (page, flow, dashboard, modal) when explicitly requested ("ux review", "check
  the UX", "walk through this as a user", "test the flow"). DO NOT auto-fire after every
  UI change — most UI work is iterative on an existing surface. DO NOT create per-page
  files (UX_REVIEW_PAGE_X.md). Append all findings to ONE canonical UX_REVIEW_NOTES.md.
  If a UX review already exists for this surface within the last week, append a dated
  section instead of running a fresh review.
---

# UX Review — Post-Build User Experience Audit

Claude Code builds things that work. This skill checks if they're things
**people can actually use.**

The goal: walk through every feature as if you're a real user who doesn't
know how the code works, might do things in the wrong order, might leave
and come back, might have slow internet, and definitely won't read a manual.

---

## Step 0: Scope the Review

Identify what was just built or changed. Read the relevant code.

1. **What is this?** Tool, feature, page, flow, API with a frontend?
2. **Who uses it?** Technical user, non-technical end user, client, internal team?
3. **What's the primary task?** The one thing a user comes here to accomplish.
4. **What are the secondary tasks?** Other things they might do while here.

Understanding who the user is changes everything. A developer dashboard can
get away with things a client-facing tool cannot.

---

## Step 1: Walk the Happy Path

Before looking for problems, walk the intended flow start to finish.

Go through the primary task step by step:
1. How does the user get here? (entry point, navigation, link, redirect)
2. What do they see first? (initial state, empty states, loading)
3. What do they do? (click, type, select, submit)
4. What feedback do they get? (confirmation, progress, results)
5. How do they know it worked? (success state, output, redirect)
6. What do they do next? (next action, navigation, exit)

**Document any friction** — places where the user would hesitate, get confused,
or not know what to do next. Even on the happy path, friction matters.

Append findings to `UX_REVIEW_NOTES.md`.

---

## Step 2: State & Persistence Audit

This is where most builds break for real users. Claude Code builds for
the current session. Users live across sessions.

For every piece of state in the UI, ask:

### What happens when the user leaves and comes back?
- Is the state persisted server-side, or does it vanish on navigation?
- If a process is running (generation, upload, sync), does the UI still
  reflect that after a page refresh?
- If the user was mid-form, is their progress saved or lost?
- Does the URL reflect the current state? Can they bookmark or share it?

### What happens with multiple tabs/sessions?
- If the user opens this in two tabs, do they conflict?
- If another user is looking at the same data, do they see stale info?

### What's the initial state?
- First-time user: is there an empty state, or just a blank screen?
- Returning user with data: does it load their last state?
- Is there a loading state while data is being fetched, or does it flash
  from empty to populated?

**For every state issue found, note:**
```
- **[Feature/Page]** State issue: [what happens]
  Expected: [what should happen]
  Fix: [server-side persistence / polling / URL state / localStorage]
```

Append to `UX_REVIEW_NOTES.md`.

---

## Step 3: Error & Edge Case Sweep

Go through every interaction and ask "what if it goes wrong?"

### Input errors
- What happens with empty inputs? Null? Extremely long text?
- What happens with invalid data? Wrong format, special characters?
- Are there client-side validation messages BEFORE the form submits?
- Are error messages specific and actionable, or vague ("An error occurred")?

### Network & timing errors
- What happens if the API call fails? Timeout? 500? 404?
- Does the user see an error, or does it fail silently?
- What happens on slow connections? Is there a loading indicator?
- What happens if they double-click submit? Does it fire twice?
- What happens if they click submit and then navigate away?

### Data edge cases
- What happens with zero items? One item? 1,000 items?
- What happens with very long text in display fields? Does it overflow,
  truncate, or break the layout?
- What happens if the data they're looking at was deleted by someone else?

### Permission & auth edge cases
- What happens if their session expires mid-task?
- What happens if they access a URL they shouldn't have access to?

**For each issue:**
```
- **[Interaction]** Edge case: [scenario]
  Current behavior: [what happens now]
  Expected: [what should happen]
  Severity: [Critical/High/Medium/Low]
```

Append to `UX_REVIEW_NOTES.md`.

---

## Step 4: Feedback & Communication Audit

Users need to know what's happening at every moment. Check:

### Loading states
- Is there a spinner/skeleton/progress bar for every async operation?
- Is the submit button disabled while processing?
- For long operations (>3 seconds), is there a progress indicator
  or at minimum a "this may take a moment" message?

### Success feedback
- After every action, does the user get confirmation it worked?
- Is the confirmation clear and specific? ("Content saved" not just a
  green flash that disappears)
- For operations that take time, is there a status the user can check?

### Error feedback
- Are errors shown near the thing that caused them (not just a toast
  at the top of the page)?
- Do error messages tell the user what to DO, not just what went wrong?
  ("Enter a valid email" not "Validation error on field 3")
- Can the user recover from the error without starting over?

### Status communication
- For multi-step processes, does the user know which step they're on?
- For background processes, is there a visible status they can check?
- If something is processing, can the user safely leave and come back
  to check on it? (The content generator problem)

Append to `UX_REVIEW_NOTES.md`.

---

## Step 5: Navigation & Flow Audit

### Can the user find their way?
- Is the primary action obvious? (not buried in a menu)
- Can the user get back to where they were? (back button, breadcrumbs)
- After completing a task, are they taken somewhere useful?
  (not left on a "success" dead end)

### Destructive actions
- Is there a confirmation before delete/overwrite/send?
- Can the user undo? If not, is the confirmation prominent enough?
- Is the destructive button visually distinct? (red, separated, not next
  to the save button)

### Mobile / responsive (if applicable)
- Does the layout work on a phone?
- Are touch targets large enough? (minimum 44x44px)
- Does horizontal scrolling break anything?

Append to `UX_REVIEW_NOTES.md`.

---

## Step 6: Quality of Life & Feature Opportunities

Steps 1-5 catch problems. Step 6 asks: **what would make users love this?**

This is the difference between a tool that works and a tool people choose to
use. Think like a power user who's been using this tool for a month.

### Efficiency upgrades
- What 5-click workflow could be 2 clicks?
- Are there bulk actions for repetitive tasks? (select all, batch process,
  bulk edit, bulk delete)
- Can the user use keyboard shortcuts for frequent actions?
- Are there smart defaults that save time? (remember last settings,
  pre-fill based on context, auto-detect where possible)
- Is there a search or filter for lists with more than ~10 items?

### Workflow continuity
- Can the user pick up where they left off? (drafts, progress saving)
- Is there a history/log of what's been done? (generation history,
  change log, activity feed)
- Can they undo/redo the last action?
- Can they duplicate/clone existing items instead of starting from scratch?

### Power features
- Can they save templates or presets for repetitive setups?
- Can they export their data? (CSV, PDF, copy to clipboard)
- Is there a preview before committing? (preview before publish,
  preview before send, dry run)
- Can they compare before/after? (diff view, version comparison)

### Information density
- Does the user have to click into each item to see key info, or is it
  visible in the list/table view?
- Are counts and stats visible at a glance? (total items, progress
  percentage, last updated)
- Is the most important information visually prominent?

### Delight & polish
- Are transitions smooth or jarring?
- Does the interface respond instantly to interactions? (optimistic UI)
- Are empty states helpful? ("No content yet — click Generate to start"
  not just a blank screen)
- Does it remember user preferences? (sort order, view mode, filters)

**For each opportunity:**
```
- **[Feature]** QoL upgrade: [what to add]
  Why it matters: [how it improves the experience]
  Effort: [Low/Med/High]
```

Don't pad the list. Only suggest things that would genuinely improve the
experience for this specific tool and its users. A CLI tool doesn't need
smooth transitions. A bulk processing tool absolutely needs batch actions.

Append to `UX_REVIEW_NOTES.md`.

---

## Step 7: Compile & Prioritize

Read back `UX_REVIEW_NOTES.md`. Compile into a prioritized report:

```
# UX Review: [Feature/Tool Name]
## Date: [date] | Reviewer: Claude

## Summary
[2-3 sentences: overall usability assessment, biggest gap, top priority]

## Critical Issues (users will get stuck or lose data)
[Issues that block the primary task or cause data loss]

## High Priority (users will be confused or frustrated)
[Missing feedback, unclear states, error handling gaps]

## Medium Priority (friction that degrades experience)
[Slow interactions, missing confirmations, layout issues]

## Quality of Life Upgrades (features that make users love it)
[Efficiency gains, power features, workflow continuity improvements
from Step 6 — ranked by impact vs effort]

## Low Priority (polish)
[Nice-to-haves that improve perceived quality]

## State Persistence Checklist
[Quick yes/no for each feature: does state survive navigation?]
```

**Rules:**
1. Lead with what hurts users most
2. Every issue has a concrete fix, not just "improve this"
3. If the build is actually solid, say so — don't manufacture issues
4. Group related issues (e.g., all the missing loading states together)
5. Be specific: "The generate button has no loading state" not "loading
   states need improvement"
6. QoL upgrades go in their own section — they're not bugs, they're
   opportunities. Rank them by impact vs effort so the user can decide
   what's worth building.

Present the report. Then ask:

> "Want me to fix these? I can work through them priority by priority,
> or you can pick specific ones. The QoL upgrades are optional — tell me
> which ones are worth building."

If the user says yes, execute the fixes in priority order — critical first,
then high, then medium, then approved QoL upgrades. Follow deep-debug
Cross-Tier Rules: one fix at a time, verify after each, log everything.

---

## Quick Mode

For small features or minor updates, skip the full 6-step process.
Do a rapid pass instead:

1. Walk the happy path once
2. Answer these six questions:
   - Does state survive a page refresh?
   - Is there feedback for every action?
   - What happens when it fails?
   - Can the user get confused about what to do?
   - Are destructive actions protected?
   - What one feature would make this twice as nice to use?
3. Report findings

This takes 5 minutes instead of 30 and catches the worst issues.

---

## Output Files

- **`UX_REVIEW_NOTES.md`**: Running findings, written during each step
- Final report: presented in conversation + appended to notes file

Write to project root, or working directory if read-only.

---

## Progress Tracking

```
[x] Step 0: Scope identified
[x] Step 1: Happy path walked
[x] Step 2: State & persistence audited
[x] Step 3: Error & edge cases swept
[x] Step 4: Feedback & communication audited
[x] Step 5: Navigation & flow audited
[x] Step 6: Quality of life & feature opportunities
[ ] Step 7: Report compiled, presented to user
[ ] Fixes executed (if approved)
```
