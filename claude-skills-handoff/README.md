# Claude Code Skills Handoff Package

A curated set of Claude Code skills, slash commands, and discipline rules. Designed to be dropped into a fresh Claude Code install on Windows, Mac, or Linux.

## What's inside

| Directory / File | Purpose |
|---|---|
| `skills/` | 33 skill directories — auto-trigger on description keywords or invokable as `/<name>` |
| `commands/` | 9 slash command files (the workflow chains: ship-it-smart, audit-and-ship, etc.) |
| `memory/` | 2 generic discipline files (prompt discipline + skill design principles) |
| `CLAUDE.md` | Universal project rules — skill arbitration, artifact discipline, caveman-lite default |
| `settings.example.json` | Reference settings (permissions, defaults). Adapt to your preference. |
| `INSTALL.md` | Step-by-step setup instructions |

## The 9 slash command chains (the main way to use these skills)

| Command | Mission |
|---|---|
| `/ship-it-smart` | Plan → subagents → verify → document |
| `/audit-and-ship` | Audit codebase → fix → verify → document |
| `/pre-deploy-check` | Audit + security review + verify, REPORT-ONLY |
| `/fix-it-smart` | Root-cause fix → verify → document |
| `/plan-and-ship` | Brainstorm → plan → subagents → verify |
| `/solve-loop` | Hypothesis loop on ONE problem, working-tree only |
| `/autopilot` | Iterate on whole mission, working-tree only |
| `/secure-sweep` | Multi-agent security audit + mission integrity check |
| `/quality-check` | Non-code output review |

## What was deliberately EXCLUDED

- Personal project memory files (specific projects, client info)
- `MEMORY.md` index (linked to personal memory files)
- The author's actual `settings.json` (uses `bypassPermissions` mode — set your own)
- Git history (clean handoff, not a fork)
- `.credentials.json` (auth tokens — never share)

## What two skills are pre-disabled

| Skill | Why disabled |
|---|---|
| `using-superpowers` | "1% chance you MUST invoke" trigger caused skill thrash on every prompt |
| `skill-creator` (standalone) | Anthropic's `anthropic-skills:skill-creator` plugin covers the same job |

To enable: rename `SKILL.md.disabled` back to `SKILL.md` in the skill directory.

## Next step

Read `INSTALL.md` for step-by-step setup instructions on your machine.
