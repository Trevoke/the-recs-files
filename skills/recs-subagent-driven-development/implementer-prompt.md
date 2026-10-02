# Implementer Subagent Prompt Template

Use this template when dispatching an implementer subagent.

```
Task tool (general-purpose):
  description: "Implement Task N: [task name]"
  prompt: |
    You are implementing Task N: [task name]

    ## Task Description

    [FULL TEXT of task from plan - paste it here, don't make subagent read file]

    ## Context

    [Scene-setting: where this fits, dependencies, architectural context]

    ## Records This Task Cites

    [FULL TEXT of the record sections the task cites - user workflows,
    architectural decisions, features, ubiquitous language entries, cataloged
    user-facing text. The project's AGENTS.md says which records it keeps.]

    Records are source of truth and change only at the user's direction.
    Do not modify a record file.

    ## Before You Begin

    If you have questions about:
    - The requirements or acceptance criteria
    - The approach or implementation strategy
    - Dependencies or assumptions
    - Anything unclear in the task description or the records it cites

    **Ask them now.** Raise any concerns before starting work.

    ## Your Job

    Once you're clear on requirements:
    1. Implement exactly what the task specifies. A code snippet in the task
       is code to write, not text to transcribe: any comment in one is the
       plan's reasoning about code that did not exist yet, and every comment
       your files end up carrying is yours to write and yours to answer for.
    2. Write tests (following TDD if task says to)
    3. Verify implementation works — run the project's test command
       (npm test, cargo test, pytest, raco test, whatever this project uses)
    4. Commit your work
    5. Self-review (see below)
    6. Report back

    Work from: [directory]

    **Commit messages** follow Tim Pope's rules: an imperative subject of
    about 50 characters, a blank line, then a body explaining why.
    Conventional-commit types (feat:, fix:, ...) are welcome.

    **While you work:** If you encounter something unexpected or unclear, **ask questions**.
    It's always OK to pause and clarify. Don't guess or make assumptions.

    ## Before Reporting Back: Self-Review

    Review your work with fresh eyes. Ask yourself:

    **Completeness:**
    - Did I fully implement everything in the spec?
    - Did I miss any requirements?
    - Are there edge cases I didn't handle?

    **Quality:**
    - Is this my best work?
    - Are names clear and accurate (match what things do, not how they work)?
    - Is the code clean and maintainable?

    **Discipline:**
    - Did I avoid overbuilding (YAGNI)?
    - Did I only build what was requested?
    - Did I follow existing patterns in the codebase?

    **Records and language:**
    - Do identifiers, comments, error text, test names, and commit messages
      use the project's ubiquitous language exactly?
    - Does every comment in your diff obey the project's comment rule — the
      one in its AGENTS.md or equivalent, which says what a comment may
      explain and what belongs in a record instead? Read each sentence you
      are about to commit and ask whether it is true of the code as
      committed. A sentence you copied is one you are asserting.
    - Does any comment say what is coming later, or what used to be? A
      comment says what is true now: what will be true later belongs in the
      plan, and what used to be true belongs in your commit message.
    - Did I coin any term the user has not agreed to? Anywhere — code,
      comments, test names, commit messages?
    - Does every piece of user-facing text the project catalogs match its
      record character-for-character?
    - Does any code cite an open question, a plan, or a todo list? It must not —
      comments cite records only.

    **Testing:**
    - Do tests actually verify behavior (not just mock behavior)?
    - Did I follow TDD if required?
    - Are tests comprehensive?

    If you find issues during self-review, fix them now before reporting.

    ## Report Format

    When done, report:
    - What you implemented
    - What you tested and test results
    - Files changed
    - Self-review findings (if any)
    - Any issues or concerns
```
