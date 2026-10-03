# the-recs-files

Skills for working on a codebase whose records are the source of truth.

## The idea

A project keeps **records**: short, numbered, one-thing-each statements of what
it does and why. The records are the truth for the code: code, tests and
comments follow them, and a comment is a pointer to a record and nothing else.
The people working on the project are the truth for the records: a record
changes only at their direction, in words they have agreed to.

Records live in **projections**, each with a form borrowed from a published
source (kept in `docs/knowledge-base/` so the borrowing can be checked):

| Projection | Holds | Form |
|---|---|---|
| Vision | What the system is for and the domain it works in | A single file |
| Ubiquitous language | What a word means, grouped by bounded context | Evans |
| User workflows (UW-n) | What a person is trying to achieve, step by step | Cockburn |
| Features (F-n) | What a thing takes, produces, and lets a user do next | — |
| Message catalog (MSG-n) | The exact text given on a refusal or failure | — |
| Architectural decisions (ADR-n) | A pattern the code follows, and why | Nygard |

## The skills

- `recs-kickstart`: start here in an existing codebase. Interviews you,
  analyzes the code, and writes a thin first slice of records with your
  agreement, plus the project's AGENTS.md.
- `recs-writing-records`: adds, amends, retires a record, and sweeps a word
  across the codebase.
- `recs-brainstorming`, `recs-writing-plans`, `recs-executing-plans`,
  `recs-subagent-driven-development`, `recs-test-driven-development`,
  `recs-systematic-debugging`, `recs-requesting-code-review`,
  `recs-receiving-code-review`, `recs-verification-before-completion`,
  `recs-using-git-worktrees`, `recs-finishing-a-development-branch`: the
  development flow, reading and citing records at every step.

A project's facts live in its own AGENTS.md, which `recs-kickstart` drafts from
`skills/recs-kickstart/agents-seed.md`.

These skills are meant to be reused across projects, so they stay generic: no
project vocabulary, branch name, file name or tool command is baked into one,
and project facts live in each project's AGENTS.md. A language may appear in an
ecosystem example list beside npm, cargo and pytest.

## Testing a change to a skill

Follow `superpowers:writing-skills`: watch an agent fail without the change
before writing it.

A subagent inherits the project's skill list, so a control arm told not to use
the skill under test can still load it on its own initiative. Forbid that skill
by name, forbid every other skill, and read the run's own tool calls to confirm
it loaded none. Check the outcome against the fixture directly; an agent's
report of its own run is not evidence.
