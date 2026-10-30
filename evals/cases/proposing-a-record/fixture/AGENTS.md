# How to work with this project

This project keeps records as the source of truth for its code, and uses strict taxonomy and
terminology. Speak using this language, refer to these concepts. Where a concept
or a word is missing, first attempt to combine existing concepts, or build on
top of it (e.g. if there is a "refund policy" and we must make sure this refund
policy is followed, before saying "checker" try "refund policy validator").

The records are the source of truth for the code. The people working on the
project, and their context, are the source of truth for the records; a record
goes out of date when they move on and it does not, and bringing it back is
theirs to direct. Make no record change on your own; make one only at the
record keeper's direction.

## The projections

This project keeps these projections.

- **Vision** — `docs/vision.org`, a single file: no projection, no numbered records
- **Ubiquitous language** (UL-n) — `docs/ubiquitous-language.org`
- **Architectural decisions** (ADR-n) — `docs/architectural-decisions.org`

## Making a record change

When making a record change, be brief. Define by defining: state what something is; do not
compare it to something it isn't.

Examples:
```
# Good
a quote is the price offered for a set of line items, valid until its expiry date, before anything is reserved

# Bad
a quote offers, it does not oblige
```

A good record follows the single responsibility principle, that is to say, it
has one and only one reason to change. The scale of the one thing can vary (and
therefore its consequences), but it must be one thing. Help the record keeper.

Examples:
```
# Good
X-1: We use pub/sub for notifications

# Bad
X-1: We use pub/sub for notifications and we also send authentication emails
```

```
# Good
X-1: A user can create a widget

# Bad
X-1: A user can create a widget and change their password
```

A record's title is a headline: it states what the record decides, defines,
lets a user do, or refuses, so a reader who stops at the title knows the
substance and opens the record only for the detail.

Examples:
```
# Good
X-1: Use pub/sub for job notifications

# Bad
X-1: The job notifies by message and keeps none
```

A record lives in a file of its own under its category's directory —
`docs/features/f-12-<slug>.org` — headed `* F-12 <title>`, the slug made from
the title. The projection, `docs/features.org`, lists every standing or
proposed record as `- F-12 :: [[./features/f-12-<slug>.org][<title>]]`, in
number order, beside the projection's preamble and any section that belongs to
the projection rather than to one record. A record's status, and the records a
successor supersedes, are properties in its drawer, `:STATUS:` and
`:SUPERSEDES:`. A proposed record's line sits under a `* Proposed` heading at the
end of the projection. A record's file, its line in the projection, and its
heading carry the same title, and a clarification that gives a record a new
title changes all three.

A heading, a property, a projection line, a table row and a `#+` keyword line
are each written on one line, however long it runs; prose may wrap. A record's
drawer holds each property once. A record refers to another record by an org link to its file, its description the record name, and the link sits whole on
one line.

Good:
```org
* ADR-12 Retry each provider's failed jobs from one queue of its own
:PROPERTIES:
:STATUS: Proposed
:SUPERSEDES: [[./adr-4-retry-every-failed-job-from-one-shared-queue.org][ADR-4: Retry every failed job from one shared queue]], [[./adr-5-retry-a-failed-job-three-times-before-giving-up.org][ADR-5: Retry a failed job three times before giving up]]
:END:
** Context
The shared queue lets one provider's outage hold up every other provider's
retries, as
[[./adr-4-retry-every-failed-job-from-one-shared-queue.org][ADR-4: Retry every failed job from one shared queue]]
found.
```
```org
- ADR-12 :: [[./architectural-decisions/adr-12-retry-each-providers-failed-jobs-from-one-queue-of-its-own.org][Retry each provider's failed jobs from one queue of its own]]
```

Bad: the heading wrapped. Org reads "from one queue of its own" as body text,
and the drawer as no longer the record's, so its status is lost:
```org
* ADR-12 Retry each provider's failed jobs
  from one queue of its own
:PROPERTIES:
```

Bad: a property wrapped. Org rejects the whole drawer, status included:
```org
:SUPERSEDES: [[./adr-4-retry-every-failed-job-from-one-shared-queue.org][ADR-4: Retry
  every failed job from one shared queue]]
```

Bad: a property repeated. Org keeps only the last, and ADR-4 is lost:
```org
:SUPERSEDES: [[./adr-4-retry-every-failed-job-from-one-shared-queue.org][ADR-4: Retry every failed job from one shared queue]]
:SUPERSEDES: [[./adr-5-retry-a-failed-job-three-times-before-giving-up.org][ADR-5: Retry a failed job three times before giving up]]
```

Bad: a record referred to in plain text, and wrapped. No search for the title finds it:
```org
The shared queue lets one provider's outage hold up the rest, as ADR-4: Retry
every failed job from one shared queue found.
```

Bad: a projection line wrapped. The title no longer matches the heading:
```org
- ADR-12 :: [[./architectural-decisions/adr-12-retry-each-providers-failed-jobs-from-one-queue-of-its-own.org][Retry each
  provider's failed jobs from one queue of its own]]
```

A new record is written to its file with `:STATUS: Proposed` and its line under
`* Proposed`, committed alone, and then shown to the record keeper with every
sentence it falsifies and the wording that replaces each: they agree to a file
that exists. Nothing stands before they agree. Accepting it, once they have,
marks it Accepted, moves its line out from under `* Proposed` and writes the
replacements, in a commit of its own.


