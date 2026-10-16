# Changelog

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
