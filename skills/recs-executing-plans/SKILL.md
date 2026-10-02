---
name: recs-executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints — for projects that keep records as their source of truth.
---

# Executing Plans

## Overview

Load plan, review critically, execute tasks in batches, report for review between batches.

**Core principle:** Batch execution with checkpoints for architect review.

**Announce at start:** "I'm using the recs-executing-plans skill to implement this plan."

## The Process

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. Check the plan against the records it cites - user workflows, architectural decisions, features, message catalog entries, whatever the project keeps (see the project's AGENTS.md and its records). Where the plan and a record disagree, the record wins - stop and raise the disagreement with your human partner rather than executing either version
4. If concerns: Raise them with your human partner before starting
5. If no concerns: Create TodoWrite and proceed

### Step 2: Execute Batch
**Default: First 3 tasks**

For each task:
1. Mark as in_progress
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Mark as completed

### Step 3: Report
When batch complete:
- Show what was implemented
- Show verification output
- Say: "Ready for feedback."

### Step 4: Continue
Based on feedback:
- Apply changes if needed
- Execute next batch
- Repeat until complete

### Step 5: Complete Development

After all tasks complete and verified:
- Announce: "I'm using the recs-finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use recs-finishing-a-development-branch
- Follow that skill to verify tests, present options, execute choice

## Records Are Not Tasks

**Standing rule, in force for every batch:** never modify the project's record files - the user workflows, architectural decisions, features, ubiquitous language, message catalog, or whatever this project keeps (see its AGENTS.md). Records change only at the user's direction.

Work that seems to require a record change is a blocker to raise, not a task to absorb. Stop, name the record by number and title, say what the plan needs from it, and wait.

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker mid-batch (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly
- A task cannot be completed without changing a record

**Ask for clarification rather than guessing.**

## Speak the project's language

A project that keeps a ubiquitous language owns its words (check AGENTS.md and the records).

- One word per concept, and always the project's word. Never rotate synonyms for variety — if the project says "interlock," it is never "gate," "threshold," or "guard."
- Never write a new term into any file — a record, a plan, a comment, code, a test name, a commit message — before the user has agreed to that specific word. Propose candidates, wait, then sweep the agreed word everywhere in one pass.
- Where a word seems missing, first combine terms the project already owns (an "order" that needs checking gets an "order validator," not a "checker") before proposing a new one.

A plan's code snippets are code to write, not text to transcribe. A comment in
one is the plan's reasoning about code that did not exist yet; every comment the
files end up carrying is yours to write, under the project's comment rule, and
yours to answer for. A comment says what is true now: what will be true later
belongs in the plan, and what used to be true belongs in the commit that
changed it.

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember
- Review plan critically first
- Check the plan against the records it cites - where they disagree, the record wins, and you stop
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Between batches: just report and wait
- Stop when blocked, don't guess
- Records are never yours to edit
