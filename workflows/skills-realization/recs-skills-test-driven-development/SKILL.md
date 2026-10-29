---
name: recs-skills-test-driven-development
description: Use for each attempt at this project's skill text — the eval case or check is written first and seen to fail on the current text, then the text changes, then the two are compared; for the recs-* skills under skills/, not shipped.
---

# The eval-first loop for skill text

Carries `UW-20261015-nkb5 §5: Realize a change to the system`: each step is
checked against the records it cites, and the check comes first.

**Core principle:** if the check did not fail on the current text, it does
not check the change. A check reads a record section; a score is what the
check counts.

## The loop

```
RED:     write or change the case or check; run it on the current text;
         see it fail, and count how
GREEN:   the writer changes the text, once
COMPARE: run the training questions; compare question by question
```

**RED — the eval first.**
- A check rests on one record section, cited in the comment above it in
  `evals/promptfooconfig.yaml`. A check that faults what that section does
  not is wrong, whatever the text does; fix it, with the record keeper where
  the section reads two ways, before any text changes.
- A deterministic check is a script under `evals/checks/`, with a test of its
  own in `evals/checks/*.test.mjs` that shows what it faults and what it
  lets stand. A semantic check is a fault the judge in `evals/checks/judge.js`
  reads for its meaning, named there by its section.
- A case's question puts the agent in a situation the cited sections settle.
  It never restates an example in a record, and no record's example is
  written from a question. Several questions run on one fixture: some
  train, some are held out, and the plan names which.
- Run the case on the current text, as CONTRIBUTING.md says to run the
  evals. The failure is the baseline: its score with its error, and the
  count of each fault.

**GREEN — the text.** The writer, run with `leash/write-skill-text.sh` and
never as a subagent
(`ADR-20261029-cfj8: Keep the evals' questions in a repository of their own, beside the project`),
makes the one change the plan names, from the records, not from the failure. A template shapes a reply better than a
prohibition; naming a situation in the text brings that situation on.

**COMPARE.** The training questions, the same number of runs as the
baseline. The gap is the mean over questions of the difference in their
means; the margin is twice its standard error. Keep the attempt when the gap
clears the margin; where the gap is positive and inside it, run both wordings
more and judge the pooled replies; otherwise revert. Each cause the attempt
aimed at falls, and no other rises, beside the score. The held-out questions
run only at verification.

## Never

- change the text and the check in one attempt;
- run the writer as a subagent; under leash it is refused the questions,
  the replies and the runs, and nothing else refuses it;
- hand a writer a question, a reply, or a run;
- keep an attempt the margin does not clear.
