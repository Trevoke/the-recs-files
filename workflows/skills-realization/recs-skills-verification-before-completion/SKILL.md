---
name: recs-skills-verification-before-completion
description: Use before claiming a change to this project's skill text is done — runs the held-out questions and the other cases, then shows the record keeper the diff and how it was checked; for the recs-* skills under skills/, not shipped.
---

# Verification before completion, for skill text

Carries `UW-20261015-nkb5 §6, §7: Realize a change to the system` and its
extension 7a: the record keeper sees the realization and how it was checked,
and agrees or declines.

**Core principle:** evidence before claims. A score from the loop is a claim
about the training questions; the held-out questions are the evidence.

## Before the claim

1. **The held-out questions.** The kept text and the text the loop started
   from, each run on every held-out question, the same number of runs each,
   compared question by question against twice the standard error, as
   `docs/knowledge-base/improving-skill-text-against-an-eval.org` says. The
   held-out questions run now for the first time in this change.
2. **The other cases.** Every case the change did not aim at, run on the
   kept text, as CONTRIBUTING.md says to run them. A case that passed before
   and fails now is a regression, whatever the aimed case scored.
3. **The records, fresh.** Each changed sentence read beside the section the
   plan gives it, opened from disk now.
4. **The log.** Every attempt, with its commit and verdict, and what the
   review found and what was done with it.

No step may be skipped, remembered, or taken from an earlier run.

## What the record keeper is shown (§6)

- the diff of the skill text, each change beside the record section it
  realizes, cited;
- the baseline and the kept text on the training questions and on the
  held-out questions, with their errors and the margin;
- the other cases' results;
- the attempt log and the review's findings;
- each situation the work left open, in one sentence each.

Then wait (§7). Where the record keeper declines (7a), settle what differs
with them and go back to `recs-skills-brainstorming`; the records, not the
score, say what is wrong.

## After agreement

What the loop established — a run that cost something to learn — goes into
`docs/knowledge-base/improving-skill-text-against-an-eval.org` under a
heading that says what it establishes, with the commits and the numbers.
