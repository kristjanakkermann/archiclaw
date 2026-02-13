---
name: entire
description: Track AI agent sessions with entire.io. Use when setting up session tracking, reviewing agent work history, rewinding to previous checkpoints, or debugging session issues. Covers entire enable, status, explain, rewind, resume, doctor, and reset commands.
metadata:
  { "openclaw": { "emoji": "📸", "requires": { "bins": ["entire"] }, "install": "brew tap entireio/tap && brew install entireio/tap/entire" } }
---

# entire.io - AI Session Tracking

entire.io captures agent work (prompts, responses, file changes) as checkpoints alongside git commits. It uses a shadow branch to store session data without polluting your main history.

## Setup

```bash
# Install
brew tap entireio/tap && brew install entireio/tap/entire

# Enable in repo (manual-commit is the default and recommended strategy)
entire enable

# Verify
entire status
```

**Strategies:**
- `manual-commit` (default) — checkpoints on git commit. Safe for multi-agent work.
- `auto-commit` — checkpoints automatically. Use `--strategy auto-commit` with `entire enable`.

## Core Commands

### Status

```bash
entire status
```

Shows: enabled/disabled, strategy, active session info.

### Explain

Browse and understand agent work history.

```bash
# List checkpoints on current branch
entire explain

# Filter by session
entire explain --session <id-or-prefix>

# Explain a specific commit
entire explain --commit <sha>

# Explain a specific checkpoint (detailed view with prompts)
entire explain --checkpoint <id>

# Summary only
entire explain --checkpoint <id> --short

# Full parsed transcript (all prompts/responses)
entire explain --checkpoint <id> --full

# Raw JSONL transcript
entire explain --checkpoint <id> --raw-transcript

# Generate AI summary for a checkpoint
entire explain --checkpoint <id> --generate
```

### Rewind

Interactively browse checkpoints and rewind your branch state (code + agent context).

```bash
# Interactive mode
entire rewind

# Rewind to specific checkpoint (non-interactive)
entire rewind --to <commit-id>

# List rewind points as JSON
entire rewind --list

# Restore only logs (don't modify working directory)
entire rewind --logs-only
```

### Resume

Switch to a branch and restore the agent session from its last checkpoint.

```bash
entire resume <branch>

# Skip confirmation for older checkpoints
entire resume <branch> --force
```

This checks out the branch, finds the session ID from branch-specific commits, restores the session log, and shows the command to continue.

## Troubleshooting

```bash
# Fix stuck sessions (interactive)
entire doctor

# Auto-fix all stuck sessions
entire doctor --force

# Reset shadow branch and session state for current HEAD
entire reset

# Reset a specific session
entire reset --session <id>

# Force reset (skip confirmation)
entire reset --force

# Debug mode (any command)
ENTIRE_DEBUG=1 entire status
```

A session is considered stuck if it's been ACTIVE with no interaction for over 1 hour.

## Configuration

| File | Scope | Commit? |
|------|-------|---------|
| `.entire/settings.json` | Team-shared config | Yes |
| `.entire/settings.local.json` | Personal overrides | No (gitignored) |

Settings:
- `strategy` — `manual-commit` or `auto-commit`
- `enabled` — `true` or `false`

Use `--local` flag with `entire enable` to write to personal overrides.

## How It Works

1. **Hooks** — entire installs `commit-msg`, `post-commit`, `pre-push`, and `prepare-commit-msg` git hooks
2. **Shadow branch** — checkpoint data stored on `entire/<commit-hash>-<worktree-hash>` branches
3. **Condensed storage** — on push, session data moves to the permanent `entire/checkpoints/v1` branch
4. **Checkpoint IDs** — each checkpoint has a unique ID linking to the commit, session, and transcript
5. **Line attribution** — tracks which agent session produced which lines of code

## Multi-Agent Safety

- `manual-commit` strategy is safe for parallel agents — each agent's commits create independent checkpoints
- Sessions are scoped to the commit they started from (`base_commit`)
- Shadow branches are per-commit, so parallel work on different commits won't conflict
- Use `entire resume <branch>` to pick up where a specific agent left off

## Guardrails

- Do not manually edit files under `.git/entire-sessions/` or shadow branches
- Do not delete the `entire/checkpoints/v1` branch (contains permanent session history)
- If hooks conflict with existing hooks, use `entire enable --force` to reinstall
- Run `entire doctor` before reporting bugs — it auto-fixes most stuck states
