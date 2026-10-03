# Entry-Point Analyzer Prompt Template

Use this template when dispatching the entry-point analyzer.

```
Task tool (general-purpose):
  description: "Analyze entry points for [slice]"
  prompt: |
    You are analyzing the entry points of the codebase at [path], read-only.

    ## The slice

    [The core user workflow and the in-development workflows, in the user's
    own words from the framing interview.]

    ## Find

    - Every way a person or another system reaches the code: commands,
      routes, handlers, UI actions, jobs, public functions.
    - For each that serves the slice: what it takes, what it produces, what
      it refuses, and what it lets the person do next.
    - The order in which a person goes through them to get the slice's value
      done, as far as the code shows it.
    - Work in progress: branches, flags, unfinished modules, TODO/WIP markers.

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
