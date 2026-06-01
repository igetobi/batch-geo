# Install Instructions

These instructions assume you've already installed Claude Code on your machine and run it at least once (so `~/.claude/` exists).

If you haven't, install it first: https://code.claude.com/docs/en/install

## Setup on Windows

### Part 1: Open PowerShell as Administrator

1. Click **Start**, type `PowerShell`
2. Right-click **Windows PowerShell** → **Run as administrator** → **Yes**

### Part 2: Unzip this package somewhere stable

Pick a permanent location for the package. Suggested: `C:\Users\<yourname>\claude-config\`

After unzipping, you should have:
```
C:\Users\<yourname>\claude-config\
├── skills\
├── commands\
├── memory\
├── CLAUDE.md
├── settings.example.json
├── README.md
└── INSTALL.md (this file)
```

### Part 3: Back up your existing Claude Code config (safety net)

```powershell
Move-Item "$env:USERPROFILE\.claude\skills" "$env:USERPROFILE\.claude\skills.OLD-BACKUP" -ErrorAction SilentlyContinue
Move-Item "$env:USERPROFILE\.claude\commands" "$env:USERPROFILE\.claude\commands.OLD-BACKUP" -ErrorAction SilentlyContinue
```

No output means it worked. (The `-ErrorAction` part means: if there's nothing to back up, don't error.)

### Part 4: Connect the package's skills + commands into Claude Code

Using **junctions** so files stay in one place but Claude Code can find them. Replace `<path-to-package>` with where you unzipped the package.

```powershell
$pkg = "C:\Users\<yourname>\claude-config"   # change this to your actual path
cmd /c "mklink /J `"$env:USERPROFILE\.claude\skills`" `"$pkg\skills`""
cmd /c "mklink /J `"$env:USERPROFILE\.claude\commands`" `"$pkg\commands`""
```

Expected output: "Junction created for ..." messages.

### Part 5: Install the memory files

Find your project hash folder:

```powershell
ls $env:USERPROFILE\.claude\projects
```

You'll see one or more folder names like `C--Users-<yourname>`. Pick the one matching your username.

Then (replace `<hash>` with the actual folder name):

```powershell
$hash = "<hash>"   # e.g. "C--Users-john"
$pkg = "C:\Users\<yourname>\claude-config"   # your package path

Move-Item "$env:USERPROFILE\.claude\projects\$hash\memory" "$env:USERPROFILE\.claude\projects\$hash\memory.OLD-BACKUP" -ErrorAction SilentlyContinue

