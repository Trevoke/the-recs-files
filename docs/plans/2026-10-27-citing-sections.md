# Citing Sections Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use recs-executing-plans to implement this plan task-by-task.

**Goal:** The agent cites one record once for all the sections it means, and lists what it says of each section on the lines under that citation, as `docs/plans/2026-10-27-citing-sections-design.md` sets out, proven by the citing-records eval.

**Architecture:** Records first: a term, Section, and a feature superseding `F-20261024-5tt7: The agent cites a record to the record keeper in its title's exact words`, proposed, agreed, accepted. Then the eval, red on the skill text as it stands. Then the skill text: every change to its prose is made by a Fable subagent working from the records, starting from the replacements the record keeper agreed and improved by a keep-if-better loop (`docs/knowledge-base/improving-skill-text-against-an-eval.org`). Beside the prose, a few rounds put the feature's EARS requirements into the skill text as they stand, to learn how that behaves.

**Tech Stack:** org records; promptfoo with the Claude Code provider only (`claude-code-sonnet with-skills`, token from `MY_CLAUDE_CODE_OAUTH_TOKEN`, never printed); Node (`node --test`); bubblewrap.

---

## How to Speak

The ubiquitous language is in `docs/ubiquitous-language.org`. This plan's work touches these defined terms:

- **Citation** (`UL-20261015-aycy: Citation`) — a reference to a record by its identifier and title, or to a heading of the knowledge base.
- **Record keeper** (`UL-20261015-5dhq: Record keeper`).
- **Successor** (`UL-20261015-5wrg: Successor`), **Proposed** (`UL-20261015-qzvs: Proposed`), **Accepted** (`UL-20261015-x3nr: Accepted`), **Superseded** (`UL-20261015-sc9n: Superseded`).
- **Falsified sentence** (`UL-20261015-wsw6: Falsified sentence`), **Sweep** (`UL-20261015-hw61: Sweep`).
- **Section** — agreed with the record keeper on 2026-10-27, and written only in Task 1: "A part of a record that a citation can name."

The lines listed under a citation have no term: they are not citations. The evals' own words — case, fixture, check, question, train, held-out — are the ones `evals/` uses. Coin nothing.

## Do Not Modify

- every record file under `docs/` and its projections, outside Tasks 1–4, which go through recs-writing-records
- `docs/plans/` other than this plan and its design
- `CHANGELOG.md` and `docs/knowledge-base/` citations of `F-20261024-5tt7`, which stay as written
- the fixtures' records under `evals/cases/*/fixture/docs/`

If a task seems to require changing one of these, STOP and raise it with the record keeper.

## Reading List

1. `F-20261024-5tt7: The agent cites a record to the record keeper in its title's exact words` — the record being superseded
2. `UL-20261015-aycy: Citation`
3. `ADR-20261015-p3cx: Feature records are written in EARS` — "Each requirement is a section a citation can name"
4. `F-20261027-jtb9: A superseded record names its successor` — `:SUPERSEDES:` holds links only, no section map
5. `F-20261027-v2mt: A sweep repoints or removes citations, and leaves plans as written`
6. `docs/plans/2026-10-27-citing-sections-design.md`
7. `docs/knowledge-base/improving-skill-text-against-an-eval.org`
8. AGENTS.md, "# How to talk to the record keeper"

## Cataloged-Text Ordering

No task touches cataloged text.

### Task 1: Propose the term Section

**Records:** `UW-20261014-8c8f: Create a record`

1. Draw the identifier by command (recs-writing-records step 4).
2. Write `docs/ubiquitous-language/ul-<id>-section.org`, Proposed, body "A part of a record that a citation can name.", in the form of its neighbours, and its line under `* Proposed` in `docs/ubiquitous-language.org`.
3. Commit it alone: `Propose UL-<id>: Section`.

### Task 2: Propose the feature

1. Draw the identifier. Write `docs/features/f-<id>-the-agent-cites-a-record-to-the-record-keeper-in-its-titles-exact-words-with-every-section-it-means.org`: the seven requirements of the design, the examples under §2, §3, §6 and §7 on the library records, and `:SUPERSEDES:` as one link to `F-20261024-5tt7`, no section map.
2. Check every example against its requirement, and against the other six.
3. Its line under `* Proposed` in `docs/features.org`. Commit it alone.

### Task 3: Show both, with every falsified sentence — STOP for agreement

A Fable subagent (`model: fable`, edits nothing, reads the two proposed records and the skill text) drafts the replacement for each falsified sentence from the records. Show the record keeper both records' text and paths, and each falsified sentence quoted beside its replacement (the design's "What it falsifies"), every Good example checked to obey the new feature and every Bad one to break it. Ask, too, for the window between Task 4 and Task 8 where the skill text still says one section to a citation. Nothing proceeds before agreement.

