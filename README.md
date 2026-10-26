# the-recs-files

Skills for working with an AI agent on a codebase whose records are the
source of truth.

On a long-lived project, what the people decided, the words they use, and what
the code does drift apart. An agent speeds that drift up: it coins terms,
settles questions nobody asked it to settle, and leaves its reasons in places
nobody reads. These skills make the agent keep the project's decisions as
records, agreed with you before they stand, and build from them.

## The idea

A project keeps **records**: short statements of what its system does and why,
each about one thing, with an identifier and a title that states its
substance. The records are the truth for the **realization**, whatever makes
the system do what they say: code, skill text, or other work. The realization
and its checks follow the records, and a comment in code is a citation of a
record and nothing else. The people working on the project are the truth for
the records: a record changes only at their direction, in words they have
agreed to.

Each record belongs to one **category**. A category's records are listed in
its **projection**, and its form is borrowed from a published source, kept in
`docs/knowledge-base/` so the borrowing can be checked:

| Category | Holds | Form |
|---|---|---|
| Vision | What the system is for and the domain it works in | A single file |
| Ubiquitous language (UL) | What a word means, grouped by bounded context | Evans |
| User workflows (UW) | What a person is trying to achieve, step by step | Cockburn |
| Features (F) | What a thing takes and produces, one requirement to a sentence | Mavin (EARS) |
| Message catalog (MSG) | The exact text given on a refusal or failure | — |
| Architectural decisions (ADR) | A pattern the code follows, and why | Nygard |

A record's identifier is its category's prefix, the date it was drafted and
four random characters, `ADR-20261026-kzx5`, so records written on two branches
or in two projects never take the same one. It is cited with its title:
`` `ADR-20261026-kzx5: Store inspection times in UTC` ``.

## How it works

1. You tell the agent what is to be recorded: a decision, a definition, a
   workflow, a feature, or the text of a refusal.
2. The agent places it in a category and checks whether a standing record
   already decides it.
3. It writes the record to disk as Proposed, commits it alone, and shows it to
   you with every sentence elsewhere that the record makes false, each beside
   the wording that replaces it.
4. You agree, reword, or decline. On agreement the record is accepted, and
   the replacements are written in one commit.
5. Plans, code and tests cite the record from then on. A record is never
   edited to mean something else: a changed decision is a new record that
   supersedes the old one, and every citation moves to it.

Building follows the same records: brainstorming routes each decision to its
category, a plan cites the records each task implements, and a review checks
the work against them.

## The skills

- `recs-kickstart`: start here in an existing project. Interviews you,
  analyzes its realization, and writes a thin first slice of records with your
  agreement, plus the project's AGENTS.md.
- `recs-writing-records`: creates, supersedes, retires and clarifies a record,
  and sweeps a word across the codebase.
- `recs-brainstorming`, `recs-writing-plans`, `recs-executing-plans`,
  `recs-subagent-driven-development`, `recs-test-driven-development`,
  `recs-systematic-debugging`, `recs-requesting-code-review`,
  `recs-receiving-code-review`, `recs-verification-before-completion`,
  `recs-using-git-worktrees`, `recs-finishing-a-development-branch`: the
  development flow, from brainstorming to a realization of the records,
  reading and citing records at every step.

The skills are generic: a project's own facts live in its AGENTS.md, which
`recs-kickstart` drafts from `skills/recs-kickstart/agents-seed.md`.

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

Then open a project and ask for `recs-kickstart`.

## Status: 1.0.0-beta

Stable for 1.0: the categories and each category's form, and record management
(creating, superseding, retiring and clarifying a record; renaming and
redefining a term).

May change before 1.0: how a record is identified and named on disk, which
changed in this beta from numbers to dated identifiers; and the development
flow skills, which may be split into a generic flow and a part for each
realization modality.

The skills are evaluated on Claude Sonnet, GPT, Gemini and Qwen; see
`CHANGELOG.md` for the results of each release.

## Contributing

Testing a change to a skill, running the evals and releasing are in
`CONTRIBUTING.md`.

## License

MIT; see `LICENSE`. The development flow skills are derived from
[superpowers](https://github.com/obra/superpowers) by Jesse Vincent, also MIT.