cmd /c "mklink /J `"$env:USERPROFILE\.claude\projects\$hash\memory`" `"$pkg\memory`""
```

You may also want to create a `MEMORY.md` index file. A minimal version:

```powershell
@'
- [Prompt and Skill Discipline](feedback_prompt_discipline.md) — skills are tools not rituals; 4 prompting rules; task-complexity routing; 7 named workflow chains
- [Skill Design Principles](feedback_skill_design.md) — three-tier prescription; process exhaust stays out of artifacts; test specs by running not reading
'@ | Out-File -Encoding utf8 "$env:USERPROFILE\.claude\projects\$hash\memory\MEMORY.md"
```

### Part 6: Set up the parent project CLAUDE.md

Place the CLAUDE.md in YOUR projects directory (wherever your code lives). If your projects are at `~/projects/`:

```powershell
Copy-Item "$pkg\CLAUDE.md" "$env:USERPROFILE\projects\CLAUDE.md"
```

This file applies to ALL projects under `~/projects/`. Individual project subdirectories can have their own CLAUDE.md that overrides parent rules.

### Part 7: Optionally set up settings.json

Review `settings.example.json` and adapt to your needs. Notable settings:
- `defaultMode: "bypassPermissions"` — bypasses permission prompts. ONLY enable if you understand the risk.
- `effortLevel: "high"` — more thorough thinking, costs more tokens

If you want to use it:
```powershell
Copy-Item "$pkg\settings.example.json" "$env:USERPROFILE\.claude\settings.json"
```

### Part 8: Verify

```powershell
ls $env:USERPROFILE\.claude\skills
```

You should see 33 skill folders: `autopilot`, `brainstorming`, `calibrate`, `caveman`, ...

Open Claude Code. Type `/` — you should see the chain commands in the dropdown: `/ship-it-smart`, `/audit-and-ship`, `/pre-deploy-check`, `/fix-it-smart`, `/plan-and-ship`, `/solve-loop`, `/autopilot`, `/secure-sweep`, `/quality-check`.

If you see them, you're done.

---

## Setup on Mac/Linux

### Part 1: Unzip the package

```bash
mkdir -p ~/claude-config
unzip claude-skills-handoff.zip -d ~/claude-config
# or move contents to wherever you want
```

### Part 2: Back up existing config

```bash
[ -d ~/.claude/skills ] && mv ~/.claude/skills ~/.claude/skills.OLD-BACKUP
[ -d ~/.claude/commands ] && mv ~/.claude/commands ~/.claude/commands.OLD-BACKUP
```

### Part 3: Symlink skills + commands

```bash
ln -s ~/claude-config/skills ~/.claude/skills
ln -s ~/claude-config/commands ~/.claude/commands
```

### Part 4: Install memory files

Find your hash:

```bash
ls ~/.claude/projects
```

Then:

```bash
HASH="<your-hash>"   # e.g. "-Users-john"
[ -d ~/.claude/projects/$HASH/memory ] && mv ~/.claude/projects/$HASH/memory ~/.claude/projects/$HASH/memory.OLD-BACKUP
ln -s ~/claude-config/memory ~/.claude/projects/$HASH/memory
```

### Part 5: Parent CLAUDE.md

```bash
cp ~/claude-config/CLAUDE.md ~/projects/CLAUDE.md
```

### Part 6: Verify

```bash
ls ~/.claude/skills
# Should show 33 skill folders
```

---

## What's Inside — Quick Reference

### The 9 slash command chains

| Command | When |
|---|---|
| `/ship-it-smart` | For any non-trivial build with clear scope |
| `/audit-and-ship` | Whole-codebase audit → fix what's broken |
| `/pre-deploy-check` | Verify safe to deploy / layer on. Report-only |
| `/fix-it-smart` | Single known bug with root-cause discipline |
| `/plan-and-ship` | New feature with unclear scope, all the way to shipped |
| `/solve-loop` | Autonomous hypothesis-loop on one problem |
| `/autopilot` | Step away — autonomous loop on whole mission |
| `/secure-sweep` | Multi-agent security audit + mission integrity check |
| `/quality-check` | Judge non-code outputs (content, HTML, reports) |

### The 4 task-complexity rules (from CLAUDE.md)

| Task size | Routing |
|---|---|
| 1-2 files, ≤30 min | Direct implementation, no plan |
| 3-5 files, 30 min-2 hrs | Quick inline plan, then implement |
| 6+ files OR cross-system | Full chain via `/ship-it-smart` |

### Communication default

The parent CLAUDE.md sets caveman-lite as the default — no filler, no hedging, no sycophantic openers. Articles and full sentences kept (readable, not text-message-stub).

To change intensity anytime: `/caveman full`, `/caveman ultra`, or `stop caveman`.

---

## Troubleshooting

### "Claude Code doesn't see the skills"

Close Claude Code completely and reopen. Skills load at startup.

### "Junction created but files aren't readable"

Run as Administrator. Junctions usually work without admin, but some Windows setups require it.

### "I want to undo everything"

```powershell
Remove-Item "$env:USERPROFILE\.claude\skills" -Force        # removes junction, not source
Remove-Item "$env:USERPROFILE\.claude\commands" -Force
Move-Item "$env:USERPROFILE\.claude\skills.OLD-BACKUP" "$env:USERPROFILE\.claude\skills"
Move-Item "$env:USERPROFILE\.claude\commands.OLD-BACKUP" "$env:USERPROFILE\.claude\commands"
```

---

## What to learn first

1. Read `README.md` (this folder) and `CLAUDE.md` first.
2. Try `/solve-problem` on a real problem you're stuck on — that's the strategic-thinking skill.
3. Try `/ship-it-smart` on your next non-trivial build.
4. The `feedback_prompt_discipline.md` memory file is the most important — it has the discipline rules that make everything else work.
