# Record Identifiers in the Skill Text and Evals Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use recs-executing-plans to implement this plan task-by-task.

**Goal:** Make the agent give each new record the identifier `F-20261026-tacr: A record is written with its identifier and its line in its projection` asks for, read both identifier forms, and prove it with an eval.

**Architecture:** The eval checks learn one identifier pattern that matches both forms. The `proposing-a-record` case gets a check that the drafted record's identifier carries its draft date and four valid characters; a baseline run on the current skills shows it red. Then `recs-writing-records`, the kickstart seed and the other skills change, and the eval runs again.

**Tech Stack:** promptfoo, Node 24 (`node --test`), pi through OpenRouter, bubblewrap.

---

## How to Speak

The ubiquitous language is in `docs/ubiquitous-language.org`. This plan's work touches these defined terms:

- **Identifier** (`UL-20261026-3m08: Identifier`) — the name of one record: its category's prefix, then what tells it from every other record of that category.
- **Record** (`UL-20261015-0twc: Record`) — a short statement of one truth about a system, with an identifier and a title that states its substance.
- **Citation** (`UL-20261015-aycy: Citation`) — a reference to a record by its identifier and title, or to a heading of the knowledge base.
- **Projection** (`UL-20261015-xjgm: Projection`) — the listing of every standing or proposed record in one category, in identifier order.
- **Proposed** (`UL-20261015-qzvs: Proposed`) and **Category** (`UL-20261015-3avc: Category`).

The evals' own words — case, fixture, check, arm, provider — are the ones `README.md` and `evals/` use. Coin nothing.

## Do Not Modify

- every record file under `docs/` and its projections
- `evals/cases/*/` (the fixtures are projects whose records are numbered)

If a task seems to require changing one of these, STOP and raise it with the record keeper.

## Reading List

1. `UW-20261014-8c8f: Create a record` — the workflow; step 3 drafts the record
2. `ADR-20261026-77gd: Identify a record by the date it was drafted and four random characters` — the form, the drawing command, both forms read
3. `F-20261026-tacr: A record is written with its identifier and its line in its projection` — §2 and §3 are the surface built here
4. `UL-20261026-3m08: Identifier`
5. `docs/plans/2026-10-26-record-identifiers-design.md`

## Cataloged-Text Ordering

No task touches cataloged text.

## The identifier pattern

Both forms, as a regular expression source string: `(?:\d{8}-[0-9a-hjkmnp-tv-z]{4}|\d+)`. The dated form comes first so that `F-20261014-0ymh` is not read as `F-20261014`.

### Task 1: The citation check reads both forms

**Records:** `F-20261024-5tt7: The agent cites a record to the record keeper in its title's exact words`; `ADR-20261026-77gd: Identify a record by the date it was drafted and four random characters`

**Files:** Create `evals/checks/identifier.js`; modify `evals/checks/citations.js:1,7`; test `evals/checks/citations.test.mjs`.

1. Test: a whole citation of `ADR-20261015-70tz` (title map holding it) is one citation, known, titled, backticked.
2. Run `node --test checks/citations.test.mjs` in `evals/`: FAIL, no citation found.
3. `identifier.js` exports `prefix = '(?:UL|ADR|F|UW|MSG)'` and `identifier = '(?:\\d{8}-[0-9a-hjkmnp-tv-z]{4}|\\d+)'`; `citations.js` builds its identifier regex from them.
4. Run all check tests: PASS. Commit.

### Task 2: The org line checks read both forms

**Records:** `ADR-20261015-0v6s: Records are written in org`; `ADR-20261026-y9zt: A record names another record by an org link to its file`

**Files:** modify `evals/checks/org-lines.js:5-8,62`; test `evals/checks/org-lines.test.mjs`.

