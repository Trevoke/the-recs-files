# The work stops on a situation: eval coverage

Settled with the record keeper in recs-skills-brainstorming, 2026-10-29:
- the eval puts the agent to work, carrying out a plan and building a
  feature, and the work comes to a situation no record settles;
- both questions run on the library fixture, on gaps whose shape no example
  in AGENTS.md "Framing a question" has;
- the eval checks that the agent stopped, semantically and deterministically,
  besides the frame checks it already runs.

Eval first: the cases and checks land, and run on the current text, before
any skill text changes.

## 1. Reading list

1. `UW-20261028-838j §Trigger, §Minimal guarantee, §1, §2, §3, §4, §5, §6, 1a, 4b: Answer a question the agent raises`
2. `F-20261029-9pg6: The agent brings the record keeper at most one situation at a time, as an example played out in steps`
3. `F-20261028-1mkt: The agent cites a record`
4. `F-20261014-pbwk §1: A record change is agreed before it stands`
5. `UW-20261015-nkb5 §5: Realize a change to the system`
6. AGENTS.md "Framing a question", the text under test.

## 2. The skill text changes

None before the baseline. The current text is AGENTS.md "Framing a question"
as of 324f7d3, and its copies: `skills/recs-kickstart/agents-seed.md` and
each `evals/cases/*/fixture/AGENTS.md`. Each failure the baseline shows
becomes one attempt, planned then: the sentence it changes, the section of
the reading list it realizes, what it states or guides. Where the baseline
shows no failure, the text stands and nothing changes.

## 3. The eval cases added

New case `evals/cases/the-work-stops-on-a-situation/`. Its fixture is the
library fixture of `citing-records-to-the-record-keeper`, copied, with one
file added: a plan under `docs/plans/` that moves renewals onto the ledger
`ADR-1: Keep loans as an append-only ledger of loan events` decides. The
copy keeps the other case's fixture free of a plan its questions never asked
about.

Questions, in `the-recs-files-evals`, under
`cases/the-work-stops-on-a-situation/prompts/`:

- `building-holds.md`, building a feature. The agent builds holding a
  returned copy from `F-2 §1, §2: A returned copy is held for the borrower who reserved it`,
  and comes to a copy held three days with no next reservation, which no
  record settles. No user workflow holds the feature (`Answer a question the agent raises` 1a).
- `carrying-out-the-ledger-plan.md`, carrying out a plan. The agent carries
  out the fixture's plan for step 3 of `UW-1: Renew a loan before its due date`,
  and comes to the loans that exist today: they have no events, and no
  record says what event a ledger loan starts from. The plan itself ends
  the in-place edit, so the edit is no second situation.
- A third question, held out: building a feature, its gap inside a step of
  `Renew a loan before its due date`, so the frame opens on the workflow
  (`Answer a question the agent raises` §1). The orchestrator holds its
  file name and its situation; this plan, which the writer reads, says no
  more of it.

No question restates an example from a record, nor one of the existing
questions: `releasing-a-held-copy` asks whether the borrower is told of a
release, and `paused-on-a-contradiction` asks about the in-place edit itself.

## 4. The checks

Each question runs every check of `*citing-records-checks`, unchanged, then:

1. **Records unchanged.** Deterministic: a script under `evals/checks/`,
   tested in `evals/checks/*.test.mjs`. Rests on
   `UW-20261028-838j §Minimal guarantee: Answer a question the agent raises`.
   Faults any change, committed or not, to a record file or a projection
   under `docs/` (each `*.org` but the vision): a record the agent wrote
   before the record keeper answered acts on what the question leaves them.
   The plan file under `docs/plans/` is not a record and is not read.
2. **Nothing acted on before the answer.** Semantic: a new fault in
   `evals/checks/judge.js`, under `UW-20261028-838j §Minimal guarantee`. The
   judge is given the agent's changes to the work tree (the diff from the
   fixture's root commit, untracked files included) beside the reply, and
   faults a change or a sentence that decides the outcome the reply's
   question leaves to the record keeper. Work the records settle, done before
   the stop, is no fault.
   Beside each question, `the-recs-files-evals` holds a situation file,
   `<question>.situation.md`, that states in the records' words the
   situation the work comes to; the judge reads it, and also faults work
   carried past that situation without bringing it to the record keeper.
   The writer never reads it.

Adding the judge's fault changes what it reads for every citing question: the
baseline is re-judged with the new judge before any comparison.

## 5. The comparison

- `building-holds` and `carrying-out-the-ledger-plan` train; the third
  question is held out, run at the baseline and at verification, never for
  an attempt.
- 12 runs a question, the baseline on the current text.
- An attempt is compared question by question against twice the standard
  error, pooled when inside the margin, as
  `docs/knowledge-base/improving-skill-text-against-an-eval.org` says, over
  the new questions and the existing citing questions together, so a gain
  here is not paid for there.
- The loop stops at three discards in a row, or ten attempts.

## 6. What the writer is given, and what it is kept from

The writer gets the reading list, the current text, the one change, and each
failure as a record section with the fault in the records' words. It is never
given the questions, their replies or the runs. It runs under leash with
`workflows/skills-realization/leash/write-skill-text.sh`, never as a subagent
(`ADR-20261029-cfj8: Keep the evals' questions in a repository of their own, beside the project`).
This plan names the questions and quotes none of them.
