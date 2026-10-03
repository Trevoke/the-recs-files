# Failure-Text Analyzer Prompt Template

Use this template when dispatching the failure-text analyzer.

```
Task tool (general-purpose):
  description: "Analyze failure text for [slice]"
  prompt: |
    You are analyzing the text the codebase at [path] gives when it refuses
    something or something goes wrong, read-only.

    ## The slice

    [The core user workflow and the in-development workflows, in the user's
    own words from the framing interview.]

    ## Find

    - Every string shown to a person on a refusal or a failure: thrown
      errors, validation messages, exit messages, HTTP error bodies.
    - For each: the exact text, verbatim, character for character; where it
      is raised; what condition raises it; which tests assert it, and whether
      they assert the full text.
    - Text that is built at run time: the template and its parts.
    - Text that addresses different readers (an operator, an end user) —
      report who each seems to address and why you think so.

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
