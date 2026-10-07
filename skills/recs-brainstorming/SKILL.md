---
name: recs-brainstorming
description: "Use when starting any creative work - creating features, building components, adding functionality, or modifying behavior - before implementation — for projects that keep records as their source of truth."
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue, grounded in the project's records.

Start by reading the project's records, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words), checking after each section whether it looks right so far. Then route each validated decision to the projection it belongs in.

## The Process

**Reading the records first:**
- Before any dialogue, read the project's records - the project's AGENTS.md says where they live. Commonly: user workflows, architectural decisions, features, a ubiquitous language, and a message catalog.
- Speak in record numbers and titles throughout the dialogue ("that touches UW-4: Import contacts from a spreadsheet") - never a bare number, and never a paraphrase where a record already says it.
- Check out the current project state too (files, docs, recent commits).

**Understanding the idea:**
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message - if a topic needs more exploration, break it into multiple questions
- Focus on understanding: purpose, constraints, success criteria - and which existing records the idea touches, extends, or contradicts

**Exploring approaches:**
- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

**Presenting the design:**
- Once you believe you understand what you're building, present the design
- Break it into sections of 200-300 words
- Ask after each section whether it looks right so far
- Cover: surface (what each thing takes, what it produces, what the user may do next), architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

## Speak the project's language

A project that keeps a ubiquitous language owns its words (check AGENTS.md and the records).

- One word per concept, and always the project's word. Never rotate synonyms for variety — if the project says "interlock," it is never "gate," "threshold," or "guard."
- Never write a new term into any file — a record, a plan, a comment, code, a test name, a commit message — before the user has agreed to that specific word. Propose candidates, wait, then sweep the agreed word everywhere in one pass.
- Where a word seems missing, first combine terms the project already owns (an "order" that needs checking gets an "order validator," not a "checker") before proposing a new one.

This holds during the dialogue too: candidate words are discussed freely in conversation, but none lands in any file until the user has agreed to it.

## After the Design

**Deriving features from the user workflows:**

Before routing, walk every step and extension of each user workflow the design touches. Each step or extension where the system takes something from the user, gives something back, or opens what the user may do next is a feature, and the workflow names it. For each one:

- A feature already covers it → the workflow names that feature. If the design changes what the feature takes, produces, or offers next, that is an amendment to it.
- No feature covers it → propose a new feature record.

One feature may serve steps in several workflows, so search the features by the words the surface would use before proposing a new one. An interface no user meets is not a feature; it stays in the design document.

**Routing decisions to their projections:**

Walk each validated decision through the placement tests and route it to its projection:

| The decision is... | It routes to... |
|---|---|
| What users must be able to do | A user workflow |
| A thing's surface - what it takes, what it produces, and what a user may do next; describing it names a verb, an argument, or a sequence of events | A feature |
| An invariant and its why - a word or pattern that would retire if the implementation changed | An architectural decision |
| What a word means, in a sentence or two, no behaviour | The ubiquitous language |
| Exact refusal or error text | The message catalog |

Propose each record change to the user - by projection, with the record number and title where it amends an existing record - and wait. A change that amends a record or moves a word's meaning is proposed together with the sentences elsewhere it makes false; recs-writing-records finds those before anything is shown, so agreement covers the consequences and not only the record. Records change only at the user's direction; use recs-writing-records to write the agreed ones. Never write into a record unbidden.

**Documenting what remains:**
- What routing leaves behind - purely implementation-level decisions - goes to `docs/plans/YYYY-MM-DD-<topic>-design.md`
- Design-doc decisions are not citable from code comments; if code needs to justify itself against a decision, that decision needs a record. The exception is the traditional implementation comment ("X is done in Y way because the platform does Z"), which stays a comment.
- Use elements-of-style:writing-clearly-and-concisely skill if available
- Commit the design document to git: imperative subject of about 50 characters, blank line, body explaining why; conventional-commit types (feat:, fix:, docs:, refactor:) welcome

**Implementation (if continuing):**
- Ask: "Ready to set up for implementation?"
- Use recs-using-git-worktrees to create isolated workspace
- Use recs-writing-plans to create detailed implementation plan

## Key Principles

- **Records first** - Read the records before the dialogue, and speak in record numbers and titles
- **One question at a time** - Don't overwhelm with multiple questions
- **Multiple choice preferred** - Easier to answer than open-ended when possible
- **YAGNI ruthlessly** - Remove unnecessary features from all designs
- **Explore alternatives** - Always propose 2-3 approaches before settling
- **Incremental validation** - Present design in sections, validate each
- **The project's word, or no word** - Candidate terms land in no file until agreed
- **Workflows yield features** - Every step and extension the design touches is checked for the feature it names
- **Route, then propose** - Every validated decision finds its projection; an amendment is proposed with what it falsifies, and record changes are never written unbidden
- **Be flexible** - Go back and clarify when something doesn't make sense
