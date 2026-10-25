---
name: recs-writing-records
description: Use when a decision, definition, workflow, feature, or exact failure text needs to enter a project's records, when a record needs superseding, merging, splitting, retiring or clarifying, or when an agreed term must be swept across the codebase — for projects that keep records as their source of truth.
---

# Writing Records

## Overview

In a records-driven project, the records are the source of truth and the code follows them. When something worth recording surfaces — in a brainstorm, a plan, a debugging session — this is how it gets recorded.

**Core principle:** A record changes only at the record keeper's direction, in words the record keeper has agreed to — and when a word changes, every sentence written under the old one changes with it, in one pass.

The project's AGENTS.md says which categories exist and where each one's projection lives. Read it first.

## The Categories

A starting point, to adopt or adapt. A project may keep fewer categories, more, or the same ones under other names; its AGENTS.md is what holds.

| Category | What it holds | Form | Example ids |
|----------|---------------|--------|-------------|
| Vision | What the system is for, who it serves, its domain and bounded contexts. | A single file; no projection, no numbers | — |
| Ubiquitous language | What a word means, in a sentence or two, and nothing about behaviour. One definition per term — a term needing two is two terms. | One term to a record, its definition the body; the projection groups terms under their bounded contexts | UL-9 |
| Architectural decisions | A pattern the codebase follows, and why. | Nygard (context, decision, consequences) | ADR-12 |
| Features | The surface: what a thing takes and what it produces. | EARS (one requirement to a sentence) | F-7 |
| User workflows | What a person is trying to achieve, step by step, with the extensions where it goes otherwise. | Cockburn (main scenario + extensions) | UW-3 |
| Message catalog | The exact text the system gives when it refuses something or fails. Tests assert this text, so wording changes here before it changes in code. | Message per entry | MSG-4 |

## Placement Tests

Two tests settle the hard cases:

1. **If describing the record names a verb, an argument, or a sequence of events** → it is a feature, not an architectural decision.
2. **If the word would survive a change of realization** → ubiquitous language. **If changing the realization would retire the word** → it belongs in an architectural decision.

Example, from a papers-screening pipeline: "screening takes a paper and returns an include/exclude decision" names a verb and an argument — a feature. "Screening" itself survives any rewrite — ubiquitous language. "Decisions travel over the message broker" dies with the broker — the word lives in the ADR that chose it.

## Writing Rules

- **Define by defining.** State what something is; never define by contrast with what it isn't. "A quote offers, it does not oblige" helps no one. "A quote is the price offered for a set of line items, valid until its expiry date, before anything is reserved" is a definition.
- **Be brief.** A record is a sentence or a short paragraph, not an essay.
- **Address by number and title.** "ADR-12: One retry queue per provider", never a bare "ADR-12".
- **Match the category's form.** Read two neighbouring records before drafting; yours should be indistinguishable in shape.

## The Flow

1. **Place it.** Pick the category using the placement tests. Check the existing records — this may supersede one rather than stand beside it. Search by the words the record would use, not just by topic.
2. **Superseding? Read the old record against the change.** A change that falsifies only part of what the old record decides means the record was deciding two things. Supersede it with two records, one for each half, the half that holds carried over in its own words; then grep the old record's citations to see which half each one meant — that is what decides which successor each one repoints to. Where the old record numbers its sections, as a feature numbers its requirements, the successor carries a section map (below), and a citation of one section repoints to wherever the map sends it.
3. **Draft it, and write it as proposed.** Number, title, body, in the category's form. The number is the next one its category has not used: read it from the record files in the category's directory, not from the projection, which lists no rejected or withdrawn record. Its status is Proposed, and its line goes under its projection's Proposed heading, so that nobody bases a decision on it.
4. **New term needed?** Stop before drafting around it:
   - First try combining existing terms: if the project has a "refund policy" and something must enforce it, try "refund policy enforcer" before inventing "guard".
   - Check each candidate against words the taxonomy already owns — a candidate that collides is out.
   - Propose the candidates to the record keeper and wait. Never write a new term into any file — a record, a comment, a plan, a sketch — before the record keeper has agreed to that specific word.
