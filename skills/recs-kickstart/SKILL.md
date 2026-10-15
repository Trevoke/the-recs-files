---
name: recs-kickstart
description: Use when an existing project is adopting records as its source of truth and has no records yet, or only scattered docs — before any other recs-* skill can be used there.
---

# Kickstarting Records in an Existing Project

## Overview

An existing codebase already holds what its records would say, spread across code, history, comments and people's heads. Code says *what* the system does; only people say *why*, and what its words mean. Kickstart draws the what from the code, the why and the words from the record keeper, and writes nothing the record keeper has not agreed to.

**Core principle:** a thin first slice, agreed one batch at a time. Not the whole codebase: the vision, the domain, the core user workflow, one or two workflows in active development, and the records those touch.

**REQUIRED SUB-SKILL:** recs-writing-records writes every agreed record. **REQUIRED:** read `interviewing.md` before the first question.

## The Flow

1. **Read what exists.** AGENTS.md, README, docs, ADRs, and `git log` *with bodies*. A monorepo: ask which parts this run covers.
2. **Realization modality.** Before any other question, ask the record keeper to choose the project's realization modalities: the forms its realization takes, such as code or skill text. Where AGENTS.md already names them, show them to confirm. Files already in the project are not a choice.
3. **Framing interview** (`interviewing.md`). Domain, who the user is, the core user workflow — the most baseline value the system delivers — and the one or two workflows in active development.
4. **Analyze.** Dispatch the four analyzers in parallel, read-only, each with its prompt template filled in: `entry-point-analyzer-prompt.md`, `failure-text-analyzer-prompt.md`, `history-analyzer-prompt.md`, `domain-name-analyzer-prompt.md`. Open every cited file:line yourself before a claim reaches the record keeper; an analyzer's report is not evidence.
5. **Domain pass.** Name the domain and its bounded contexts with the record keeper, from the analyzers' evidence — a word that changes meaning between modules is a context boundary. The domain goes in `docs/vision.org`; each bounded context is a ubiquitous language term, and every domain term is grouped under its context. The record keeper picks each word and says what it means; you draft the sentence, they agree to it.
6. **One category at a time:** vision → core user workflow → in-development workflows → features → message catalog → architectural decisions. For each:
   - show the **titles** first — a title is a headline, so the list is the skeleton;
   - then bodies, **at most 5–8 per batch**, items needing judgement first;
   - write an agreed batch through recs-writing-records before showing the next.
7. **AGENTS.md.** Draft the target's AGENTS.md from `agents-seed.md` in this skill's directory: its categories and the paths of their projections, its realization modalities, and how a worktree's tests run its own code (ask). Show every line that differs from the seed, removals included; wait. Add a provenance line naming the commit the analysis ran against.
8. **Hand over the follow-ups.** Kickstart writes records, AGENTS.md, `.gitignore` and the knowledge base, and no code, test or comment, even where the record keeper agrees to the change. List every change the records now call for (renames, reworded messages, comments that contradict a record or point at none, missing tests) for the record keeper to direct through recs-writing-records and the development flow.

## What Comes From Where

| Claim | Source | Never |
|---|---|---|
| What the code does | file:line, opened by you | an analyzer's say-so |
| Exact failure text | the string in the code, verbatim | a reworded version |
| Why a decision was made | the record keeper, or a cited commit/PR body | the code alone — a missing why is an open question in the record |
| What a word means | the record keeper | a definition you wrote and they never saw |
| A comment's claim | a question to the record keeper, citing the code it contradicts or confirms | truth |
| A knowledge-base entry | a copy of a sourced entry, or nothing | memory |

The seed's list of borrowed forms points at knowledge-base entries kept with the recs skills (Cockburn, Evans, Mavin, Nygard). Offer to copy them into the target's `docs/knowledge-base/`; if you cannot find them, drop the list from the target's AGENTS.md.

## Red Flags — STOP

| Thought | Reality |
|---|---|
| "I'll ask all my questions at once to save the record keeper time" | A batch of questions is a blank page. One question, with your recommended answer. |
| "I'll write them all, then ask about the open points" | Every file written before agreement is an unbidden edit. Titles, then a batch, then write. |
| "The record keeper said the word, so I can define it" | The word is agreed; the definition is not until they see it. |
| "I know what Evans says" | Then cite where. A knowledge-base entry without a source is invented. |
| "I'll ask why they chose this storage" | Read the commit bodies first. Ask only what history and code cannot settle. |
| "One glossary for the whole system" | A word that means two things means two contexts. Find them before defining anything. |
| "The comment explains it" | A comment is a claim to check. It may be stale. |
| "While I'm here, let me record the rest of the codebase" | Thin slice. The rest grows through recs-brainstorming. |
| "The record keeper agreed, so I'll fix the code now" | Kickstart writes records. The code change is a follow-up the record keeper directs. |
| "That's a detail of the feature" | When something happens, and where, is a pattern the code follows. If a commit or the code says *when* or *where*, ask whether it is a decision, and ask why. |
| "I only removed a sentence from the seed" | A removal is a change. Show it. |
