# Code Quality Reviewer Prompt Template

Use this template when dispatching a code quality reviewer subagent.

**Purpose:** Verify implementation is well-built (clean, tested, maintainable)

**Only dispatch after spec compliance review passes.**

The reviewer is read-only: it reviews the frozen `BASE_SHA..HEAD_SHA` range
with `git show <sha>:<path>` and `git diff <base>..<head>` — never the working
tree, and never `git add`/`git commit`. The template says so; do not trim
that part out.

```
Task tool (recs-code-reviewer):
  Use template at recs-requesting-code-review/code-reviewer.md

  WHAT_WAS_IMPLEMENTED: [from implementer's report]
  PLAN_OR_REQUIREMENTS: Task N from [plan-file], plus the records it cites
  BASE_SHA: [commit before task]
  HEAD_SHA: [current commit]
  DESCRIPTION: [task summary]
```

**Code reviewer returns:** Strengths, Issues (Critical/Important/Minor), Assessment
