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
record sections, and never the eval's questions, replies or runs; the eval
case or check changes first and is seen to fail on the current text; a
decision no record holds is raised as a record change and never written on
the agent's own.

These skills are not shipped: `packaging/` builds from `skills/` alone. They
are used in this repository by a link from `.claude/skills/<name>` to
`workflows/skills-realization/<name>`, so a session here loads them by name.
What the loop has established is in
`docs/knowledge-base/improving-skill-text-against-an-eval.org`, and the
eval's machinery is described in `CONTRIBUTING.md`.
