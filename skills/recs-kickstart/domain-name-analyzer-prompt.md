# Domain-Name Analyzer Prompt Template

Use this template when dispatching the domain-name analyzer.

```
Task tool (general-purpose):
  description: "Analyze domain names"
  prompt: |
    You are collecting the domain vocabulary of the codebase at [path],
    read-only, to help the user name the domain, its bounded contexts, and
    the terms in each.

    ## The domain, as the user put it

    [The domain and the user, in the user's own words from the framing
    interview.]

    ## Find

    - The nouns and verbs of the domain as the code spells them: types,
      tables, fields, modules, functions, user-facing text, test names.
    - Synonym clusters: several words that seem to name one concept, with
      every site of each.
    - Words that seem to name different concepts in different modules: give
      both meanings and the sites. These are candidate bounded-context
      boundaries.
    - How the modules group: which words travel together, and which modules
      never share a word.
    - Where the code's word differs from the user's word in the framing
      interview.

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
