---
name: recs-skills-requesting-review
description: Use after the loop on a change to this project's skill text ends and before verification — dispatches a read-only reviewer that measures the changed text against the records; for the recs-* skills under skills/, not shipped.
---

# Requesting a review of skill text

Carries `UW-20261015-nkb5 §5: Realize a change to the system`: a step is
checked against the records it cites.

The reviewer is **read-only**: it reads the frozen `BASE_SHA..HEAD_SHA` with
`git diff` and `git show`, and never runs `git add` or `git commit`. It is
told so in its prompt.

## What the reviewer is given

- the plan's reading list, and the instruction to open each record from
  disk;
- the diff, by its two SHAs;
- for each changed sentence, the record section the plan says it realizes.

It is not given, and is told not to read, the eval's questions, replies,
runs or scores: the questions are not in the tree
(`ADR-20261029-cfj8: Keep the evals' questions in a repository of their own, beside the project`),
and it reads nothing under `evals/runs/`, nor the history of `evals/cases/`. A reviewer that knows which question a sentence was tuned
against cannot tell whether the sentence is fitted to it.

## The two questions it answers

1. **Does the text state and guide the records' intent?** For each changed
   sentence: the section it realizes, opened; whether the sentence carries
   what that section means and leads the agent to the conduct the section
   asks for; whether it says why, where the record's workflow says why.
   A sentence that restates a requirement and carries no reason is a
   finding; `docs/knowledge-base/improving-skill-text-against-an-eval.org`
   found requirements alone lose the reason.
2. **Has the text drifted into sentences fitted to particular eval
   questions?** A sentence that names a situation no record names, carries
   the actors, values or dates of one case, or guides a reply the records do
   not ask for, is a finding, whether or not the reviewer can see the
   question it fits.

Each finding cites the record section it rests on and quotes the sentence.
A finding with no section is not a finding; the reviewer says so and lists
it as open.

## Prompt

```
You are read-only: read `git diff <BASE>..<HEAD>` and `git show`; run no
`git add` or `git commit`; read nothing under evals/runs/, nor the history
of evals/cases/. Open each record on this reading
list from disk: <reading list>. For each changed sentence in the diff, with
the section the plan gives it (<sentence → section>), answer: does it state
and guide what that section means, with the reason the record gives; is it
fitted to a particular case? Cite each finding to a record section and
quote the sentence.
```

Then `recs-skills-receiving-review`.
