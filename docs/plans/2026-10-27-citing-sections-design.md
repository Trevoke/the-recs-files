# Citing Sections Design

When the agent tells the record keeper about several sections of one record,
it cites the record once, naming every section it means, and lists what it
says of each section on the lines under that citation:

```
`F-1 §2, §3: A borrower renews a loan for one more loan period unless the book is reserved` refuse a renewal:
- §2: of a reserved book
- §3: past the renewal limit
```

It replaces `F-20261024-5tt7: The agent cites a record to the record keeper in its title's exact words`,
under which two sections are two citations, each repeating the title.

## Decisions and where they go

| Decision | Record |
|---|---|
| What a section is | A new ubiquitous language term, Section: "A part of a record that a citation can name." It names no category |
| How the agent cites records to the record keeper | A new feature superseding `F-20261024-5tt7: The agent cites a record to the record keeper in its title's exact words`, titled "The agent cites a record to the record keeper in its title's exact words, with every section it means" |

Settled with the record keeper while brainstorming, 2026-10-27:

- **Scope.** The rule covers what the agent says to the record keeper.
  Code comments, links inside records, plans and commit messages keep their
  forms; `F-20261027-v2mt: A sweep repoints or removes citations, and leaves plans as written`
  and `ADR-20261026-y9zt: A record names another record by an org link to its file` are unchanged.
- **The lines under a citation are not citations.** A section is named bare
  only on a line of its own under its record's citation.
- **Once per statement.** Several sections of one record meant together go
  in one citation; a later statement may cite the record again.
- **Form.** Sections in the record's order, each written out, no ranges;
  named sections (`§Context`) and a workflow's steps and extensions
  (`§2, §2a`) alike.
- **A record not yet on disk** has no sections to number: the agent names
  them by what they say.
- **A quote of a record's text** goes in a code block, as the file holds it,
  under the citation of what it quotes.

## The feature's requirements

1. When the agent cites a record to the record keeper, the agent shall give
   the record's identifier and its title as the record's heading carries it.
2. Where a citation to the record keeper names sections, the agent shall
   name every section of that record the statement means in the one
   citation, after the identifier and before the title, each written out,
   in the record's order.
3. When the agent tells the record keeper something of each of several
   sections of one record, the agent shall list each section by its number
   on a line of its own under that record's citation, beside what it says of
   that section.
4. The agent shall set each citation it gives the record keeper in
   backticks.
5. The agent shall write each citation it gives the record keeper with no
   line break inside it.
6. Where a record the agent speaks of is not yet on disk, the agent shall
   name its sections by what they say, without numbers.
7. When the agent quotes a record's text to the record keeper, the agent
   shall set the quote in a code block, exactly as the file holds it, under
   the citation of what it quotes.

Examples sit under §2, §3, §6 and §7, on the library records.

## What it falsifies

In AGENTS.md's "How to talk to the record keeper", the seed and the two
fixtures that carry it:

- "A citation is a record's identifier, one section of it where a section is
  meant…" — the sections the statement means, in the record's order.
- "Two sections are two citations." — the list under the citation.
- The Good examples of two citations of one record, of `src/widgets.py`
  citing two sections, and of a requirement quoted inline.
- New Bad examples: one record's sections in two citations; what is said of
  each section written inline; "a new §3" for a record not on disk; a
  property line quoted inline.

`evals/promptfooconfig.yaml` cites `F-20261024-5tt7` §1–§4; they repoint to
the successor's §1, §2, §4 and §5. The changelog, plans and the knowledge
base keep their citations as written.

## The eval

One check per requirement in `evals/checks/citing-records.js`:

| Requirement | Check |
|---|---|
| §1 | exact titles (stands) |
| §2 | section before title no longer fails several sections; sections in one citation; sections in record order |
| §3 | sections listed under their citation |
| §4, §5 | in backticks, one line (stand) |
| §6 | no sections of a record not on disk |
| §7 | quotes in code blocks |

`backup/citation-sections-session` holds the code and unit tests for
"sections in one citation" and "sections listed under their citation".

Train questions gain "What does the library refuse when a borrower renews a
loan, and what does each refusal tell them?" (§3) and "What exactly does the
renewal feature say about reserved books?" (§7). The held-out questions stay.
