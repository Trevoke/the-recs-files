---
name: recs-requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements — for projects that keep records as their source of truth.
---

# Requesting Code Review

Dispatch a code-reviewer subagent to catch issues before they cascade.

**Core principle:** Review early, review often.

The reviewer is **read-only**. Its prompt tells it so explicitly, and it reviews the frozen `BASE_SHA..HEAD_SHA` range with `git show <sha>:<path>` and `git diff <base>..<head>` — never the working tree, and never `git add`/`git commit`. A worktree has one shared index; because the reviewer never touches it, a writer can keep working while the review runs.

## When to Request Review

**Mandatory:**
- After each task in subagent-driven development
- After completing major feature
- Before merge to the main branch

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## How to Request

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or the main branch's ref
HEAD_SHA=$(git rev-parse HEAD)
```

The SHAs freeze what is reviewed. Anything you commit afterwards is outside the review, which is exactly why the reviewer and a writer can overlap.

**2. Dispatch code-reviewer subagent:**

Use Task tool with recs-code-reviewer type, fill template at `code-reviewer.md` — it opens by telling the reviewer it is read-only; keep that.

**Placeholders:**
- `{WHAT_WAS_IMPLEMENTED}` - What you just built
- `{PLAN_OR_REQUIREMENTS}` - What it should do: the plan task, and the records it cites
- `{BASE_SHA}` - Starting commit
- `{HEAD_SHA}` - Ending commit
- `{DESCRIPTION}` - Brief summary

**3. Act on feedback:**
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Push back if reviewer is wrong (with reasoning)

Fixes are commits like any other: Tim Pope's rules — imperative subject of about 50 characters, blank line, body explaining why; conventional-commit types (feat:, fix:, ...) welcome.

## Speak the project's language

A project that keeps a ubiquitous language owns its words (check AGENTS.md and the records).

- One word per concept, and always the project's word. Never rotate synonyms for variety — if the project says "interlock," it is never "gate," "threshold," or "guard."
- Never write a new term into any file — a record, a plan, a comment, code, a test name, a commit message — before the user has agreed to that specific word. Propose candidates, wait, then sweep the agreed word everywhere in one pass.
- Where a word seems missing, first combine terms the project already owns (an "order" that needs checking gets an "order validator," not a "checker") before proposing a new one.

## Example

```
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | awk '{print $1}')
HEAD_SHA=$(git rev-parse HEAD)

[Dispatch code-reviewer subagent (read-only, frozen SHAs)]
  WHAT_WAS_IMPLEMENTED: Verification and repair functions for conversation index
  PLAN_OR_REQUIREMENTS: Task 2 from docs/plans/deployment-plan.md, plus the records it cites
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types

[Subagent returns]:
  Strengths: Clean architecture, real tests
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed

You: [Fix progress indicators]
[Continue to Task 3]
```

## Integration with Workflows

**recs-subagent-driven-development:**
- Review after EACH task
- Catch issues before they compound
- Fix before moving to next task

**recs-executing-plans:**
- Review after each batch (3 tasks)
- Get feedback, apply, continue

**Ad-Hoc Development:**
- Review before merge
- Review when stuck

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback
- Let the reviewer write anything — a reviewer that runs `git add` or `git commit` is sharing your index, and its staging lands inside your next commit

**If reviewer wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

See template at: recs-requesting-code-review/code-reviewer.md
