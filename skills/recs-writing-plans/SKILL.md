---
name: recs-writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code — for projects that keep records as their source of truth.
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

A plan is built against the project's records — commonly user workflows, architectural decisions, features, a ubiquitous language, and a message catalog; the project's AGENTS.md names its actual set and where it lives. The records are the source of truth; the plan is a derivation from them.

**Standing rule:** Where the plan and a record disagree, the record wins. The plan stops at the point of disagreement and the disagreement is raised with the user. Never plan around a record, and never "fix" a record to fit the plan — records change only at the user's direction.

**A missing record stops the plan too.** A task that builds surface — something a user gives the system, gets back, or may do next — cites the feature record for it. Where no feature covers that surface, the plan stops there and the gap is raised with the user, to be routed through recs-brainstorming and written with recs-writing-records. Never cite a neighbouring record to fill the gap, and never plan the surface from the design document alone.

**Announce at start:** "I'm using the recs-writing-plans skill to create the implementation plan."

**Context:** This should be run in a dedicated worktree (created by the recs-brainstorming skill; see recs-using-git-worktrees).

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

## Speak the project's language

A project that keeps a ubiquitous language owns its words (check AGENTS.md and the records).

- One word per concept, and always the project's word. Never rotate synonyms for variety — if the project says "interlock," it is never "gate," "threshold," or "guard."
- Never write a new term into any file — a record, a plan, a comment, code, a test name, a commit message — before the user has agreed to that specific word. Propose candidates, wait, then sweep the agreed word everywhere in one pass.
- Where a word seems missing, first combine terms the project already owns (an "order" that needs checking gets an "order validator," not a "checker") before proposing a new one.

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use recs-executing-plans to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Mandatory Sections

**Every plan MUST carry these four sections, between the header and the first task.** They are not decoration; the executor obeys them the way it obeys the task steps.

### 1. How to Speak

Points at the project's ubiquitous language and lists the defined terms this plan's work touches — each with its recorded meaning, so the executor never has to guess.

```markdown
## How to Speak

The ubiquitous language is in [where the project's AGENTS.md says it is].
This plan's work touches these defined terms:

- **[term]** — [the record's meaning, in a sentence]
- **[term]** — [the record's meaning, in a sentence]

Use them exactly, in code, tests, comments, and commit messages. Coin nothing.
```

### 2. Do Not Modify

Lists the project's record files and any acceptance fixtures. The executor treats them as read-only.

```markdown
## Do Not Modify

- `[path to each record file]`
- `[path to each acceptance fixture]`

If any task seems to require changing one of these, STOP and raise it with
the user. The plan does not proceed around it.
```

### 3. Reading List

The records this plan is built against, in reading order, each cited by number and title — never a bare number.

```markdown
## Reading List

Read before executing any task, in this order:

1. UW-3: [title] — the workflow this plan implements
2. ADR-12: [title] — the invariant the design must hold
3. F-7: [title] — the surface being built
4. MSG-4: [title] — the exact refusal text task 3 asserts
```

### 4. Cataloged-Text Ordering

Where a task touches user-facing text the project catalogs — error messages, refusals — the record's wording changes first, at the user's direction, and the failing test asserts the record's exact current text. Task steps are ordered accordingly.

```markdown
## Cataloged-Text Ordering

Tasks [N, M] touch cataloged text ([MSG-4: title]). For each:

1. The catalog record's wording is settled first, at the user's direction.
2. The failing test asserts the record's exact current text, character for
   character.
3. Only then is the implementation written to emit it.
```

If no task touches cataloged text, the section says so in one line — its presence is what proves the question was asked.

## Task Structure

Every task names the records it implements, by number and title. A task that builds surface names its feature.

```markdown
### Task N: [Component Name]

**Records:** F-7: [title]; ADR-12: [title]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add order validator

UW-3: [title] requires every order checked on arrival.
Validator added with its first passing test."
```
```

**Snippets carry code, not comments.** A plan's prose restates records — that is
what a derivation is — and a comment in the built code may not. Where the built
code should carry one, the task names in prose the record it cites, and nothing
of what that record says; the comment itself is written against the code once it
exists, by whoever writes that code.

A plan is where what-comes-later lives. That is what a plan is for, and it is
why the code a plan specifies must not carry it: a comment says what is true
now, what will be true later belongs in the plan, and what used to be true
belongs in the commit that changed it.

For a task on cataloged text, Step 1's test asserts the catalog record's exact current text, and a step before it confirms that wording is settled (see Cataloged-Text Ordering).

**Commits follow Tim Pope's rules:** imperative subject around 50 characters, blank line, body explaining why — which for this methodology means naming the record the change serves. Conventional-commit types (feat:, fix:, docs:, refactor:) are welcome in the subject.

## Remember
- Exact file paths always
- Complete code in plan (not "add validation") — code, not comments
- Claims about existing code are checked against it, never predicted
- What comes later stays in the plan; the code it specifies never forecasts
- Exact commands with expected output (pytest, cargo test, npm test, raco test — whatever the project uses)
- Every task cites its records by number and title
- The project's words, exactly; coin nothing
- A record that disagrees with the plan stops the plan
- Surface with no feature record stops the plan
- Reference relevant skills with @ syntax
- DRY, YAGNI, TDD, frequent commits

## Execution Handoff

After saving the plan, offer execution choice:

**"Plan complete and saved to `docs/plans/<filename>.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with recs-executing-plans, batch execution with checkpoints

**Which approach?"**

**If Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use recs-subagent-driven-development
- Stay in this session
- Fresh subagent per task + code review

**If Parallel Session chosen:**
- Guide them to open new session in worktree
- **REQUIRED SUB-SKILL:** New session uses recs-executing-plans