A record change is committed on its own, and a proposal in a commit before the
one that accepts or rejects it.

## Records are read from disk

A record's text is in its own file, and is read from there.

Open a record's file before you cite a section of it, measure code, a test, a
plan or a design against it, assert its text, propose a change to it, or frame
a question to the record keeper with it. Its title tells you which records bear on the
work; it is never the evidence that something conforms. Open each record that
bears, and no others: a record referred to by a task, by a record you opened, or by a
citation in the code you are changing bears; a title that only sounds near the
work is opened to find out.

Whatever this file inlines is what a session and every subagent it dispatches
carry for the rest of it. A session that changes a record therefore carries a stale
copy of it from the moment it saves. Cite what the file on disk says
rather than what this one quotes.

# Which category a record belongs in

- **Vision** what the system is for, who it serves, the domain it works in and its bounded contexts.
- **Ubiquitous language** is taxonomy: what a word means, in a sentence or two, and nothing about behaviour.
- **Architectural decisions** a pattern the codebase follows, and why.
- **Features** the surface behavior: what a thing takes and what it produces, as requirements in EARS.
- **User workflows** what a person is trying to achieve, step by step, with the extensions where it goes otherwise.
- **Message catalog** the exact text the system gives when it refuses something or something goes wrong. Tests assert this text, so it changes here before it changes in code.

Two tests settle the hard cases. If describing the record names a verb, an
argument, or a sequence of events, it is a feature and not an architectural
decision. If a word would survive a change of implementation it is ubiquitous
language; if changing the implementation would retire the word, it belongs in an
architectural decision — "middleware" is the worked example: it names how a
thing is built, so it lives in the decision that chose to build it that way.

# How to talk to the record keeper

Writing software is about managing combinations of decisions.
When the record keeper wants to make a change, check the existing records. When
you need to talk to the record keeper about it, use the record name.

Good: "`X-8: Frobnicate the widgets`"
Bad: "`X-8`"

## Framing a question

When the work — a plan, a feature, a brainstorm, a clarification — comes to a
situation that needs the record keeper's decision, one no record settles,
stop and bring it to them framed from the records. The frame gives them the
question's context, bounded, and a concrete case of it, so they answer from
their own records and need not work out which records, which parts of them,
or which situation you mean.

The frame runs in this order:
- the user workflow the situation is in, cited with the step or extension
  that applies, or each of them where it is in more than one; where no user
  workflow holds it, say so;
- each other record that bears, cited with the sections that do;
- the situation, stated in the words the records have for it;
- an example of it: a phrase starting "The one where", which says what the
  example is about as a title does for a record, then numbered steps, each
  one thing an actor or the system does, with concrete actors, values and
  dates. The citations above it are enough, so the steps carry none;
- the question, pointed at the step whose outcome no record settles.

```
We are in `UW-X §3: Frobnicate a widget`.
- §3: the user frobnicates the widget they whirled

`X-8 §1, §2: Frobnicate the widgets`
- §1: frobnicates a whirled widget on request
- §2: refuses a reserved widget with `MSG-4: A reserved widget cannot be frobnicated`

The situation: no record says what the user is told about a reservation that
takes away their frobnication.

The one where Mara reserves Ola's widget while Ola is still whirling it
1. Ola whirls widget 17 on 3 March at 09:00.
2. Mara reserves widget 17 on 3 March at 09:30.
3. Ola asks to frobnicate widget 17 on 3 March at 10:00.
4. The system refuses with `MSG-4: A reserved widget cannot be frobnicated`.

Question: at step 2, is Ola told that Mara's reservation ends her frobnication,
or only at step 4?

Also open: no record says how long a reservation holds a widget.
```

Where the decision is a choice between options, the one example is played out
under each option with the same actors, values and dates, so that only the
option changes: the one where Ola frobnicates widget 17 a fourth time, step 4
refusing under a fixed limit of three and frobnicating under a limit the
record keeper sets at five.

One situation at a time: the one the work stops on, or the one the record
keeper's question is about. Each other situation found on the way is listed
as open, in one sentence that says what it is about, with no example, as the
`Also open:` line above; the record keeper picks which to frame next. A
question of theirs that is about no such situation gets the facts it asked
for, with each situation found that the work does not stop on listed as open,
and none framed. A situation listed as open is the record keeper's to decide
as much as the one framed, so the work builds nothing on it either: listing
it tells them what is left undecided, and an outcome already built on it
would be one they never chose.

The workflow comes first because it is what the user is trying to achieve; the
other records are what constrain it. A question that opens on a feature, a
message, or a line of code has skipped the part that says why any of it
matters, and asks the record keeper to reconstruct it. The situation is named
with the records' word for it; the mechanism that serves it — a loop, a field,
which function calls which — comes after the situation, named as serving it,
where it is what the question is about.

Then wait: act on nothing the question leaves to the record keeper before they
answer, and if they cannot answer from what you brought, bring the record, the
section or the example that is missing.

Never write a new term into any file — a record, a design document, a sketch, a
comment — before the record keeper has agreed to that specific word. Propose candidates,
wait, and then sweep the agreed word everywhere in one pass. Check each
candidate against words the taxonomy already owns.

# Which skills to use

A new record, a change to a record, and any sweep of an agreed term go through
`recs-writing-records`.
