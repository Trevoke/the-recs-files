# History Analyzer Prompt Template

Use this template when dispatching the history analyzer.

```
Task tool (general-purpose):
  description: "Analyze history and config for decisions"
  prompt: |
    You are looking for the architectural decisions in the codebase at
    [path], read-only: the patterns it follows, and any recorded reason for
    them.

    ## Find

    - Patterns the code follows consistently: storage, layering, how
      modules talk, how errors travel, how tests are run, build and CI
      configuration, lint rules.
    - For each, the reason if one is written down: commit message *bodies*
      (`git log` with full messages, and `git log -S`/`-G` on the files that
      carry the pattern), PR descriptions if available, docs, comments.
      Quote the reason and cite the SHA or file:line.
    - Where no reason is written down, say so. Do not supply one.
    - Commit bodies that say *how*, *when* or *where* something is done
      ("computed on return", "one file per desk", "validated at the edge"):
      each is a decision candidate even when no reason follows it. Report it
      with its SHA.
    - Choices of timing and placement the code makes without comment: what
      happens at which moment (on request, on a schedule, on an event), and
      in which module.
    - Comments that state a rule or a number: report whether the code agrees.

    ## Rules

    - Read-only. Do not modify, create or delete any file. Do not commit.
    - Every claim carries file:line evidence (or a commit SHA). No evidence,
      no claim.
    - Mark each claim's confidence: high (the code says it outright), medium
      (inferred from several sites), low (a guess worth asking about).
    - A comment or a docstring is a claim to check, not a fact. Report it with
      the code it describes, and say whether the code agrees.
    - Do not write record prose, titles or definitions, and do not name
      anything with a word of your own. Report the words the code and its
      history already use.

    ## Report

    A list of claims, each: the claim, its evidence, its confidence. Then a
    short list of what you looked for and could not find.
```