### Task 4: Accept

Statuses, projection lines moved out from under `* Proposed`, `F-20261024-5tt7` Superseded by link, and `evals/promptfooconfig.yaml`'s four comments repointed to the successor's §1, §2, §4, §5, each judged against what its check asserts. Re-grep `5tt7`: only the changelog, plans, the knowledge base and the successor's `:SUPERSEDES:` remain. Commit alone. The skill text waits.

### Task 5: The checks, test first

**Records:** the new feature, §2, §3, §6, §7

**Files:** `evals/checks/citations.js`, `evals/checks/citing-records.js`, `evals/checks/citing-records.test.mjs`.

1. Bring `sectionsInOneCitation`, `sectionsListedUnder`, `unfenced`'s export and the citations' `start`/`end` from `backup/citation-sections-session` (`git show backup/citation-sections-session:evals/checks/…`; in zsh write `"${B}:evals/…"`, since `$B:e` is a modifier), with their unit tests. Turn "a citation naming two sections fails" into "passes", and drop "or name more than one" from `sectionBeforeTitle`.
2. Write failing tests, then the checks:
   - `sectionsInRecordOrder`: `§3, §2` fails; `§2–§4` and `§2-4` fail; `§2, §2a` and `§Context, §Decision` pass.
   - `noSectionsOfARecordNotOnDisk`: `` `F-3 §3: …` `` where F-3 has no file fails; a section citation of a record on disk passes; an identifier without a section passes.
   - `quotesInCodeBlocks`: outside a code block, an org link `[[./…][…]]`, a line or inline span starting with a property (`:SUPERSEDES:`), or a quoted sentence holding " shall " fails; the same inside a fenced block passes.
3. `node --test checks/*.test.mjs` in `evals/`: all pass. Commit.

### Task 6: Wire the eval

1. `evals/promptfooconfig.yaml`: the new metrics in `*citing-records-checks`, each under a comment citing the successor's section it checks.
2. New train questions, `evals/cases/citing-records-to-the-record-keeper/prompts/listing-the-refusals.md` ("What does the library refuse when a borrower renews a loan, and what does each refusal tell them?") and `quoting-a-requirement.md` ("What exactly does the renewal feature say about reserved books?"), each with its `(train: …)` test.
3. `evals/scripts/score-citations.mjs`: the new check names in `checks`, and their reasons parsed (the backup branch parses "N sentences/lines …").

### Task 7: Red

`npm run score:citations -- --split all --repeat 3 --jobs 4 --out <scratch>/baseline.json --log <scratch>/loop.log`, with `TMPDIR` in the scratchpad. Read the failing excerpts: each is a reply that breaks the feature, not a check's false alarm; fix the check (with a unit test) where it is. Commit the eval with the baseline in its message.

### Task 8: The agreed replacements — attempt 1

A Fable subagent (`model: fable`, edits only, never commits) writes Task 3's agreed replacements into AGENTS.md, `skills/recs-kickstart/agents-seed.md` and the two fixtures that carry the section (`citing-records-to-the-record-keeper`, `superseding-two-features`; "number" for "identifier" there). Check the seed equals AGENTS.md's section, each fixture differs only by that word, and every example against the feature. Commit. Score on train against the baseline (`--against`).

### Task 9: The loop

Per the knowledge base entry: one change per attempt across the same files, from failing excerpts of train questions only and the attempt log; every example checked against the feature before a run; kept when the gap beats the margin, pooled when within it, reverted otherwise. Stop after three discards in a row or ten attempts. Then held-out, six runs each, best against baseline; the supersede case five runs; the other cases three runs each.

### Task 10: The EARS rounds

An experiment the record keeper asked for, to learn from whatever it shows. Each round starts from the baseline text (Task 7's commit), is written by a Fable subagent into the same files, and is scored like an attempt (train, three runs each, `--against` the baseline and the best prose):

- **E1** — the citation section's prose replaced by the feature's seven requirements, verbatim, under one sentence naming the feature.
- **E2** — E1 with the feature's examples under their requirements.
- **E3**, if E1 or E2 shows something worth chasing — the best prose with the requirements added after it.

Each round is its own commit, reverted after it is scored; the attempt log holds every round's score and failing excerpts. Report all rounds to the record keeper beside the prose loop's best, and the record keeper chooses what stays.

### Task 11: Review and close

The record keeper reviews the skill-text diff. Add the attempts to the knowledge base entry. Remove the entry from `docs/todo.org`. Commit.
