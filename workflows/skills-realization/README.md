# Skills realization

The flow for a change to this project's own realization: the `recs-*` skills
under `skills/`, checked by the evals under `evals/`. It realizes
`UW-20261015-nkb5: Realize a change to the system` with skill text as the
realization modality, one skill to a step:

| Step of the workflow | Skill |
|---|---|
| §1–§3, 1a: read the records, settle the change, raise each decision as a record change | `recs-skills-brainstorming` |
| §4: a plan, each step citing the records it realizes | `recs-skills-writing-plans` |
| §5, 5a, 5b: realize the plan, checking each step against the records | `recs-skills-executing-plans`, with `recs-skills-test-driven-development` for each attempt |
| §5: check a step against the records | `recs-skills-requesting-review`, `recs-skills-receiving-review` |
| §6, §7, 7a: show the realization and how it was checked | `recs-skills-verification-before-completion` |

What the flow holds to, in every skill: the records are the only source of
intent, and a score is evidence about the text, never the goal; the agent that
writes skill text is given the records, the current text and its failures as
record sections, and never the eval's questions, replies or runs; it runs
under leash with `leash/write-skill-text.sh`, never as a subagent, so that
leash refuses it every read of `the-recs-files-evals` and of the history of
`evals/cases/`
(`ADR-20261029-cfj8: Keep the evals' questions in a repository of their own, beside the project`);
the eval case or check changes first and is seen to fail on the current
text; a decision no record holds is raised as a record change and never
written on the agent's own.

## Setting up

The writer runs with `leash/write-skill-text.sh <project dir> <brief file>`:
`claude -p` under leash, in the project directory, with the brief as its
prompt. Before the first run:

- `npm install` in `workflows/skills-realization/`; `package.json` pins
  leash.
- Docker running. Docker Desktop mounts only the directories under Settings → Resources → File Sharing, so the project's directory must be among them.
- `CLAUDE_CODE_OAUTH_TOKEN` set in the environment; the script passes it in.

The questions are not in the writer's container; `.git/` and `evals/runs/`
are refused there, so a read of either fails with "Permission denied"; and
it cannot run git, so the agent running the loop reads the diff and commits.

These skills are not shipped: `packaging/` builds from `skills/` alone. They
are used in this repository by a link from `.claude/skills/<name>` to
`workflows/skills-realization/<name>`, so a session here loads them by name.
What the loop has established is in
`docs/knowledge-base/improving-skill-text-against-an-eval.org`, and the
eval's machinery is described in `CONTRIBUTING.md`.
