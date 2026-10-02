---
name: recs-using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification — for projects that keep records as their source of truth.
---

# Using Git Worktrees

## Overview

Git worktrees create isolated workspaces sharing the same repository, allowing work on multiple branches simultaneously without switching.

**Core principle:** Systematic directory selection + safety verification = reliable isolation.

**Announce at start:** "I'm using the recs-using-git-worktrees skill to set up an isolated workspace."

## Directory Selection Process

Follow this priority order:

### 1. Check Existing Directories

```bash
# Check in priority order
ls -d .worktrees 2>/dev/null     # Preferred (hidden)
ls -d worktrees 2>/dev/null      # Alternative
```

**If found:** Use that directory. If both exist, `.worktrees` wins.

### 2. Check AGENTS.md

```bash
grep -i "worktree" AGENTS.md 2>/dev/null
```

AGENTS.md may carry both a worktree directory preference and worktree setup
requirements (linked packages, environment, extra steps). Read it for both.

**If a directory preference is specified:** Use it without asking.

### 3. Ask User

If no directory exists and no AGENTS.md preference:

```
No worktree directory found. Where should I create worktrees?

1. .worktrees/ (project-local, hidden)
2. ~/.worktrees/<project-name>/ (global, outside the project)

Which would you prefer?
```

## Safety Verification

### For Project-Local Directories (.worktrees or worktrees)

**MUST verify directory is ignored before creating worktree:**

```bash
# Check if directory is ignored (respects local, global, and system gitignore)
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**If NOT ignored:**

Fix broken things immediately:
1. Add appropriate line to .gitignore
2. Commit the change
3. Proceed with worktree creation

**Why critical:** Prevents accidentally committing worktree contents to repository.

### For Global Directories (outside the project)

No .gitignore verification needed - outside project entirely.

## Creation Steps

### 1. Detect Project Name

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
```

### 2. Create Worktree

```bash
# Determine full path
case $LOCATION in
  .worktrees|worktrees)
    path="$LOCATION/$BRANCH_NAME"
    ;;
  *)
    path="$HOME/.worktrees/$project/$BRANCH_NAME"
    ;;
esac

# Create worktree with new branch
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

### 3. Run Project Setup

Auto-detect and run appropriate setup:

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi

# Racket (info.rkt present = the project is a Racket package)
if [ -f info.rkt ]; then raco pkg install --auto --batch --skip-installed; fi
```

**Linked packages can test the wrong copy.** A package manager that links by
path — Racket's `raco pkg install --link`, `npm link`, `pip install -e` — may
resolve module paths to the ORIGINAL checkout rather than the worktree, so a
worktree can silently compile and test the wrong copy. Before trusting the
baseline: confirm the worktree's own files are what the tests exercise, check
the project's AGENTS.md for worktree setup requirements, and ask rather than
assume when the project's package manager links by path.

### 4. Verify Clean Baseline

Run tests to ensure worktree starts clean:

```bash
# Examples - use project-appropriate command
npm test
cargo test
pytest
go test ./...
raco test
```

**If tests fail:** Report failures, ask whether to proceed or investigate.

**If tests pass:** Report ready.

### 5. Report Location

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Speak the project's language

A project that keeps a ubiquitous language owns its words (check AGENTS.md and the records).

- One word per concept, and always the project's word. Never rotate synonyms for variety — if the project says "interlock," it is never "gate," "threshold," or "guard."
- Never write a new term into any file — a record, a plan, a comment, code, a test name, a commit message — before the user has agreed to that specific word. Propose candidates, wait, then sweep the agreed word everywhere in one pass.
- Where a word seems missing, first combine terms the project already owns (an "order" that needs checking gets an "order validator," not a "checker") before proposing a new one.

## Quick Reference

| Situation | Action |
|-----------|--------|
| `.worktrees/` exists | Use it (verify ignored) |
| `worktrees/` exists | Use it (verify ignored) |
| Both exist | Use `.worktrees/` |
| Neither exists | Check AGENTS.md → Ask user |
| Directory not ignored | Add to .gitignore + commit |
| Tests fail during baseline | Report failures + ask |
| No manifest (package.json, Cargo.toml, info.rkt, ...) | Skip dependency install |
| Package manager links by path | Confirm worktree's own files are under test; check AGENTS.md; ask |

## Common Mistakes

### Skipping ignore verification

- **Problem:** Worktree contents get tracked, pollute git status
- **Fix:** Always use `git check-ignore` before creating project-local worktree

### Assuming directory location

- **Problem:** Creates inconsistency, violates project conventions
- **Fix:** Follow priority: existing > AGENTS.md > ask

### Trusting a baseline that exercised the original checkout

- **Problem:** A path-linked package resolves modules to the original checkout, so the baseline proves nothing about the worktree
- **Fix:** Confirm the worktree's own files are what the tests exercise; check AGENTS.md; ask when the package manager links by path

### Proceeding with failing tests

- **Problem:** Can't distinguish new bugs from pre-existing issues
- **Fix:** Report failures, get explicit permission to proceed

### Hardcoding setup commands

- **Problem:** Breaks on projects using different tools
- **Fix:** Auto-detect from project files (package.json, info.rkt, etc.)

## Example Workflow

```
You: I'm using the recs-using-git-worktrees skill to set up an isolated workspace.

[Check .worktrees/ - exists]
[Verify ignored - git check-ignore confirms .worktrees/ is ignored]
[Create worktree: git worktree add .worktrees/auth -b feature/auth]
[Run npm install]
[Run npm test - 47 passing]

Worktree ready at <project-root>/.worktrees/auth
Tests passing (47 tests, 0 failures)
Ready to implement auth feature
```

## Red Flags

**Never:**
- Create worktree without verifying it's ignored (project-local)
- Skip baseline test verification
- Trust a baseline before confirming the worktree's own files are under test
- Proceed with failing tests without asking
- Assume directory location when ambiguous
- Skip AGENTS.md check

**Always:**
- Follow directory priority: existing > AGENTS.md > ask
- Verify directory is ignored for project-local
- Auto-detect and run project setup
- Read AGENTS.md for both directory preference and setup requirements
- Verify clean test baseline

## Integration

**Called by:**
- Any skill needing an isolated workspace, typically once a design is approved and implementation follows

**Pairs with:**
- **recs-finishing-a-development-branch** - REQUIRED for cleanup after work complete
- **recs-executing-plans** or **recs-subagent-driven-development** - Work happens in this worktree
