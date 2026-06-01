---
name: resolve
description: >
  Evaluate each PR review comment (human or AI reviewer) independently — accept, push back
  with rationale, or ask for clarification. Then implement accepted fixes in one batched
  commit, post responses to declined/clarified comments, and request re-review. Use when
  reviewing a PR with multiple comments, when handling AI-reviewer feedback, or when the
  user pastes review text and asks "what should I do with this?" Triggers on "resolve the
  review", "handle the PR feedback", "address these comments", or `/resolve`. DO NOT USE
  for a single comment with an obvious fix (just do it), or when the user wants to do the
  evaluation themselves.
---

# Resolve Review Feedback

## The failure mode this skill prevents

Reviewer leaves 12 comments. Claude implements all 12 without judgment. Three of them introduce bugs because the reviewer was wrong, two of them fight the original design, one of them is asking a clarifying question that didn't need code at all. Re-review fails. Iterate.

This skill replaces blind compliance with **evaluate each comment, then act**.

## The procedure

### Step 1: Read every comment before touching code

Read all comments first. Do not start fixing as you read. Aggregate them mentally before deciding the response strategy.

### Step 2: Classify each comment

For each comment, assign one of four labels:

| Label | Meaning | Response |
|---|---|---|
| **ACCEPT** | Reviewer is correct, fix is clear, low risk | Will fix in this round |
| **CLARIFY** | Reviewer's intent is ambiguous OR the suggested fix conflicts with another part of the design | Ask reviewer for clarification before acting |
| **PUSH BACK** | Reviewer is wrong, OR the suggestion would introduce a bug or break the design | Reply with rationale, do NOT implement |
| **DEFER** | Valid feedback but out of scope for this PR | Acknowledge, link to a follow-up task |

### Step 3: Surface the classification before acting

Before writing any code, show the user the classification grid:

```
| # | Comment summary | Classification | Reason |
|---|---|---|---|
| 1 | "rename foo to bar" | ACCEPT | matches existing naming |
| 2 | "this is O(n^2), make it O(n)" | PUSH BACK | n is bounded ≤ 50 by upstream validation |
| 3 | "missing test for edge case X" | ACCEPT | valid gap |
| 4 | "did you consider Y?" | CLARIFY | ambiguous — Y could mean two things |
| 5 | "use the existing util in `lib/foo.py`" | DEFER | refactor scope, separate PR |
```

The user reviews the classification and corrects any. Then proceed.

### Step 4: Batch the ACCEPTs into one commit

Implement all ACCEPT items in a single commit. Commit message lists which comments were addressed.

```
Address PR review (#42)

- Rename foo to bar (comment 1)
- Add test for edge case X (comment 3)

Pushed back on: 2 (n is bounded), 5 (out of scope, see follow-up)
Awaiting clarification on: 4
```

### Step 5: Post responses to PUSH BACK / CLARIFY / DEFER comments

For each non-ACCEPT comment, draft a reply that:
- States the classification clearly
- Gives the rationale (for PUSH BACK) or asks the specific question (for CLARIFY)
- Links to the new task or PR (for DEFER)

Format as GitHub-flavored markdown so it can be pasted directly into the PR thread.

### Step 6: Request re-review

After the commit and the replies, request re-review with a one-sentence summary of what changed and what didn't.

## Hard rules

- **Never implement every comment without evaluation.** Blind compliance produces worse code than the original.
- **Never push back without rationale.** "I disagree" is not a response. The reviewer is owed a specific reason.
- **Never silently defer.** If you're not doing something, say so — don't leave the reviewer thinking you missed it.
- **Never re-classify after acting.** Once an ACCEPT is committed, don't go back and call it PUSH BACK because it broke something. That means the original classification was wrong — own it.

## Edge cases

- **AI reviewer (Copilot, Cursor, /review).** Same procedure. AI reviewers are often correct but also confidently wrong on context-specific decisions. Don't grant them more authority than a human reviewer.
- **Reviewer with strong opinions you disagree with.** Push back respectfully with rationale. If they re-push, escalate to the user, don't capitulate.
- **Comment chain (reply-to-reply).** Read the whole chain before classifying. The original comment may have been resolved by a later reply.

## Trigger phrases

- "Resolve the PR review for #N"
- "Here's the review feedback: <paste>. What should I do?"
- "Handle these review comments"
- `/resolve <PR #>` or `/resolve` (uses current branch's PR)
