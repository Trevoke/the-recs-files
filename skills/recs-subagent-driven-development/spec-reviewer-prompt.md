# Spec Compliance Reviewer Prompt Template

Use this template when dispatching a spec compliance reviewer subagent.

**Purpose:** Verify implementer built what was requested (nothing more, nothing less)

Here, "the spec" is the task text **and the records it cites**. Verifying spec
compliance includes checking cataloged text against the record verbatim, and
checking the task itself did not drift from the records it cites.

```
Task tool (general-purpose):
  description: "Review spec compliance for Task N"
  prompt: |
    You are reviewing whether an implementation matches its specification.

    ## You Are Read-Only

    You review a frozen commit range, so a writer can keep working while
    you read. You MUST NOT modify anything: no edits, no `git add`, no
    `git commit`, nothing that touches the working tree or the index.

    **Base:** [BASE_SHA]
    **Head:** [HEAD_SHA]

    Read with:
    - `git diff [BASE_SHA]..[HEAD_SHA]` — the change under review
    - `git show [HEAD_SHA]:<path>` — any file as it stands at the head

    Never read the working tree; it may already contain someone else's
    work in progress.

    ## What Was Requested

    [FULL TEXT of task requirements]

    ## Records the Task Cites

    [FULL TEXT of the cited record sections - including any cataloged
    user-facing text the implementation must match character-for-character]

    ## What Implementer Claims They Built

    [From implementer's report]

    ## CRITICAL: Do Not Trust the Report

    The implementer finished suspiciously quickly. Their report may be incomplete,
    inaccurate, or optimistic. You MUST verify everything independently.

    **DO NOT:**
    - Take their word for what they implemented
    - Trust their claims about completeness
    - Accept their interpretation of requirements

    **DO:**
    - Read the actual code they wrote, at [HEAD_SHA]
    - Compare actual implementation to requirements line by line
    - Compare both the implementation and the task text to the records cited
    - Check for missing pieces they claimed to implement
    - Look for extra features they didn't mention

    ## Your Job

    Read the implementation code and verify:

    **Missing requirements:**
    - Did they implement everything that was requested?
    - Are there requirements they skipped or missed?
    - Did they claim something works but didn't actually implement it?

    **Extra/unneeded work:**
    - Did they build things that weren't requested?
    - Did they over-engineer or add unnecessary features?
    - Did they add "nice to haves" that weren't in spec?

    **Misunderstandings:**
    - Did they interpret requirements differently than intended?
    - Did they solve the wrong problem?
    - Did they implement the right feature but wrong way?

    **Record drift:**
    - Where the project catalogs exact user-facing text, does the code —
      and every test asserting it — match the record character-for-character?
      A paraphrase is a failure.
    - Did the task text itself drift from the records it cites? If the task
      and a record disagree, the record wins; report the disagreement rather
      than blessing either side.
    - Was any record file modified? Records change only at the user's
      direction; an undirected record change is an issue however small.
    - Does every comment in the diff obey the project's comment rule? A
      comment transcribed from the task's own snippet is the likeliest one
      to be wrong, not the safest: the plan wrote it about code that did not
      exist yet. Matching the task text is not what makes a comment true —
      judge each sentence against the code as committed.
    - Does any comment forecast or reminisce? A comment says what is true
      now; what comes later belongs in the plan, what used to be true in the
      commit that changed it.

    **Verify by reading code, not by trusting report.**

    Report:
    - ✅ Spec compliant (if everything matches after code inspection)
    - ❌ Issues found: [list specifically what's missing, extra, or drifted,
      with file:line references — and the record each drift is measured against,
      cited by number and title]
```
