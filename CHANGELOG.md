# Changelog

## Unreleased

- Each harness's package is rendered from capability markers in the skill
  text and a harness profile per harness (`ADR-20261019-71m6: Render each harness's package from capability markers and a harness profile`).
- The Claude Code package keeps its task list with the task tools
  (`TaskCreate`, `TaskUpdate`) in place of TodoWrite, and Claude Code must run
  with `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` set; without it, the behaviour of the
  recs files is undefined.
- A plan's header names the agent rather than Claude: "**For the agent:**".
- The recs files install at project scope by default (`ADR-20261019-0fex: Install the recs files at project scope by default`).
- Delegation stops two levels deep, counted in `TRF_DELEGATE_DEPTH` (`ADR-20261019-t4qq: Stop delegation two levels deep`).
- The order of the skills is kept in `skills/skill-flow.dot` (`ADR-20261019-bwyc: Keep the order of the skills in a skill flow beside them`).
- pi's package carries a subagent extension; Codex and pi get the reviewer's
  role as a role file.
- An opencode package, for opencode 2, is built and validated but not yet
  published.
- Every package is checked, and installed where its harness CLI runs, before
  any is published.
- The evals render each run's package: pi's for the pi runs, Claude Code's for
  the new Claude Code runs.
- Two eval cases, `dispatching-the-code-reviewer` and
  `keeping-the-task-list`, check that a run delegates and keeps its memory as
  its harness profile says. Neither these nor the Claude Code runs have yet
  been run against a model.
- The agent cites a record to the record keeper in its title's exact words,
  with any section between the number and the title, in backticks, and on one
  line (`F-20261024-5tt7: The agent cites a record to the record keeper in its title's exact words`).
  The seed says so with one example per kind of sentence where citations were
  shortened, and the skills' example citations are whole and in backticks.
- The seed and `recs-writing-records` say that a new record is written to disk
  as Proposed and committed before it is shown for agreement, as
  `UW-20261014-8c8f: Create a record` orders it.
- A new eval case, `citing-records-to-the-record-keeper`: six questions on one
  fixture, four to tune the wording against and two held out, scored by
  `npm run score:citations`.
- A record names another record by an org link to its file, its description
  the number and title
  (`ADR-20261026-y9zt: A record names another record by an org link to its file`); a
  successor's `:SUPERSEDES:` line holds one link per record it supersedes, a
  comma and a space between them.
- The seed and `recs-writing-records` show the lines org reads whole — a
  heading, a property, a projection line, a link — with good and bad examples
  (`ADR-20261015-0v6s: Records are written in org`).
- A new eval case, `superseding-two-features`, and checks on every case that
  writes records: org lines whole, records named by links, links resolving.
- A new record's identifier is its category's prefix, the UTC date it was
  drafted and four random Crockford base32 characters, `ADR-20261026-kzx5`,
  drawn by a command in a POSIX shell or PowerShell
  (`ADR-20261026-77gd: Identify a record by the date it was drafted and four random characters`,
  `F-20261026-tacr: A record is written with its identifier and its line in its projection`).
  A project's numbered records keep their numbers, and the checks read both
  forms. This project's own records are re-identified.

### Eval results

Claude Code, Claude Sonnet 5.5, with the skills installed.

| Case | Runs passing |
|---|---|
| citing-records-to-the-record-keeper, held-out questions | 7/12 (0/12 before), 0.12 faults per citation (0.78 before) |
| proposing-a-record | 12/12; with the org-line examples 6/6; with the dated identifier 3/3 (0/3 before, each drafting `ADR-4`), every run drawing it by command |
| superseding-two-features, rejecting-a-proposed-record, with the dated identifier | 2/2 each |
| superseding-two-features | 6/6 |
| rejecting-a-proposed-record | 3/3 |
| choosing-a-realization-modality | 3/3 |
| planning-without-a-realization-modality | 3/3 |
| starting-records-from-a-realization | 3/3 |

## 1.0.0-beta — 2026-10-16

The first release. The record forms, the categories, and record management
(`UW-1: Create a record` to `UW-6: Redefine a term`) are stable for 1.0. The
development flow skills may still be split into a generic flow and a part for
each realization modality before 1.0.

### Contents

- `recs-kickstart` and `recs-writing-records`, for starting and managing a
  project's records.
- Eleven development flow skills, derived from
  [superpowers](https://github.com/obra/superpowers), and
  `agents/recs-code-reviewer.md`.
- This project's own records under `docs/`: the vision, the ubiquitous
  language (UL-1 to UL-24), user workflows (UW-1 to UW-8), features (F-1 to
  F-11), architectural decisions (ADR-1 to ADR-8), and an empty message
  catalog.
- Evals under `evals/`: five cases, run in pi inside bubblewrap, on four models
  through OpenRouter, with the skills installed and without.

### Eval results

Each case was run three times in each arm on each model. Passes with the
skills installed:

| Case | Claude Sonnet 5.5 | GPT-5.5 | Gemini 3.1 Pro | Qwen 3.8 Max |
|---|---|---|---|---|
| proposing-a-record | 3/3 | 3/3 | 4/6 | 3/3 |
| rejecting-a-proposed-record | 3/3 | 3/3 | 4/5 | 3/3 |
| choosing-a-realization-modality | 6/6 | 3/3 | 5/6 | 3/3 |
| planning-without-a-realization-modality | 3/3 | 3/3 | 3/3 | 3/3 |
| starting-records-from-a-realization | 3/3 | 3/3 | 6/6 | 3/3 |

Runs that ended on a provider error (rate limits and aborted streams on
OpenRouter) are left out of the counts, and a cell over more than three runs
adds up reruns. The two realization modality cases were run after the change
to `recs-brainstorming`'s description, the other three before it.

**Gemini 3.1 Pro falls short of the bar.** On proposing-a-record it missed
the sentence the new record falsifies in one run, against `F-3 §1: Falsified
sentences are found with their replacements`. Once on proposing-a-record and
once on rejecting-a-proposed-record it read `recs-writing-records` and ended
its turn with no reply. On choosing-a-realization-modality it once answered
without loading `recs-brainstorming`.

Without the skills, every model fails choosing-a-realization-modality,
planning-without-a-realization-modality and proposing-a-record, except Qwen 3.8
Max, which passed proposing-a-record in two runs of three and
starting-records-from-a-realization in one. Claude Sonnet 5.5 and Qwen 3.8 Max
pass rejecting-a-proposed-record without the skills: the project's AGENTS.md
carries enough of the rule.

In a harness without a Skill tool, such as pi, a skill is used only when the
model chooses to read it from the skill list.
