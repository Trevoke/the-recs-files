# Harness rendering — design

Realizes:
- ADR-9: The code realization skills are a prototype adapted from superpowers
- ADR-10: Render each harness's package from capability markers and a harness profile
- ADR-11: Keep the order of the skills in a skill flow beside them

What follows is what routing left to a design document: the decisions below
the records.

## Capability markers in the source

`skills/` keeps one copy of the skill text. A capability marker stands for the
harness phrase only; the verbs, capitals and punctuation around it stay in the
source:

- `Create {{trf: memory}} and proceed`
- `{{trf: delegate general-purpose brief}}:`
- `Use {{trf: delegate recs-code-reviewer sentence}}, fill template at …`
- `REQUIRED SUB-SKILL: {{trf: load recs-executing-plans}}`

Markers go, to begin with, on three harness capabilities:

| Harness capability | Sites |
|---|---|
| delegate | the six `Task tool (general-purpose):` call headers (kickstart's four analyzer prompts, the implementer and spec-reviewer prompts); `Task tool (recs-code-reviewer):` in the code-quality-reviewer prompt; "Use Task tool with recs-code-reviewer type" in recs-requesting-code-review |
| memory | the seven TodoWrite sites (recs-executing-plans, recs-subagent-driven-development, four of them inside Graphviz node labels); "Mark as in_progress" / "Mark as completed" in recs-executing-plans |
| load | every instruction to load another skill: "REQUIRED SUB-SKILL: Use …", "Use recs-… to …", and the "Use recs-finishing-a-development-branch" node |

Delegate takes the role and a form: `brief`, a heading above a prompt, or
`sentence`, inside a sentence. Load takes the skill.

Left unmarked: hand off, clear, ask, restrict and harness tool, which every
harness profile names but no site needs yet; files beside a skill ("read
`interviewing.md`", prompt templates); the "Related skills" lists. A site gets
a marker the first time some harness needs different words there. Restrict is
kept apart from delegate: a harness with real permission boundaries may serve
a restricted delegate on another harness.

## Harness profiles

`packaging/profiles/<harness>.json`, one per harness. Each states, for all
eight harness capabilities, `native`, `extension`, `prose` or `absent`; a
template per marker it renders, filled with the marker's arguments; and the
files its package carries (manifests, native agents, the role file,
extensions). The per-harness branches now in `packaging/build.mjs` move into
these declarations.

| | delegate | recs-code-reviewer | memory | load |
|---|---|---|---|---|
| Claude Code | `Task tool (…)` / `Task tool with … type` — today's text | native `agents/recs-code-reviewer.md` | `TodoWrite`, `in_progress` / `completed` | today's text |
| Codex | `spawn_agent` | role file, given to a general-purpose delegate | `update_plan` | bare name |
| Antigravity | `invoke_subagent` | native agent with its tool list | a task artifact, a markdown checklist | bare name |
| pi | the `subagent` tool of our extension | role file | memory file | bare name |

- **Role file.** Rendering derives `recs-requesting-code-review/reviewer-role.md`
  from the body of `agents/recs-code-reviewer.md`, which stays its one source.
  Only harness profiles that say "role file" ship it.
- **Memory file.** A harness profile that uses one names its path: outside the
  project's tracked tree, and stable for the length of the work, so the list
  is read back after the context compacts. pi's path is settled in the plan.
- **pi extension.** Rebuilt from the reverted
  `packaging/pi/extensions/subagent/index.ts` (39e4f4d^): one tool,
  `subagent({ prompt })`, spawning `pi -p --mode json --no-session --model
  <current>` and returning the last assistant text.
- **opencode.** Reads `.claude/skills`, so it takes the Claude Code rendering
  for now; its own harness profile and package come later.

## Skill flow

`skills/skill-flow.dot`, copied unchanged into every package; no skill loads
it. Nodes: the thirteen skills, and the prompt templates they delegate (four
kickstart analyzers, implementer, spec reviewer, code-quality reviewer, code
reviewer). Each edge carries `kind` (`load`, `handoff`, `delegate`), a
condition where it branches, and a citation: a step or extension of UW-7:
Realize a change to the system or UW-8: Start a project's records from its
realization, ADR-9, or both. Edges into recs-using-git-worktrees,
recs-finishing-a-development-branch and recs-receiving-code-review cite ADR-9.

## Checks

Rendering refuses, and packages nothing, on:
- a marker whose keyword is not a harness capability, or whose arguments do
  not fit it;
- a harness profile lacking a harness capability, or a marker the source uses;
- `{{trf:` left in any rendered package;
- a load or delegate marker with no matching skill flow edge, or an edge with
  no marker at its source;
- an edge citing a record that is not on disk and Accepted.

**Claude Code, once.** The commit that introduces the markers renders Claude
Code and compares it byte for byte with the skills at its parent (39e4f4d
wording).

**Packages, before any is published.** `.github/workflows/package.yml` becomes
build → validate → publish, publishing only on a tag; `actions/*@v7` on Node
24. Validation (rebuilt from the reverted 7726edf): Claude Code `plugin
validate` and an install in a throwaway config directory; Codex marketplace
add and install, thirteen skills present; pi install, extension declared,
memory file path outside the tree; Antigravity structural check of
`plugin.json` and the agent's frontmatter.

**Behaviour, by eval, in bubblewrap.** Evals copy a rendering into each run's
project; the pi provider runs the pi rendering. New cases: delegate (the run
shows that harness's delegate call) and memory (a plan of several tasks, the
list kept as the harness profile says, `nothingElseWritten` still holding). A
Claude Code eval provider runs the `claude` CLI on the Claude Code rendering —
its own plan step.

## Sentences replaced when rendering lands

Agreed with ADR-10, written in the plan step that builds rendering:

- AGENTS.md: "This project's evals copy the skills from the `skills/` beside
  their own `evals/` into each run's project, so a worktree's evals run that
  worktree's skills" → "This project's evals render the skills from the
  `skills/` beside their own `evals/` into each run's project, so a worktree's
  evals run that worktree's skills"
- README.md: "Elsewhere, such as in opencode, copy (or link) `skills/recs-*`
  into a directory the harness reads skills from, such as a project's
  `.agents/skills`." → "Elsewhere, such as in opencode, copy (or link) the
  skills from the Claude Code package, `Trevoke/the-recs-files-claude`, into a
  directory the harness reads skills from, such as a project's
  `.agents/skills`."
