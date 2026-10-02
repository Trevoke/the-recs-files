# How to work with this project

This project keeps records as the source of truth for its code, and uses strict taxonomy and
terminology. Speak using this language, refer to these concepts. Where a concept
or a word is missing, first attempt to combine existing concepts, or build on
top of it (e.g. if there is a "refund policy" and we must make sure this refund
policy is followed, before saying "checker" try "refund policy validator").

The records are the source of truth for the code. The people working on the
project, and their context, are the source of truth for the records; a record
goes out of date when they move on and it does not, and bringing it back is
theirs to direct. Do not modify records on your own. Only do so on the request
of the user.

## The registers

This project keeps these registers. Adapt the list to the project; the
`recs-writing-records` skill carries the starting set.

- **Ubiquitous language** — `docs/ubiquitous-language.org`
- **Architectural decisions** (ADR-n) — `docs/architectural-decisions.org`
- **Features** (F-n) — `docs/features.org`
- **User workflows** (UW-n) — `docs/user-workflows.org`
- **Message catalog** (MSG-n) — `docs/message-catalog.org`

Where a register borrows its form, the knowledge base records the source, so
the borrowing can be checked:

- Ubiquitous language — `docs/knowledge-base/evans-ubiquitous-language.org`
- Architectural decisions — `docs/knowledge-base/nygard-architecture-decision-records.org`
- User workflows — `docs/knowledge-base/cockburn-use-cases.org`

## Creating/updating a record

When modifying, be brief. Define by defining: state what something is; do not
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
therefore its consequences), but it must be one thing. Help the user.

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

A record lives in a file of its own under its register's directory —
`docs/features/f-12-<slug>.org` — headed `* F-12 <title>`, the slug made from
the title. The register's file, `docs/features.org`, lists every record as
`- F-12 :: [[./features/f-12-<slug>.org][<title>]]`, in number order, beside
the register's preamble and any section that belongs to the register rather
than to one record. A record's file, its line in the register's file, and its
heading change together: a retitle renames the file, rewrites the line and the
heading, and sweeps every pointer that cites the old title (the source tree, and
`docs/` outside `docs/plans/`, whose plans keep the titles they were written
under).

## Relationships between records

A user workflow record may name feature records, message catalog records,
ubiquitous language records, as well as other user workflow records.

A feature record may name message catalog records, ubiquitous language
records, and other feature records.

An architectural decision record may name ubiquitous language records and other
architectural decision records.

A ubiquitous language record may name other ubiquitous language records.

## Records are read from disk

A record's text is in its own file, and is read from there.

Open a record's file before you cite a section of it, measure code, a test, a
plan or a design against it, assert its text, propose a change to it, or frame
a question to the user with it. Its title tells you which records bear on the
work; it is never the evidence that something conforms. Open each record that
bears, and no others: a record named by a task, by a record you opened, or by a
pointer in the code you are changing bears; a title that only sounds near the
work is opened to find out.

Whatever this file inlines is what a session and every subagent it dispatches
carry for the rest of it. A session that edits a record therefore reads its own
superseded text from the moment it saves. Cite what the file on disk says
rather than what this one quotes.

# Which register a record belongs in

- **Ubiquitous language** is taxonomy: what a word means, in a sentence or two, and nothing about behaviour.
- **Architectural decisions** a pattern the codebase follows, and why.
- **Features** the surface behavior: what a thing takes, what it produces, and what a user may do next.
- **User workflows** what a person is trying to achieve, step by step, with the extensions where it goes otherwise.
- **Message catalog** the exact text the system gives when it refuses something or something goes wrong. Tests assert this text, so it changes here before it changes in code.

Two tests settle the hard cases. If describing the record names a verb, an
argument, or a sequence of events, it is a feature and not an architectural
decision. If a word would survive a change of implementation it is ubiquitous
language; if changing the implementation would retire the word, it belongs in an
architectural decision — "middleware" is the worked example: it names how a
thing is built, so it lives in the decision that chose to build it that way.

# How to talk to the user

Writing software is about managing combinations of decisions.
When the user wants to make a change, check the existing records. When you need
to talk to the user about it, use the record number and the record title.

Good: "`X-8: Frobnicate the widgets`"
Bad: "`X-8`"

## Framing a question

Every question to the user is framed from the records, and starts from the user
workflow the work is in. Name that workflow by number and title, and the step or
extension of it that applies. Then bring in whatever else bears — a feature, an
architectural decision, a message catalog entry, a ubiquitous language term —
each by number and title. Then state the situation, and only then the problem.

```
We are working on `UW-X: Frobnicate the widget`.
`Section 1b: whirl first` says the user frobnicates after having whirled.
`F-Y: Frobnication` says that we must whirl only after whooping.

At the moment, we must whirl before we pool because....
```

