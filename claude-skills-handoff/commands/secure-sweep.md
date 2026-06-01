---
description: Multi-agent security audit — spawns specialist subagents in parallel, generates fix paths, runs mission-integrity check on each fix. REPORT-ONLY.
argument-hint: "<project or codebase to audit — path or 'this project'>"
---

# Secure Sweep

Execute the `secure-sweep` skill on:

$ARGUMENTS

## Activate the secure-sweep skill

Use the `secure-sweep` skill. Follow its phases:

1. **Phase 0: Stack detection** — identify WordPress, Python/FastAPI, Node/React, or mixed
2. **Phase 1: Mission anchor** — read CLAUDE.md / MISSION.md / README.md for stated capabilities
3. **Phase 2: Parallel specialist dispatch** — spawn relevant security specialists in parallel
4. **Phase 3: Aggregation** — dedupe + group findings
5. **Phase 4: Fix path generation** — concrete fix code, files, tests
6. **Phase 5: Mission integrity check** — flag fixes that would break stated capabilities
7. **Phase 6: Final report** — tiered CRITICAL / MAJOR / MINOR with mission-conflict flags

## HARD RULES

- **REPORT ONLY** — never auto-apply fixes
- **NO `git commit` / `git push` / destructive ops**
- **NO file modifications** beyond writing the final report
- **Subagents return findings as text only** — they don't write files or edit code
- **Every finding must cite file:line** — no invented findings
- **Mission integrity check is mandatory** — every fix gets OK / CONFLICT / UNKNOWN

## Output

The final report goes to `docs/security/sweep-<YYYY-MM-DD>.md` (or project root if no docs/ dir).

After the report is delivered, the user reviews and decides what to apply. To apply, they invoke:
- `/fix-it-smart <finding ID>` for individual findings
- `/audit-and-ship` to batch-apply with full verification

## What this does NOT do

- Does NOT cover business-logic flaws
- Does NOT replace penetration testing
- Does NOT auto-apply any fix
- Does NOT modify the verifier/mission file mid-run

Begin Phase 0 now.
