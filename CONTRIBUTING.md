# Contributing

This project keeps its own records under `docs/`, and `AGENTS.md` says how to
work with them. The skills under `skills/` stay generic: no project
vocabulary, branch name, file name or tool command is baked into one, and
project facts live in each project's AGENTS.md. A language may appear in an
ecosystem example list beside npm, cargo and pytest.

## Testing a change to a skill

Follow `superpowers:writing-skills`: watch an agent fail without the change
before writing it.

A subagent inherits the project's skill list, so a control arm told not to use
the skill under test can still load it on its own initiative. Forbid that skill
by name, forbid every other skill, and read the run's own tool calls to confirm
it loaded none. Check the outcome against the fixture directly; an agent's
report of its own run is not evidence.

## Evals

Each case's question is kept in `the-recs-files-evals`, checked out beside
this repository, and read from the directory `RECS_EVALS_QUESTIONS` names
(`ADR-20261029-cfj8: Keep the evals' questions in a repository of their own, beside the project`);
a run fails without it.

```sh
git clone git@github.com:Trevoke/the-recs-files-evals.git ../the-recs-files-evals
export RECS_EVALS_QUESTIONS="$PWD/../the-recs-files-evals"
```

`evals/` runs each case under `evals/cases/` with promptfoo, on each model in
`evals/promptfooconfig.yaml`, with the skills installed and without. Every
model runs in the same harness, pi (`evals/providers/pi.js`), reached through
OpenRouter. Each run starts from a fresh git repository of the case's fixture,
under the system's temporary directory so that no AGENTS.md above it is
loaded, with a pi configuration directory of its own. The checks in
`evals/checks/` read the files and commits the agent left behind. Each check
cites the record it tests.

```sh
cd evals
npm install
npm run eval            # every case, every arm
npm run eval -- --repeat 3 --filter-providers 'with-skills'
npm run view            # browse the results
node --test checks/*.test.mjs   # the checks' own tests
```

The runs need `OPENROUTER_API_KEY`, and `ANTHROPIC_API_KEY` for the
`llm-rubric` grader, and bubblewrap (`bwrap`): each run sees only the system,
node, pi and its own directory. Each run's transcript is kept beside its
project, as `pi.jsonl`.

The `claude-code-sonnet` arms run the `claude` CLI in the same sandbox, with
`skills/` copied into the run's `.claude/skills`, on your Claude subscription:
run `claude setup-token`, export what it prints as `CLAUDE_CODE_OAUTH_TOKEN`,
and run `npm run eval:claude-code`. A model in the run can read that token, so
keep its transcripts on your machine.

`npm run score:citations` scores the `citing-records-to-the-record-keeper`
questions in Claude Code: faults per citation under the four checks, per
question and overall, and with `--against` whether a wording beats another
question by question. How it is used to improve the skills' wording is in
`docs/knowledge-base/improving-skill-text-against-an-eval.org`.

## Releasing

Pushing a `v*` tag runs `.github/workflows/package.yml`, which builds each
package with `packaging/build.mjs` and pushes it, tagged, to its repository;
each package repository then creates its own release from the CHANGELOG. A
package can be built and inspected locally:

```sh
node packaging/build.mjs claude /tmp/recs-claude v1.0.0-beta
```