1. Tests: a projection line with a dated identifier, broken across lines, is a fault; a plain dated name in a body is reported whole (`ADR-20261015-70tz`).
2. Run: FAIL.
3. `recordFile`, `projectionEntry`, `wholeProjectionEntry` and `plainNames` take the identifier pattern.
4. Run: PASS (the repository's own records included). Commit.

### Task 3: The citing-records check reads dated projection lines

**Records:** `F-20261024-5tt7: The agent cites a record to the record keeper in its title's exact words`

**Files:** modify `evals/checks/citing-records.js:12-20`; test `evals/checks/citing-records.test.mjs`.

1. Test: `projectionTitles` of a dated projection line maps its identifier to its title.
2. Run: FAIL (no export).
3. Export `projectionTitles(text)`, built on the identifier pattern; `titles` uses it.
4. Run: PASS. Commit.

### Task 4: The proposing-a-record case checks the identifier

**Records:** `F-20261026-tacr: A record is written with its identifier and its line in its projection` (§1, §2, §4)

**Files:** modify `evals/checks/proposing-a-record.js`, `evals/promptfooconfig.yaml` (the `proposing-a-record` test); create `evals/checks/proposing-a-record.test.mjs`.

1. Tests, against a temporary copy of the fixture with one drafted record:
   - `adr-<date>-<four characters>-<slug>.org`, headed with the uppercased identifier, written today: passes;
   - `adr-4-<slug>.org`: fails; a file whose date is not the day it was written: fails;
   - characters outside the alphabet (`adr-<date>-kzil-…`): fail;
   - `listedUnderProposed` and `sameTitle` find the line by the drafted record's identifier.
2. Run: FAIL (no `identifierFromDateAndCharacters`).
3. Replace `numberedFour` with `identifierFromDateAndCharacters`: one drafted file, its name `adr-(\d{8})-([0-9a-hjkmnp-tv-z]{4})-…`, the date its modification time's UTC date, and its heading `* ADR-<date>-<characters> `. `listedUnderProposed` and `sameTitle` take the identifier from the drafted record's heading. The config's metric becomes `identifier from the date and four characters`, citing `F-20261026-tacr §2: A record is written with its identifier and its line in its projection`.
4. Run: PASS. Commit.

### Task 5: Baseline

Run, in `evals/`:

```sh
npm run eval -- --filter-pattern 'asks for a record$' --filter-providers 'with-skills'
```

Expected: `identifier from the date and four characters` fails on every arm (the skills still say "the next number"). Record each arm's result.

### Task 6: The skill text gives the identifier

**Records:** `F-20261026-tacr: A record is written with its identifier and its line in its projection` (§2, §3, §5); `ADR-20261026-77gd: Identify a record by the date it was drafted and four random characters`; `UL-20261026-3m08: Identifier`

**Files:** `skills/recs-writing-records/SKILL.md`, `skills/recs-kickstart/agents-seed.md`, and every skill sentence that says a record's "number": `recs-brainstorming`, `recs-executing-plans`, `recs-writing-plans`, `recs-receiving-code-review`, `recs-requesting-code-review/code-reviewer.md`, `recs-subagent-driven-development/spec-reviewer-prompt.md`, `recs-systematic-debugging`, `recs-test-driven-development`.

1. `recs-writing-records` step 4: the identifier's form; the POSIX and PowerShell commands that draw it; draw again when it names a file in the category's directory; the file name; numbered records keep their numbers and new records take the dated form. "number" → "identifier" where it names a record (statuses, never reused, clarification kept, citations, the category table).
2. The seed takes the wording AGENTS.md took when `F-20261026-tacr: A record is written with its identifier and its line in its projection` was accepted.
3. The other skills: "by number and title" → "by identifier and title", "record numbers" → "record identifiers".
4. Run the check tests; commit.

### Task 7: Eval again, and the changelog

1. Run the Task 5 command. Expected: `identifier from the date and four characters` passes on every arm, the other checks as before.
2. Run `superseding-two-features` and `rejecting-a-proposed-record` with-skills to see the numbered fixtures still pass.
3. `CHANGELOG.md`: an Unreleased entry for the identifier, with these results; repoint its Unreleased citations to the new identifiers. Commit.