5. **Name the words it moves, then find what each falsifies.** A new record moves words too: whatever it decides, a sentence elsewhere that says otherwise is falsified. List every word whose definition this change alters — the ones keeping their spelling included, and the ones that merely lose a clause. In a batch of changes that list is what the sweep works from, and a word nobody names is a word nobody sweeps. Then run steps 1–3 of the sweep (below) on each word in it, before anything is shown; they produce the falsified sentences, each with the wording that replaces it.
6. **Show the draft and the falsified sentences together. Wait for agreement.** Put them in your reply, not only on disk: the draft's text, and each falsified sentence quoted beside the wording that replaces it, then ask the record keeper to agree. Records change only at the record keeper's direction; agreement covers the words, the number, the category, and every falsified sentence. Look for them after agreement instead and every hit is a change nobody agreed to, leaving no move that is not a partial sweep or an unbidden change. If the record keeper declines, mark the record Rejected and remove its line from its projection; its file and its number stay, and nothing else of it is written.
7. **Accept it — the record and its consequences in one pass.** Mark the record Accepted, move its line out from under the Proposed heading, and write every falsified sentence's replacement. A record missing from its projection is missing for anyone reading it. Then close the sweep (below).

## Statuses

A record's status is where AGENTS.md puts it, and is one of:

- **Proposed** — written, and not yet agreed. Nothing is based on it.
- **Accepted** — agreed by the record keeper.
- **Rejected** — proposed, and declined. Its text stands as written and its number stays taken.
- **Superseded** or **Retired** — withdrawn (below).

A standing record is an accepted record that is not withdrawn. A projection lists standing and proposed records, the proposed ones under its Proposed heading; a rejected or withdrawn record's line is removed.

## Superseding and Retiring a Record

A record is never deleted, and its number is never reused: it is still worth knowing what the record said, after it stopped being so. Every category keeps this rule, not only architectural decisions.

A standing record that no longer holds is withdrawn, as superseded or as retired:

- **Superseded** — one or more successors replace it. A successor is a new record, written through the flow above, and names each record it supersedes, by number and title, where AGENTS.md says: "Supersedes F-7: Export takes a date range". The old record's status becomes "Superseded by F-12: Export takes a saved filter". A change that replaces several records at once is one successor that supersedes them all: a merge. Where the old record numbers its sections, the successor also maps each of them to the successor's sections that carry it, or to none: "Supersedes F-7: Export takes a date range (§1 → §1; §2 → §2, §3; §3 → none)". The map is part of what the record keeper agrees to.
- **Retired** — nothing replaces it. Its status becomes "Retired", with the reason in a sentence.

Either way, the status is the only change to the withdrawn record; the rest of it stands as written. Its line is removed from its projection, which lists only standing and proposed records. Superseding or retiring is a record change like any other: propose it together with the sentences it falsifies, wait for agreement, then sweep its identifier (step 5 below) — citations move to the successor, or go where there is none.

Besides a clarification (below), a sweep is the one other way a standing record's text changes. It may rewrite a standing record's sentences to carry an agreed word change, or repoint a citation to a successor, because the record still decides what it decided; a change to what a record decides supersedes it. Withdrawn records are never swept: their text stands as written, old words and old citations included.

## Clarifying a Record

Apart from a sweep, a standing record changes in place only as a clarification: its wording, or its title, brought closer to an intent that does not change. When the record keeper asks for an in-place edit, draft the new wording and assess whether the record's intent is kept, and how it changes if not, naming each citation that would read wrong after the edit. Show the draft and the assessment with the rule: *if the intent doesn't change, then it might be the same record.* The record keeper decides whether the intent is kept; you assess it, and do not decide it.

- **Kept** — write the new wording. The number and the status stay. A new title goes into the record's file name, its heading and its line in its projection, and into every citation of it outside a plan.
- **Changed** — supersede the record instead.

## Sweeps

A word means the same thing in every file, or it means nothing. Sweep when:

- a term is agreed or renamed;
- a term is redefined — the word stays right in every sentence and some of those sentences go wrong;
- a record is superseded or retired.

**A rename and a redefinition are swept differently.** A rename changes a word's spelling and keeps its meaning: every occurrence is replaced, and grep finds them all. A redefinition changes its meaning and keeps its spelling: there is nothing to replace, so nothing announces itself, and each hit has to be judged rather than substituted.

Steps 1–3 are what the flow runs before it shows a draft; 4–8 are the rest.

