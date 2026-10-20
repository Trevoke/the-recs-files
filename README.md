# the-recs-files

Skills for working on a codebase whose records are the source of truth.

## The idea

A project keeps **records**: short, numbered, one-thing-each statements of what
its system does and why. The records are the truth for the **realization**,
whatever makes the system do what they say: code, skill text, or other work.
The realization and its checks follow the records, and a comment is a citation
of a record and nothing else. The people working on the project are the truth
for the records: a record changes only at their direction, in words they have
agreed to.

Each record belongs to a **category**, listed in the **projection** named
after it, and each category's form is borrowed from a published source (kept in `docs/knowledge-base/` so the borrowing can be checked):

| Category | Holds | Form |
|---|---|---|
| Vision | What the system is for and the domain it works in | A single file |
| Ubiquitous language | What a word means, grouped by bounded context | Evans |
| User workflows (UW-n) | What a person is trying to achieve, step by step | Cockburn |
| Features (F-n) | What a thing takes and produces, one requirement to a sentence | Mavin (EARS) |
| Message catalog (MSG-n) | The exact text given on a refusal or failure | — |
| Architectural decisions (ADR-n) | A pattern the code follows, and why | Nygard |

## The skills

- `recs-kickstart`: start here in an existing project. Interviews you,
  analyzes its realization, and writes a thin first slice of records with your
  agreement, plus the project's AGENTS.md.
- `recs-writing-records`: adds, supersedes, retires a record, and sweeps a word
  across the codebase.
- `recs-brainstorming`, `recs-writing-plans`, `recs-executing-plans`,
  `recs-subagent-driven-development`, `recs-test-driven-development`,
  `recs-systematic-debugging`, `recs-requesting-code-review`,
  `recs-receiving-code-review`, `recs-verification-before-completion`,
  `recs-using-git-worktrees`, `recs-finishing-a-development-branch`: the
  development flow, from brainstorming to a realization of the records,
  reading and citing records at every step.

A project's facts live in its own AGENTS.md, which `recs-kickstart` drafts from
`skills/recs-kickstart/agents-seed.md`.

These skills are meant to be reused across projects, so they stay generic: no
project vocabulary, branch name, file name or tool command is baked into one,
and project facts live in each project's AGENTS.md. A language may appear in an
ecosystem example list beside npm, cargo and pytest.

## Installing

Each harness has a package of its own, built from this repository on each
release and published to its own repository; the opencode package is not yet
published. The recs files install at project scope by default:

| Harness | Project scope (the default) | User scope |
|---|---|---|
| Claude Code | `claude plugin marketplace add --scope project Trevoke/the-recs-files-claude`, then `claude plugin install --scope project recs-files@the-recs-files` | `claude plugin marketplace add --scope user Trevoke/the-recs-files-claude`, then `claude plugin install --scope user recs-files@the-recs-files` |
| Codex | `codex plugin` has no project-scope option | `codex plugin marketplace add Trevoke/the-recs-files-codex`, then `codex plugin add recs-files@the-recs-files` |
| pi | `pi install -l git:github.com/Trevoke/the-recs-files-pi@v<version>` | `pi install git:github.com/Trevoke/the-recs-files-pi@v<version>` |
| Antigravity | `agy plugin install` has no project-scope option | `agy plugin install https://github.com/Trevoke/the-recs-files-agy` |
| opencode | Copy the package's `skills` and `agents` into the project's `.opencode/` | Copy the package's `skills` and `agents` into `~/.config/opencode/` |

With the Claude Code package, Claude Code must run with the environment
variable `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` set; without it, the behaviour of
the recs files is undefined.

The Claude Code, Antigravity and opencode packages carry the
`recs-code-reviewer` subagent as well as the skills.

The opencode package is built and validated but not yet published, and is
written for opencode 2 (`@opencode/cli`). Build it locally with
`node packaging/build.mjs opencode <dir> <version>`, then copy from `<dir>`.

A harness without a package gets one through a new harness profile in
`packaging/profiles/`, with its name in `harnesses` in `packaging/render.mjs`,
a leg in `packaging/validate.sh`, and a line in the matrix of
`.github/workflows/package.yml`.

Then open a project and ask for `recs-kickstart`.

### Releasing

Pushing a `v*` tag runs `.github/workflows/package.yml`, which builds each
package with `packaging/build.mjs` and pushes it, tagged, to its repository;
each package repository then creates its own release from the CHANGELOG. A
package can be built and inspected locally:

```sh
node packaging/build.mjs claude /tmp/recs-claude v1.0.0-beta
```

## Status: 1.0.0-beta

Stable for 1.0: the record forms, the categories, and record management
(creating, superseding, retiring and clarifying a record; renaming and
redefining a term).

May change before 1.0: the development flow skills, which may be split into a
generic flow and a part for each realization modality.

The skills are evaluated on Claude Sonnet, GPT, Gemini and Qwen; see
`CHANGELOG.md` for the results of each release.

## Testing a change to a skill

Follow `superpowers:writing-skills`: watch an agent fail without the change
before writing it.

A subagent inherits the project's skill list, so a control arm told not to use
the skill under test can still load it on its own initiative. Forbid that skill
by name, forbid every other skill, and read the run's own tool calls to confirm
it loaded none. Check the outcome against the fixture directly; an agent's
report of its own run is not evidence.

### Evals

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
```

The pi runs need `OPENROUTER_API_KEY`, the Claude Code runs need
`CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`) and `claude` on `PATH`,
and the `llm-rubric` grader needs `ANTHROPIC_API_KEY`. Every run needs
bubblewrap (`bwrap`): each run sees only the system, its harness and its own
directory. Each run's transcript is kept beside its project, as `pi.jsonl` or
`claude.jsonl`.

## License

MIT; see `LICENSE`. The development flow skills are derived from
[superpowers](https://github.com/obra/superpowers) by Jesse Vincent, also MIT.
