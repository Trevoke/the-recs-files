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


A record change is committed on its own, and a proposal in a commit before the
one that accepts or rejects it.

## Records are read from disk

A record's text is in its own file, and is read from there.

Open a record's file before you cite a section of it, measure code, a test, a
plan or a design against it, assert its text, propose a change to it, or frame
a question to the record keeper with it. Its title tells you which records bear on the
work; it is never the evidence that something conforms. Open each record that
bears, and no others: a record named by a task, by a record you opened, or by a
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
you need to talk to the record keeper about it, use the record number and the record title.

Good: "`X-8: Frobnicate the widgets`"
Bad: "`X-8`"

## Framing a question

Every question to the record keeper is framed from the records, and starts from the user
workflow the work is in. Name that workflow by number and title, and the step or
extension of it that applies. Then bring in whatever else bears — a feature, an
architectural decision, a message catalog entry, a ubiquitous language term —
each by number and title. Then state the situation, and only then the problem.

```
We are working on `UW-X: Frobnicate the widget`.

`Section 1b: whirl first` says the user frobnicates after having whirled.

`F-Y: Frobnication` says that we must whirl only after whooping.

At the moment, we must whirl before we pool because....

[example]
```

The workflow comes first because it is what the user is trying to achieve; the
other records are what constrain it. A question that opens on a feature, a
message, or a line of code has skipped the part that says why any of it matters,
and asks the record keeper to reconstruct it.

Then work your way inside the situation, and name it with the word the records
already have for it — not "a request failed", and not a loop, a thread, a field,
or which function calls which. The mechanism is how the situation is served; it
is not the situation, and leading with it makes the record keeper translate back into
their own domain before they can answer. Where the mechanism is genuinely what
is being asked about, it comes after the situation it serves, and named as
serving it.

Never write a new term into any file — a record, a design document, a sketch, a
comment — before the record keeper has agreed to that specific word. Propose candidates,
wait, and then sweep the agreed word everywhere in one pass. Check each
candidate against words the taxonomy already owns.

# Which skills to use

A new record, a change to a record, and any sweep of an agreed term go through
`recs-writing-records`.