1. Grep the word's stem, so every inflection lands — `approv` catches approve, approved, approval — and grep every synonym that crept in. One concept often hides under three names ("cutoff" here, "deadline" there, "due date" in a test name). Never grep the phrase you have in mind: `at approval` finds only the sentences you already thought of.
2. Count the hits. That number is the checklist, and the sweep is not finished until every one of them has a verdict.
3. For a redefinition, write the rule that tells a false sentence from a true one *before* reading any of them — one sentence, in the project's words: *where a record says something is declared "at approval" it means where that thing is written, which is now the order form; where "at approval" names the moment, it stands.* Then give each hit its verdict against the rule: the wording that replaces it, or *stands*, with the reason. "Almost all of them are still true" is a verdict on nothing.
4. Change every occurrence in one pass: standing records, code, comments, tests, docs. Withdrawn records and plans are left as written: a plan is the work as planned against the records then standing, its words and its citations included.
5. For a superseded or retired record: grep for its identifier. Comments cite records, so citations are everywhere; find them all and repoint each to its successor, or remove it where there is none. A citation of a section (`F-7 §2`) repoints by the successor's section map; a section the map sends to none is a citation removed, and one it sends to several repoints to those the citing site rests on, read against each — where that is unclear, it goes back to the record keeper. A plan keeps the citations it was written under: it is the work as planned against the records then standing.
6. Re-grep the stem and the old identifier, and re-count. Every remaining hit is one you judged *stands*, or sits in a withdrawn record — anything else is unfinished work.
7. Nothing is committed while a sentence you know to be false is still standing. A hit that falls outside what was agreed goes back to the record keeper *before* the commit: asking costs one message, and committing around it costs a second commit and leaves the records wrong in between.
8. One commit whose message names the change — Tim Pope rules: imperative subject around 50 characters, blank line, body saying why. Conventional-commit types are welcome.

```
Rename "cutoff" to "deadline" throughout

The two words named one concept and drifted apart in the
order-scheduling code. UL-9 owns "deadline"; "cutoff" is retired.
```

## A Record's Sentence Stays in the Record

A comment may cite a record — its number, and its section where the record has
sections — and that citation is the whole of what it owes. A comment reproducing
the record's own words gives that sentence a second home, and the copy is what
goes stale. A citation standing beside the copy does not redeem it: the citation
is what carries the record's content, and the paraphrase beside it is what
drifts. This holds at every site, in tests as in code — the copy is not moved to
whichever site has the better claim to it.

That is the half of the comment rule a record's author owns. How a citation is
laid out, and where a reason the code does not show is kept, are the project's
own and belong with its instructions for the realization, where whoever is
writing code will meet them.

```python
# ❌ Restates the record
# ADR-7 says every refund must be idempotent.
def refund(order): ...

# ✅ Cites it, and cites the knowledge base for what the code does not show
# ADR-7 §Decision: Every refund is idempotent
# docs/knowledge-base/payments.org: Order ids repeat across resubmits
def refund(order): ...
```

## Red Flags — STOP

| Excuse | Reality |
|--------|---------|
| "I'll sweep the rest of the files later" | A partial sweep leaves one word with two meanings. Sweep is one pass, one commit. |
| "Cutoff and deadline are close enough" | Synonym drift is how a taxonomy rots. One concept, one word, everywhere. |
| "This record change is too small to ask about" | Records change only at the record keeper's direction. Draft, show, wait. |
| "I'll call it a 'checker' for now and rename later" | A term written before agreement is already in the files. Propose candidates and wait. |
| "It's clearer to say what it isn't" | Defining by negation defines nothing. State what it is. |
| "The comment should explain the rule for readers" | The record explains the rule; the comment cites it. |
| "Two sites carry this reasoning — which one should keep it?" | Neither. The record keeps it. The rule applies at every site that cites or paraphrases it. |
| "Almost all the remaining hits are still true" | "Almost" names no sentence. Every hit gets its own verdict — the new wording, or *stands* and why. |
| "I swept for the new words the change introduces" | The words that falsify sentences are the ones the change took something *away* from, and they read fine in every sentence they are in. Name every word the change redefines, and sweep each. |
| "That one wasn't in what the record keeper agreed to, so I left it" | Sweeping exists to turn up sentences nobody has agreed to yet. Take them back before the commit; leaving one behind ships a record you know is false. |
| "The plan cites the old record too, so I repointed it" | A plan is the work as planned against the records then standing. Its words and citations stay as written. |
| "It's only a wording fix, so I'll edit it in place" | Small is not the test; intent is. Assess it, show the assessment, and let the record keeper decide. |
| "Nothing cites this record any more, so I'll delete it" | A retired record stays, marked, and its number stays taken. Deleting it loses why it once held. |
| "ADR-12" (bare) | Number and title, always — the title is what makes the reference readable. |

**All of these mean: stop, and do it the record way.**
