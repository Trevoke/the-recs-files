---
name: recs-skills-writing-plans
description: Use when a change to this project's skill text is settled and before any eval case or text changes — writes the plan that names each text change, the record section it realizes, and the check that reads it; for the recs-* skills under skills/, not shipped.
---

# Writing a plan for a change to skill text

Carries `UW-20261015-nkb5 §4: Realize a change to the system`: each step of
the plan cites the records it realizes.

**Standing rule:** where the plan and a record disagree, the record wins; the
plan stops there and the disagreement goes to the record keeper. A section no
record holds stops the plan the same way.

**Save the plan to** `docs/plans/YYYY-MM-DD-<topic>.md`.

## What the plan holds

**1. Reading list.** Each record the change realizes, cited by record name,
with the sections that bear, in reading order. The writer and the reviewer
read these before anything else.

**2. The skill text changes.** One change to a line, each with:
- the file and the sentence or paragraph it changes;
- the record section it realizes, cited: `F-20261028-1mkt §4: The agent
  cites a record`;
- what the change states or guides, in a sentence. Not the wording: the
  writer writes that from the record.

One change is one attempt. A plan with several changes orders them, and each
is kept or reverted on its own.

**3. The eval cases added or changed.** For each: the case directory under
`evals/cases/`, the fixture it runs on, and the situation its question puts
the agent in, said in the records' words. The plan names the question's file
and quotes nothing of it; the writer reads the plan.

**4. The checks.** For each check a case runs, in order:
- the record section it rests on, cited, which is also the comment above it
  in `evals/promptfooconfig.yaml`;
- whether it is deterministic — a script under `evals/checks/`, with a test
  of its own in `evals/checks/*.test.mjs` — or semantic — a fault the judge
  in `evals/checks/judge.js` reads for its meaning;
- what it faults, in a sentence. A check that faults what its record does not
  is wrong, and the plan says so before the text changes.

**5. The comparison.** Which questions train and which are held out; how many
runs a question; that the comparison is question by question against twice
the standard error, pooled when inside the margin, as
`docs/knowledge-base/improving-skill-text-against-an-eval.org` says; when the
loop stops.

**6. What the writer is given, and what it is kept from.** The writer gets the
reading list, the current text, the one change, and each failure as a record
section with the fault in the records' words. It is never given, and is told
not to read, the eval's questions, their replies or the runs: the questions
are not in the tree
(`ADR-20261029-cfj8: Keep the evals' questions in a repository of their own, beside the project`),
and it reads nothing under `evals/runs/`, nor the history of `evals/cases/`.

## Handoff

The plan is run by `recs-skills-executing-plans`, each attempt through
`recs-skills-test-driven-development`.
