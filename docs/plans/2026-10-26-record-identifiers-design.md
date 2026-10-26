# Record Identifiers Design

A record's identifier becomes its category's prefix, the UTC date it was
drafted, and four random characters in lowercase Crockford base32:
`ADR-20261026-kzx5`. It replaces the next number a category has not used,
which two branches, or two projects, cannot agree on without seeing each
other's records: `ADR-12` and `ADR-13` already stand on `harness-rendering`
and nowhere else.

## Decisions and where they go

| Decision | Record |
|---|---|
| What an identifier is | `UL-25: Identifier` (proposed) |
| The identifier's form, and why | `ADR-15: Identify a record by the date it was drafted and four random characters` (proposed) |
| The agent gives a new record its identifier, and draws again on a clash | `F-13: A record is written with its identifier and its line in its projection` (proposed), superseding `F-4: A record is written with its line in its projection` |
| "number" becomes "identifier" in standing records that name a record's number | Clarifications, written when the three records are accepted |

## The identifier

- Form: `<PREFIX>-<YYYYMMDD>-<four characters>`, the characters drawn from
  `0123456789abcdefghjkmnpqrstvwxyz`.
- File: the lowercased identifier, a hyphen, the slug —
  `docs/architectural-decisions/adr-20261026-kzx5-<slug>.org`.
- Heading `* ADR-20261026-kzx5 <title>`; citation
  `` `ADR-20261026-kzx5: <title>` ``; section citation
  `` `F-20261026-q3m8 §2: <title>` ``. A feature's requirements keep their
  numbers.
- A projection lists its records in identifier order: by date, and within a
  day by the random characters.
- The agent draws the four characters by running a command, never by
  choosing them, and draws again when the identifier already names a record
  file in its category's directory.

## Re-identifying this project's records

One time, after the three records are accepted, in a commit of its own:

- Each standing, proposed, rejected and withdrawn record keeps its title and
  slug, and gets an identifier dated by the commit that first added its file
  (`git log --follow --diff-filter=A`, in UTC), with freshly drawn
  characters.
- Its file, heading, projection line, every org link to it, and every
  citation of it in `docs/` (plans excepted), `skills/`, `evals/` and
  `AGENTS.md` change in one pass. Plans keep their citations, as
  `ADR-5: A plan keeps the citations it was written with` says.
- The sweep is confined to `docs/`, `skills/`, `evals/` and `AGENTS.md`, so
  no worktree is touched.
- 45 of the 56 records date to 20261014; within that day they sort by their
  random characters.

## Skill text and evals

- `recs-writing-records` step 4 draws the identifier by command, and redraws
  on a clash. `AGENTS.md` and `skills/recs-kickstart/agents-seed.md` carry
  the new form in their examples.
- A project that adopts the recs files keeps its numbered records: the
  skills read both forms, and give every new record the new one.
- The checks in `evals/checks/` that assume `-\d+` (`org-lines.js`,
  `citations.js`, `citing-records.js`,
  `choosing-a-realization-modality.js`) take one pattern matching both
  forms: `[A-Z]+-(?:\d+|\d{8}-[0-9a-hjkmnp-tv-z]{4})`.
- A new check asserts that a record drafted in a run carries an identifier
  dated the run's UTC date, with four valid characters. It goes in red
  before the skill text changes, per `recs-test-driven-development`.
- Case fixtures keep their numbered records, which also exercises reading
  both forms.

## Order of work

1. Propose `UL-25: Identifier`, `ADR-15: Identify a record by the date it was drafted and four random characters` and `F-13: A record is written with its identifier and its line in its projection`, each committed alone, shown with the sentences they falsify.
2. On agreement, accept them and write the replacements.
3. Re-identify every record.
4. Change the skill text and evals, test first.