The workflow comes first because it is what the user is trying to achieve; the
other records are what constrain it. A question that opens on a feature, a
message, or a line of code has skipped the part that says why any of it matters,
and asks the user to reconstruct it.

Then work your way inside the situation, and name it with the word the records
already have for it — not "a request failed", and not a loop, a thread, a field,
or which function calls which. The mechanism is how the situation is served; it
is not the situation, and leading with it makes the user translate back into
their own domain before they can answer. Where the mechanism is genuinely what
is being asked about, it comes after the situation it serves, and named as
serving it.

Never write a new term into any file — a record, a design document, a sketch, a
comment — before the user has agreed to that specific word. Propose candidates,
wait, and then sweep the agreed word everywhere in one pass. Check each
candidate against words the taxonomy already owns.

# How to do implementation work

Two kinds of comment are valid in code, and no third. One points at a record,
by number and title. The other points at a heading of `docs/knowledge-base/`,
where the code performs a technical operation whose reason the code does not
show.

A comment is the pointer and nothing else. It carries no prose of its own — no
sentence explaining the mechanism, naming a constraint, giving an order
dependency, naming an idiom, warning a reader, or rejecting an alternative.
Each of those is either a heading in the knowledge base to point at, or it is
not said. A comment therefore asserts nothing about code elsewhere, since a
pointer asserts nothing at all: what some other module does is a record's to
say, or the knowledge base's.

What a pointer must never do is restate what it points at. A restatement can go
obsolete where the record or the entry it copies cannot, and a citation standing
beside a copy does not redeem the copy: the citation is what carries the
content, and the paraphrase beside it is what drifts. The rule binds a test's
comments as it binds the code's, and applies at every site.

A pointer is laid out one record to a line —
`ADR-13 §Consequences: One retry queue per provider` — and
where a comment points at several, the pointers lead it. A pointer names the
section carrying the claim the comment makes, not the record's most familiar
section. And citing what refuses a rule does not discharge the rule: where the
claim rests on a feature's rule, the feature is cited, whatever message catalog
entry stands beside it.

Assume any other comment is wrong. On coming across one, dispatch a subagent to
find whether a record can be pointed to. If one can, the comment is replaced by
the pointer; if none can, the comment is removed.

A test's check message is a comment for this rule: a record it rests on is a
pointer line above the check, and the message says what the check asserts.

`docs/knowledge-base/` holds what this project has established about its
subject and its tools: the source taxonomy it borrows from, how a library it is
built on actually behaves, anything concrete that took work to find out. An
entry says what it establishes and where that came from — a manual, a
specification, a run — and where the thing can be executed it carries the code
that shows it and the output that code produced. Headings say what an entry
establishes, so a reader finds one by what they need to know.

Read what is there before writing a comment that explains a mechanism, and add
to it when a fact costs you a run to establish.

Only one agent at a time may run `git add` or `git commit` in a worktree. The
index is shared, so two agents touching disjoint files are still unsafe: one
agent's `git add` lands inside the other's commit. Reviewers are read-only,
should be told so explicitly, and can read a frozen SHA with `git show` while a
writer works.

A second worktree gives a second index and does not, on its own, give a second
copy of the code under test. Where the ecosystem links a package to one path,
every test run resolves it there whatever directory it starts in, and a
worktree's tests read the main tree's modules, reporting green or red for code
the run never touched. Close that the way the ecosystem allows — record here
how this project does it. With both, two agents may write at once; with only
the index, the second is testing the first's code and nothing says so.

A worktree sits under a directory `.gitignore` holds. It is a second checkout of
this project: the same file names, the same shapes, and no appearance in any
`git status` but its own. A sweep walking the tree from the root therefore
edits a branch nobody is working on while the main tree reports clean. Confine
a sweep to the directories it means — the source tree, `docs/` — rather than to
the repository root. Repair reaches the other worktree with `git -C <path>` from
this one.

# Which skills to use

This project's development flow lives in the `recs-*` skills. Where a `recs-*`
skill and a `superpowers:*` skill share a purpose — brainstorming, writing
plans, executing plans, subagent-driven development, TDD, systematic debugging,
requesting and receiving code review, verification before completion, finishing
a development branch, git worktrees — use the `recs-*` one.
`superpowers:dispatching-parallel-agents` and `superpowers:writing-skills` have
no `recs-*` counterpart and are used as-is. A new record, and any sweep of an
agreed term, goes through `recs-writing-records`.

These skills are meant to be reused across projects, so they stay generic: no
project vocabulary, branch name, file name or tool command is baked into one,
and project facts live in each project's AGENTS.md. A language may appear in an
ecosystem example list beside npm, cargo and pytest.

# Testing a change to a skill

A subagent inherits the project's skill list, so a control arm told not to use
the skill under test can still load it on its own initiative. Forbid that skill
by name, forbid every other skill, and read the run's own tool calls to confirm
it loaded none. Check the outcome against the fixture directly; an agent's
report of its own run is not evidence.
