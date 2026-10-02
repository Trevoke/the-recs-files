---
name: recs-finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup — for projects that keep records as their source of truth.
---

# Finishing a Development Branch

## Overview

Guide completion of development work by presenting clear options and handling chosen workflow.

**Core principle:** Verify tests → Raise findings → Present options → Execute choice → Clean up.

**Announce at start:** "I'm using the recs-finishing-a-development-branch skill to complete this work."

## The Process

### Step 1: Verify Tests and Raise Findings

Two gates. Both must pass before presenting options.

**Gate 1 - tests pass:**

```bash
# Run the project's test suite (see AGENTS.md / CI config)
npm test / cargo test / pytest / go test ./... / raco test
```

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

Stop. Don't proceed to Step 2.

**Gate 2 - findings raised:**

Anything learned during this branch that belongs in a record — a decision made,
a workflow step that went otherwise, a missing term, refusal text that changed —
has been raised with the user. Not silently written into a record, and not
silently dropped: records change only at the user's direction.

**If unraised findings exist:**
```
Before finishing, this branch learned things that may belong in the records:

- <finding, and the record it touches>

Raising these before offering merge options.
```

A branch is not finished with an unraised finding.

**If both gates pass:** Continue to Step 2.

### Step 2: Determine Base Branch

**Never assume main or master — projects name their own base branch.** Detect it
from the repository:

```bash
# The remote HEAD names the default branch
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'

# Or find which branch the current one forked from
git log --oneline --decorate --graph --all | head -30
```

Then confirm: "This branch split from <detected-branch> - is that correct?"

If detection is ambiguous, ask rather than guess.

### Step 3: Present Options

Present exactly these 4 options:

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Don't add explanation** - keep options concise.

### Step 4: Execute Choice

**Commit and PR text follow Tim Pope's rules:** imperative subject around 50
characters, blank line, then a body explaining why. Conventional-commit types
(feat:, fix:, ...) are welcome.

#### Option 1: Merge Locally

```bash
# Switch to base branch
git checkout <base-branch>

# Pull latest
git pull

# Merge feature branch
git merge <feature-branch>

# Verify tests on merged result
<test command>

# If tests pass
git branch -d <feature-branch>
```

Then: Cleanup worktree (Step 5)

#### Option 2: Push and Create PR

```bash
# Push branch
git push -u origin <feature-branch>

# Create PR (title: imperative, ~50 chars; body says why, not just what)
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed, and why>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

Then: Cleanup worktree (Step 5)

#### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

**Don't cleanup worktree.**

#### Option 4: Discard

**Confirm first:**
```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for exact confirmation.

If confirmed:
```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then: Cleanup worktree (Step 5)

### Step 5: Cleanup Worktree

**For Options 1, 2, 4:**

Check if in worktree:
```bash
git worktree list | grep $(git branch --show-current)
```

If yes:
```bash
git worktree remove <worktree-path>
```

**For Option 3:** Keep worktree.

## Speak the project's language

A project that keeps a ubiquitous language owns its words (check AGENTS.md and the records).

- One word per concept, and always the project's word. Never rotate synonyms for variety — if the project says "interlock," it is never "gate," "threshold," or "guard."
- Never write a new term into any file — a record, a plan, a comment, code, a test name, a commit message — before the user has agreed to that specific word. Propose candidates, wait, then sweep the agreed word everywhere in one pass.
- Where a word seems missing, first combine terms the project already owns (an "order" that needs checking gets an "order validator," not a "checker") before proposing a new one.

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | ✓ | - | - | ✓ |
| 2. Create PR | - | ✓ | ✓ | - |
| 3. Keep as-is | - | - | ✓ | - |
| 4. Discard | - | - | - | ✓ (force) |

## Common Mistakes

**Skipping test verification**
- **Problem:** Merge broken code, create failing PR
- **Fix:** Always verify tests before offering options

**Silently updating a record**
- **Problem:** Records are the project's source of truth, and they change only at the user's direction
- **Fix:** Raise the finding; the user decides what the record says

**Silently dropping a finding**
- **Problem:** The next branch relearns what this one already knew
- **Fix:** A branch is not finished with an unraised finding

**Assuming the base branch**
- **Problem:** Merge lands on main/master when the project bases work elsewhere
- **Fix:** Detect from the repo, then confirm with the user

**Open-ended questions**
- **Problem:** "What should I do next?" → ambiguous
- **Fix:** Present exactly 4 structured options

**Automatic worktree cleanup**
- **Problem:** Remove worktree when might need it (Option 2, 3)
- **Fix:** Only cleanup for Options 1 and 4

**No confirmation for discard**
- **Problem:** Accidentally delete work
- **Fix:** Require typed "discard" confirmation

## Red Flags

**Never:**
- Proceed with failing tests
- Finish with an unraised finding
- Write a record without the user's direction
- Assume main or master is the base branch
- Merge without verifying tests on result
- Delete work without confirmation
- Force-push without explicit request

**Always:**
- Verify tests before offering options
- Raise record-worthy learnings before offering options
- Present exactly 4 options
- Get typed confirmation for Option 4
- Clean up worktree for Options 1 & 4 only

## Integration

**Called by:**
- **recs-subagent-driven-development** - After all tasks complete
- **recs-executing-plans** (Step 5) - After all batches complete

**Pairs with:**
- **recs-using-git-worktrees** - Cleans up worktree created by that skill
