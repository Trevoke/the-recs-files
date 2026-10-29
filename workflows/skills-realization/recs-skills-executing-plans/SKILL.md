---
name: recs-skills-executing-plans
description: Use when a plan for a change to this project's skill text is written — runs the plan attempt by attempt, holding the eval's questions and replies apart from the agent that writes the text; for the recs-* skills under skills/, not shipped.
---

# Executing a plan for a change to skill text

Carries `UW-20261015-nkb5 §5: Realize a change to the system` and its
extensions 5a and 5b. The agent that runs the plan is the orchestrating
agent; it holds the eval, and runs the agent that writes the text with
`leash/write-skill-text.sh`, never as a subagent
(`ADR-20261029-cfj8: Keep the evals' questions in a repository of their own, beside the project`).

**Core principle:** the writer never sees what it is scored on. The
orchestrator holds the questions, the replies and the runs, and hands the
writer the records, the current text, the one change from the plan, and each
failure as a record section.

## The process

**1. Load the plan.** Read it, then each record on its reading list, from
disk. Where the plan and a record disagree, stop and raise it.

**2. For each attempt, in the plan's order:**
1. The eval first: `recs-skills-test-driven-development`, until the case or
   check is written and seen to fail on the current text.
2. Write the writer's brief to a file: the reading list, the current text,
   the one change and the section it realizes, each failure as a record
   section with the fault in the records' words, the house style from
   AGENTS.md "Making a record change", and the instruction to write files
   only. Run it with `leash/write-skill-text.sh <project dir> <brief file>`;
   leash refuses it every read of `the-recs-files-evals`, of `evals/runs/`
   and of the history of `evals/cases/`. It writes one change across the
   files that carry the sentence; read the diff when it returns.
3. Commit the attempt alone, with the section it realizes in the body. Only
   this agent runs `git add` and `git commit`; the writer cannot run git.
4. Run and compare as the plan says; keep or revert.
5. Log the attempt: commit, the change in a sentence, the score with its
   error, the verdict, and what moved.

**3. A check fails (5a):** find the cause before the text changes again. Read
each failing reply in full; put each fault under the condition that produced
it — where in the reply it sits, what the agent was doing and had read. A
cause that is the eval's — a check stricter than its record, a fixture
against the house form — is raised with the record keeper and fixed before
the next attempt. A cause that is the text's is handed to the writer as a
record section and the condition, never as the question or the reply.

**4. A decision no record holds (5b):** stop. Frame it as AGENTS.md "Framing
a question" says and raise it as a record change through
`recs-writing-records`. Nothing is written into a record on your own, and
no attempt rests on it before it stands.

**5. Review and verification:** after the loop ends, `recs-skills-requesting-review`,
then `recs-skills-verification-before-completion`.

## Stop and ask when

- the plan and a record disagree;
- the change needs a sentence no record section carries;
- the eval, not the text, is what fails;
- an attempt's verdict rests on noise and the plan does not say what to do.
