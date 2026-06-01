---
name: calibrate
description: >
  When generating internal audits, quality scores, pass/fail assessments, or grading systems,
  validate against an external ground truth before claiming confidence. If internal score
  diverges from external standard by >20%, surface the gap explicitly and refuse to claim
  "passes" until reconciled. Use when running any quality gate, audit dimension, or scoring
  function, especially in domains where an external benchmark exists (SEO scoring, accessibility
  audits, security scans, performance benchmarks). Triggers on "is this passing", "audit
  the output", "score this", or `/calibrate`. DO NOT USE for purely internal correctness
  checks where no external standard exists.
---

# Calibration Check

## The failure mode this skill prevents

A roofing landing page scored **98/100** in the internal `quality.py` audit. The same page scored **31.5/100** when measured against the external Kubaitis SEO standard. A two-standard-deviation calibration error. The internal gates passed; the page was actually bad.

This skill stops the next instance of that. When Claude (or a Claude-generated audit system) is about to claim "passes," `calibrate` forces a reality check against ground truth.

## When to fire

This skill fires automatically when ANY of these are true:

- A quality score is being computed and a numeric pass/fail will be reported
- An internal audit dimension claims "passes" or "fails"
- A new gate, threshold, or scoring rule is being added
- The user asks "is this passing?" / "did the audit succeed?" / "is this good enough?"

If none of those apply, this skill does not fire.

## The procedure

### Step 1: Identify the external standard

For the domain in question, what's the most-authoritative external reference?

| Domain | External standards |
|---|---|
| On-page SEO | Kubaitis, Surfer, Clearscope, Page Optimizer Pro |
| Accessibility | axe-core, WAVE, Lighthouse a11y |
| Performance | Lighthouse perf, WebPageTest, Core Web Vitals |
| Security | OWASP ZAP, Snyk, Bandit, npm audit |
| Code quality | SonarQube, CodeClimate, Pylint, ESLint |
| Test coverage | line/branch coverage tools — but only if their config is reviewed |

If you cannot identify any external standard, STOP. Report: "No external calibration source for this domain. Internal score is the only signal. Confidence: low." Do not claim "passes."

### Step 2: Run the external check (or the closest available proxy)

Apply the external standard to the same artifact the internal score evaluated. Same page, same code, same scope.

If the external check is expensive or unavailable, use the smallest viable proxy:
- A single golden example with a known external score
- A reference page from a competitor that's known to rank
- A historical artifact whose external score is documented

### Step 3: Compute the gap

```
gap_percent = abs(internal_score - external_score) / max(internal_score, external_score) * 100
```

### Step 4: Decide

| Gap | Action |
|---|---|
| 0-10% | Internal is well-calibrated. Report both scores. Proceed. |
| 10-20% | Yellow flag. Report both scores. Note the divergence. Recommend tightening internal thresholds. |
| 20-40% | RED FLAG. Internal score is unreliable. Do NOT claim "passes." Report the gap, name the likely cause (thresholds too lenient? missing dimensions? wrong weights?). |
| >40% | Internal scoring system is fundamentally miscalibrated. Halt. Recommend a full audit of the scoring system before any pass/fail decision is taken. |

### Step 5: Update the internal system if calibration is off

If the gap is >20%, recommend specific changes to the internal scoring system:
- Which dimension is too lenient
- What threshold should change
- What new dimension is missing
- Whether weights need rebalancing

Do NOT silently rewrite the scoring system. Recommend, get user approval, then change.

## Hard rules

- **Never claim "passes" with a gap >20%.** Report the divergence and let the user decide.
- **Never adjust the internal score to match the external one.** That's gaming the metric. Adjust the internal *rules* to produce a more honest score next time.
- **Never invent an external standard.** If you don't know the canonical one for this domain, ask the user. Don't make up "industry best practice says..." without a source.

## What this skill is NOT

- Not a replacement for `verification-before-completion` (which checks code executes correctly)
- Not a replacement for `quality-check` (which judges output quality subjectively)
- This skill specifically handles the *scoring system's honesty*

## Trigger phrases

- "Is this audit passing?"
- "Did we hit the quality bar?"
- "Score this page"
- `/calibrate <artifact>`
- Automatic: any time Claude is about to write "PASSES" / "passes the audit" in a report
