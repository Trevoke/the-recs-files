# Citing Records to the Record Keeper Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use recs-executing-plans to implement this plan task-by-task.

**Goal:** Make the agent cite records to the record keeper the way `F-12: The agent cites a record to the record keeper in its title's exact words` says, and prove it with an eval run in Claude Code on the record keeper's subscription.

**Architecture:** A new eval case gives the agent a small library project whose records have long titles, and asks a question the agent can only answer by citing them. Mechanical checks read every citation in what the agent said and hold it to F-12 §1–§4 against the fixture's projections. A Claude Code provider, cut down from the one on `harness-rendering`, runs the `claude` CLI in bubblewrap with the raw `skills/` copied into the run's `.claude/skills`. A baseline run comes first; then the kickstart seed and two skills change, and the eval runs again.

**Tech Stack:** promptfoo 0.124.1, Node 24 (`node --test`), bubblewrap, Claude Code CLI 2.1.x in print mode, `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`.

---

## How to Speak

The ubiquitous language is in `docs/ubiquitous-language.org`, one term to a
file under `docs/ubiquitous-language/`. This plan's work touches these defined
terms:

- **Citation** (`UL-9: Citation`) — a reference to a record by its number and title, or to a heading of the knowledge base.
- **Record keeper** (`UL-2: Record keeper`) — the person or team who directs a project's record changes.
- **Agent** (`UL-3: Agent`) — the model that the recs files instruct, which drafts and writes record changes at the record keeper's direction.
- **Record** (`UL-4: Record`) — a short, numbered statement of one truth about a system, with a title that states its substance.
- **Projection** (`UL-6: Projection`) — the listing of every standing or proposed record in one category, in number order, named after the category.
- **Realization** (`UL-22: Realization`) — the code, skill text, or other work that makes a system do what its records say.

The evals' own words — case, fixture, check, arm, provider — are the ones
`README.md` and `evals/` already use. Use all of these exactly, in code, tests,
comments, and commit messages. Coin nothing.

## Do Not Modify

- every file under `docs/` other than `docs/knowledge-base/` and this plan
- `evals/cases/*/` for every case except the new `citing-records-to-the-record-keeper`

If any task seems to require changing one of these, STOP and raise it with
the record keeper. The plan does not proceed around it.

## Reading List

Read before executing any task, in this order:

1. `F-12: The agent cites a record to the record keeper in its title's exact words` — the surface this plan builds and checks
2. `UL-9: Citation` — what a citation is
3. `ADR-7: The agent speaks in the ubiquitous language` — the agent's words to the record keeper
4. `ADR-2: The recs files live apart from any project that uses them` — why the seed and the skills cite no record of this repository
5. `AGENTS.md`, "How to work on the realization" — a comment is a citation and nothing else; worktrees and evals
6. `docs/knowledge-base/bubblewrap-confines-an-eval-run.org` — every eval run is confined
7. `git show harness-rendering:docs/knowledge-base/claude-code-as-an-eval-harness.org` — how Claude Code behaves as an eval harness (ported in Task 4)
8. `git show harness-rendering:evals/providers/claude.js` — the provider this plan cuts down

## Cataloged-Text Ordering

No task touches this project's cataloged text. The fixture's own message
catalog is fixture content, written once in Task 1.

## Before Task 1

Commit this plan on `congruence`, then work in a worktree
(@recs-using-git-worktrees):

```bash
git worktree add .worktrees/citing-records -b citing-records congruence
cd .worktrees/citing-records/evals && npm ci
```

Every later command runs from `.worktrees/citing-records`. Its evals copy that
worktree's `skills/`.

**Never run an agent eval outside bubblewrap.** The provider in Task 5 is the
only way an agent run starts.

---

### Task 1: The case's fixture and prompt

**Records:** `F-12: The agent cites a record to the record keeper in its title's exact words`

**Files:** create everything under `evals/cases/citing-records-to-the-record-keeper/`.

**Step 1: Write the prompt**

`prompt.md`:

```markdown
Can a borrower renew a loan on a book somebody has reserved, if it's their
first renewal? I'd like to allow that. What do our records say about it, and
what would have to change?
```

**Step 2: Write the vision and the projections**

`fixture/docs/vision.org`:

```org
#+TITLE: Vision

A lending library's circulation system. It lends books to borrowers, renews
and returns their loans, and holds a returned copy for the borrower who
reserved it.
```

`fixture/docs/ubiquitous-language.org`:

```org
#+TITLE: Ubiquitous language

* Circulation
- UL-1 :: [[./ubiquitous-language/ul-1-loan.org][Loan]]
- UL-2 :: [[./ubiquitous-language/ul-2-reservation.org][Reservation]]
- UL-3 :: [[./ubiquitous-language/ul-3-loan-period.org][Loan period]]
```

`fixture/docs/features.org`:

```org
#+TITLE: Features

- F-1 :: [[./features/f-1-a-borrower-renews-a-loan-for-one-more-loan-period-unless-the-book-is-reserved.org][A borrower renews a loan for one more loan period unless the book is reserved]]
- F-2 :: [[./features/f-2-a-returned-copy-is-held-for-the-borrower-who-reserved-it.org][A returned copy is held for the borrower who reserved it]]
```

`fixture/docs/user-workflows.org`:

```org
#+TITLE: User workflows

- UW-1 :: [[./user-workflows/uw-1-renew-a-loan-before-its-due-date.org][Renew a loan before its due date]]
```

`fixture/docs/message-catalog.org`:

```org
#+TITLE: Message catalog

- MSG-1 :: [[./message-catalog/msg-1-a-reserved-book-cannot-be-renewed.org][A reserved book cannot be renewed]]
- MSG-2 :: [[./message-catalog/msg-2-this-loan-has-reached-its-renewal-limit.org][This loan has reached its renewal limit]]
```

`fixture/docs/architectural-decisions.org`:

```org
#+TITLE: Architectural decisions

- ADR-1 :: [[./architectural-decisions/adr-1-keep-loans-as-an-append-only-ledger-of-loan-events.org][Keep loans as an append-only ledger of loan events]]
```

**Step 3: Write the records**

`fixture/docs/ubiquitous-language/ul-1-loan.org`:

```org
* UL-1 Loan
:PROPERTIES:
:STATUS: Accepted
:END:
A copy of a book lent to one borrower, from the day it is lent until the day
it is returned.
```

`fixture/docs/ubiquitous-language/ul-2-reservation.org`:

```org
* UL-2 Reservation
:PROPERTIES:
:STATUS: Accepted
:END:
A borrower's claim on the next copy of a book to be returned.
```

`fixture/docs/ubiquitous-language/ul-3-loan-period.org`:

```org
* UL-3 Loan period
:PROPERTIES:
:STATUS: Accepted
:END:
The number of days a loan runs before it is due, set by the library.
```

`fixture/docs/features/f-1-a-borrower-renews-a-loan-for-one-more-loan-period-unless-the-book-is-reserved.org`:

```org
* F-1 A borrower renews a loan for one more loan period unless the book is reserved
:PROPERTIES:
:STATUS: Accepted
:END:
1. When a borrower renews a loan, the library shall set the loan's due date
   one loan period after the renewal date.
   - The one where a 14-day loan renewed on 1 October is due on 15 October.
2. If the book is reserved, then the library shall refuse the renewal with
   `MSG-1: A reserved book cannot be renewed`.
3. Where the library sets a renewal limit, the library shall refuse a
   renewal past it with `MSG-2: This loan has reached its renewal limit`.
```

`fixture/docs/features/f-2-a-returned-copy-is-held-for-the-borrower-who-reserved-it.org`:

```org
* F-2 A returned copy is held for the borrower who reserved it
:PROPERTIES:
:STATUS: Accepted
:END:
1. When a copy of a reserved book is returned, the library shall hold it for
   the borrower whose reservation is oldest.
2. When a held copy has waited three days, the library shall release it to
   the next reservation.
```

`fixture/docs/user-workflows/uw-1-renew-a-loan-before-its-due-date.org`:

```org
* UW-1 Renew a loan before its due date
:PROPERTIES:
:STATUS: Accepted
:ACTOR: Borrower
:SCOPE: Circulation
:LEVEL: User goal
:END:
** Trigger
A borrower wants to keep a book past its due date.
** Minimal guarantee
A loan's due date changes only on a renewal the library allows.
** Success guarantee
The loan is due one loan period after the renewal date.
** Main success scenario
*** 1. Borrower asks to renew a loan
*** 2. Library finds no reservation on the book (F-1: A borrower renews a loan for one more loan period unless the book is reserved)
*** 3. Library sets the new due date
*** 4. Borrower sees the new due date
** Extensions
*** 2a. The book is reserved
**** 2a1. Library refuses the renewal with MSG-1: A reserved book cannot be renewed; the use case ends
```

`fixture/docs/message-catalog/msg-1-a-reserved-book-cannot-be-renewed.org`:

```org
* MSG-1 A reserved book cannot be renewed
:PROPERTIES:
:STATUS: Accepted
:END:
A reserved book cannot be renewed.
```

`fixture/docs/message-catalog/msg-2-this-loan-has-reached-its-renewal-limit.org`:

```org
* MSG-2 This loan has reached its renewal limit
:PROPERTIES:
:STATUS: Accepted
:END:
This loan has reached its renewal limit.
```

`fixture/docs/architectural-decisions/adr-1-keep-loans-as-an-append-only-ledger-of-loan-events.org`:

```org
* ADR-1 Keep loans as an append-only ledger of loan events
:PROPERTIES:
:STATUS: Accepted
:END:
** Context
A loan's history decides disputes: when it was lent, renewed and returned.
** Decision
We will keep every loan as an append-only ledger of loan events, and derive
a loan's state from them.
** Consequences
A renewal is a new event, never an edit. A loan's due date is read from its
latest event.
```

**Step 4: Write the realization**

`fixture/src/loans.py`:

```python
from datetime import date, timedelta

LOAN_PERIOD_DAYS = 14


class RenewalRefused(Exception):
    pass


def renew(loan, reservations, today: date):
    # F-1 §2: A borrower renews a loan for one more loan period unless the book is reserved
    if reservations.for_book(loan.book):
        raise RenewalRefused("A reserved book cannot be renewed")
    # F-1 §1: A borrower renews a loan for one more loan period unless the book is reserved
    loan.due = today + timedelta(days=LOAN_PERIOD_DAYS)
    return loan
```

**Step 5: Write AGENTS.md and CLAUDE.md from the seed**

```bash
F=evals/cases/citing-records-to-the-record-keeper/fixture
cp skills/recs-kickstart/agents-seed.md $F/AGENTS.md
printf '@AGENTS.md\n' > $F/CLAUDE.md
```

Then make exactly these edits to `$F/AGENTS.md`:

- Delete the sentence "Adapt the list to the project; the `recs-writing-records` skill carries the starting set." (keep "This project keeps these projections.").
- Delete the paragraph that starts "Where a category borrows its form" and its four list lines: the fixture has no knowledge base.
- Replace "This project's realization modality is <the modality the record keeper chose:\ncode, skill text, or other work, and where it lives>." with "This project's realization modality is code: the Python modules under `src/`."

Check: `grep -n '<the modality\|knowledge-base/evans' $F/AGENTS.md` prints nothing.

**Step 6: Commit**

```bash
git add evals/cases/citing-records-to-the-record-keeper
git commit -m "test: a case where the agent cites records to the record keeper

F-12 holds the agent's citations to the record keeper to the record's own
words. The case's records have long titles, which invite a paraphrase."
```

### Task 2: Find the citations in what the agent said

**Records:** `F-12: The agent cites a record to the record keeper in its title's exact words`; `UL-9: Citation`

**Files:**
- Create: `evals/checks/citations.js`
- Test: `evals/checks/citations.test.mjs`

**Step 1: Write the failing tests**

`evals/checks/citations.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { citations } from './citations.js';

const titles = new Map([
  ['F-1', 'A borrower renews a loan for one more loan period unless the book is reserved'],
  ['MSG-1', 'A reserved book cannot be renewed'],
]);
const one = (text) => {
  const found = citations(text, titles);
  assert.equal(found.length, 1, `one citation in ${JSON.stringify(text)}`);
  return found[0];
};

test('a whole citation in backticks holds', () => {
  const c = one('See `F-1: A borrower renews a loan for one more loan period unless the book is reserved`.');
  assert.deepEqual(
    { known: c.known, titled: c.titled, backticked: c.backticked, broken: c.broken, sectionMisplaced: c.sectionMisplaced },
    { known: true, titled: true, backticked: true, broken: false, sectionMisplaced: false },
  );
});

test('a section between the number and the title holds', () => {
  const c = one('`F-1 §2: A borrower renews a loan for one more loan period unless the book is reserved`');
  assert.equal(c.titled, true);
  assert.equal(c.backticked, true);
  assert.equal(c.sectionMisplaced, false);
});

test('a paraphrased title is not the title', () => {
  assert.equal(one('`F-1: Borrowers renew loans`').titled, false);
});

test('a bare number is not titled, and is backticked when it sits alone in backticks', () => {
  assert.equal(one('`F-1` refuses it').titled, false);
  assert.equal(one('`F-1` refuses it').backticked, true);
  assert.equal(one('F-1 refuses it').backticked, false);
});

test('a whole citation outside backticks is titled and not backticked', () => {
  const c = one('F-1: A borrower renews a loan for one more loan period unless the book is reserved.');
  assert.equal(c.titled, true);
  assert.equal(c.backticked, false);
});

test('a citation broken across a line is titled and broken', () => {
  const c = one('`F-1: A borrower renews a loan for one more loan\nperiod unless the book is reserved`');
  assert.equal(c.titled, true);
  assert.equal(c.broken, true);
});

test('a section after the title, or before the number, is misplaced', () => {
  assert.equal(one('`F-1: A borrower renews a loan for one more loan period unless the book is reserved` §2').sectionMisplaced, true);
  assert.equal(one('§2 of F-1 refuses it').sectionMisplaced, true);
});

test('a title with words added is titled, and not closed by its backtick', () => {
  const c = one('`MSG-1: A reserved book cannot be renewed early`');
  assert.equal(c.titled, true);
  assert.equal(c.backticked, false);
});

test('a number with no record on disk is unknown', () => {
  assert.equal(one('`F-9: Something else`').known, false);
});

test('a fenced block is not something said', () => {
  assert.deepEqual(citations('```org\n* F-1 A borrower\n```', titles), []);
});
```

**Step 2: Run them to verify they fail**

Run: `cd evals && node --test checks/citations.test.mjs`
Expected: FAIL, "Cannot find module" for `./citations.js`.

**Step 3: Write the implementation**

`evals/checks/citations.js`:

```js
const identifier = /(?<![\w-])(?:UL|ADR|F|UW|MSG)-\d+(?![\w-])/g;

function unfenced(text) {
  let fenced = false;
  return text
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fenced = !fenced;
        return '';
      }
      return fenced ? '' : line;
    })
    .join('\n');
}

function escaped(word) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function citations(text, titles) {
  const plain = unfenced(text);
  return [...plain.matchAll(identifier)].map((m) => {
    const id = m[0];
    const start = m.index;
    const title = titles.get(id);
    let at = start + id.length;
    const section = /^[ \t]+§[\w.]+/.exec(plain.slice(at));
    if (section) at += section[0].length;
    const pattern = title && new RegExp(`^:\\s+${title.split(/\s+/).map(escaped).join('\\s+')}(?![\\w'’-])`);
    const titled = pattern ? pattern.exec(plain.slice(at)) : null;
    const end = titled ? at + titled[0].length : at;
    const before = plain.slice(Math.max(0, start - 20), start);
    const after = plain.slice(end, end + 20);
    return {
      id,
      known: title !== undefined,
      titled: Boolean(titled),
      backticked: plain[start - 1] === '`' && plain[end] === '`',
      broken: plain.slice(start, end).includes('\n'),
      sectionMisplaced: !section && (/§[\w.]+[ \t]+(?:of[ \t]+)?$/.test(before) || /^`?[ \t]*\(?§/.test(after)),
      excerpt: plain.slice(start, end + 1).replace(/\s+/g, ' '),
    };
  });
}
```

**Step 4: Run them to verify they pass**

Run: `cd evals && node --test checks/citations.test.mjs`
Expected: PASS, 10 tests.

**Step 5: Commit**

```bash
git add evals/checks/citations.js evals/checks/citations.test.mjs
git commit -m "test: find the citations in what the agent said

Each citation is read against its record's title on disk, for F-12's
exact title, section place, backticks and single line."
```

### Task 3: The case's checks

**Records:** `F-12: The agent cites a record to the record keeper in its title's exact words`

**Files:**
- Create: `evals/checks/citing-records.js`
- Modify: `evals/promptfooconfig.yaml` (append a test)

**Step 1: Write the checks**

`evals/checks/citing-records.js`:

```js
import { citations } from './citations.js';
import { original, result } from './workspace.js';

const projections = [
  'docs/ubiquitous-language.org',
  'docs/architectural-decisions.org',
  'docs/features.org',
  'docs/user-workflows.org',
  'docs/message-catalog.org',
];

function titles(context) {
  const map = new Map();
  for (const file of projections) {
    for (const m of original(context, file).matchAll(/^- ([A-Z]+-\d+) :: \[\[[^\]]*\]\[(.*)\]\]$/gm)) {
      map.set(m[1], m[2]);
    }
  }
  return map;
}

function cited(output, context) {
  const said = context.providerResponse?.metadata?.said ?? output ?? '';
  return citations(said, titles(context)).filter((c) => c.known);
}

function every(output, context, holds, what) {
  const all = cited(output, context);
  if (all.length === 0) return result(false, 'no citation of a record on disk');
  const failing = all.filter((c) => !holds(c));
  return result(
    failing.length === 0,
    failing.length === 0
      ? `all ${all.length} citations hold`
      : `${failing.length} of ${all.length} citations ${what}: ${failing.map((c) => c.excerpt).join(' | ')}`,
  );
}

export function citesRecords(output, context) {
  const ids = [...new Set(cited(output, context).map((c) => c.id))];
  return result(ids.length >= 2, `cited ${ids.join(', ') || 'no record on disk'}`);
}

export function exactTitles(output, context) {
  return every(output, context, (c) => c.titled, 'do not carry the title as the heading does');
}

export function sectionBeforeTitle(output, context) {
  return every(output, context, (c) => !c.sectionMisplaced, 'name a section away from between the number and the title');
}

export function inBackticks(output, context) {
  return every(output, context, (c) => c.backticked, 'are not set in backticks');
}

export function oneLine(output, context) {
  return every(output, context, (c) => !c.broken, 'break across a line');
}
```

**Step 2: Add the test to `evals/promptfooconfig.yaml`**

Append under `tests:`, after the last test. Each `#` line is a citation, laid
out as the other tests' are; `citesRecords` cites F-12 §1, since it keeps the
other checks from passing on nothing.

```yaml
  - description: The agent cites records to the record keeper
    vars:
      case: citing-records-to-the-record-keeper
      request: file://cases/citing-records-to-the-record-keeper/prompt.md
    assert:
      # F-12 §1: The agent cites a record to the record keeper in its title's exact words
      - type: javascript
        metric: cites records
        value: file://checks/citing-records.js:citesRecords
      # F-12 §1: The agent cites a record to the record keeper in its title's exact words
      - type: javascript
        metric: exact titles
        value: file://checks/citing-records.js:exactTitles
      # F-12 §2: The agent cites a record to the record keeper in its title's exact words
      - type: javascript
        metric: section before title
        value: file://checks/citing-records.js:sectionBeforeTitle
      # F-12 §3: The agent cites a record to the record keeper in its title's exact words
      - type: javascript
        metric: in backticks
        value: file://checks/citing-records.js:inBackticks
      # F-12 §4: The agent cites a record to the record keeper in its title's exact words
      - type: javascript
        metric: one line
        value: file://checks/citing-records.js:oneLine
```

**Step 3: Check the config parses**

Run: `cd evals && node -e "import('js-yaml').then(y => { const c = y.load(require('fs').readFileSync('promptfooconfig.yaml','utf8')); console.log(c.tests.at(-1).description, c.tests.at(-1).assert.length) })"`
Expected: `The agent cites records to the record keeper 5`. (`js-yaml` ships with promptfoo; if the import fails, use `npx promptfoo eval --filter-pattern 'cites records' --filter-providers none` and expect "No providers" rather than a YAML error.)

**Step 4: Commit**

```bash
git add evals/checks/citing-records.js evals/promptfooconfig.yaml
git commit -m "test: check the agent's citations against F-12

One metric per requirement, read against the fixture's projections, and
one that the reply cites records at all."
```

### Task 4: Bring the knowledge base for Claude Code as an eval harness

**Records:** none; this is the knowledge base the provider's comments point at.

**Files:**
- Create: `docs/knowledge-base/claude-code-as-an-eval-harness.org`
- Modify: `docs/knowledge-base/bubblewrap-confines-an-eval-run.org`
- Modify: `evals/providers/pi.js` (one citation line)

**Step 1: Port both entries from `harness-rendering`**

```bash
git show harness-rendering:docs/knowledge-base/claude-code-as-an-eval-harness.org > docs/knowledge-base/claude-code-as-an-eval-harness.org
git show harness-rendering:docs/knowledge-base/bubblewrap-confines-an-eval-run.org > docs/knowledge-base/bubblewrap-confines-an-eval-run.org
```

**Step 2: Repoint pi.js to the renamed heading**

The bubblewrap entry's heading "A run sees only the system, node, pi and its
own directory" is "A run sees only the system, its harness and its own
directory" on `harness-rendering`. In `evals/providers/pi.js`, change the
citation line

`// docs/knowledge-base/bubblewrap-confines-an-eval-run.org: A run sees only the system, node, pi and its own directory`

to

`// docs/knowledge-base/bubblewrap-confines-an-eval-run.org: A run sees only the system, its harness and its own directory`

Check: `grep -rn 'node, pi and its own' evals docs` prints nothing.

**Step 3: Commit**

```bash
git add docs/knowledge-base evals/providers/pi.js
git commit -m "docs: bring how Claude Code behaves as an eval harness

Established on harness-rendering; the Claude Code provider on this branch
rests on it."
```

### Task 5: A Claude Code provider on the raw skills

**Records:** none for the provider's surface; its comments cite `docs/knowledge-base/` headings.

**Files:**
- Create: `evals/providers/claude.js`
- Test: `evals/providers/claude.test.mjs`
- Modify: `evals/promptfooconfig.yaml` (two providers), `evals/package.json` (one script)

**Step 1: Write the failing tests**

`evals/providers/claude.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { initProblem, said, skillCalls } from './claude.js';

const use = (id, name, input, parent = null) => ({
  type: 'assistant',
  message: { role: 'assistant', content: [{ type: 'tool_use', id, name, input }] },
  parent_tool_use_id: parent,
});
const answer = (id, isError = false, parent = null) => ({
  type: 'user',
  message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: 'ok', is_error: isError }] },
  parent_tool_use_id: parent,
});
const words = (text, parent = null) => ({
  type: 'assistant',
  message: { role: 'assistant', content: [{ type: 'text', text }] },
  parent_tool_use_id: parent,
});
const init = (over = {}) => ({
  type: 'system',
  subtype: 'init',
  permissionMode: 'bypassPermissions',
  skills: ['deep-research', 'recs-brainstorming', 'recs-writing-records'],
  ...over,
});

test('skillCalls reports the main agent\'s Skill tool uses, with their outcome', () => {
  assert.deepEqual(
    skillCalls([use('a', 'Skill', { skill: 'recs-brainstorming' }), answer('a'), use('b', 'Skill', { skill: 'recs-kickstart' })]),
    [{ name: 'recs-brainstorming', is_error: false }, { name: 'recs-kickstart', is_error: true }],
  );
});

test('skillCalls leaves out a subagent\'s Skill tool uses', () => {
  assert.deepEqual(skillCalls([use('s', 'Skill', { skill: 'recs-brainstorming' }, 't'), answer('s', false, 't')]), []);
});

test('said joins the main agent\'s text and leaves out a subagent\'s', () => {
  assert.equal(said([words('first'), words('hidden', 't'), words('second')]), 'first\n\nsecond');
});

test('initProblem accepts a run offering every expected skill, bypassing permissions', () => {
  assert.equal(initProblem([init()], ['recs-brainstorming', 'recs-writing-records']), undefined);
});

test('initProblem reports an expected skill the run does not offer', () => {
  assert.match(initProblem([init()], ['recs-kickstart']), /does not offer recs-kickstart/);
});

test('initProblem reports a without-skills run that offers a recs skill', () => {
  assert.match(initProblem([init()], []), /without the skills offers recs-brainstorming/);
});

test('initProblem reports a run not bypassing permissions', () => {
  assert.match(initProblem([init({ permissionMode: 'default' })], ['recs-brainstorming']), /permission mode default/);
});

test('initProblem reports a run with no init event', () => {
  assert.match(initProblem([], []), /no init event/);
});
```

**Step 2: Run them to verify they fail**

Run: `cd evals && node --test providers/claude.test.mjs`
Expected: FAIL, "Cannot find module" for `./claude.js`.

**Step 3: Write the provider**

`evals/providers/claude.js`. Above each function marked below, write one
citation line of the knowledge base heading named, as `pi.js` does:

- `claudeBinary` — claude-code-as-an-eval-harness.org: The `claude` binary is one executable that needs only the system's libraries
- `prepare` — claude-code-as-an-eval-harness.org: Claude Code loads CLAUDE.md and AGENTS.md from the working directory and its parents
- `sandboxed` — bubblewrap-confines-an-eval-run.org: A run sees only the system, its harness and its own directory; bubblewrap-confines-an-eval-run.org: Options read from `--args` keep the environment out of `/proc/<pid>/cmdline`; claude-code-as-an-eval-harness.org: `HOME` and `CLAUDE_CONFIG_DIR` inside the run keep the user's configuration out; claude-code-as-an-eval-harness.org: A tmpfs over `/etc/claude-code` keeps the host's managed settings out
- `events` — claude-code-as-an-eval-harness.org: A print-mode run is `claude -p --output-format stream-json --verbose`
- `skillCalls` — claude-code-as-an-eval-harness.org: A skill load is a `Skill` tool use naming the skill
- the `--permission-mode` argument — claude-code-as-an-eval-harness.org: Inside bubblewrap, bypassing permissions is the sandbox's to confine
- the token's line — claude-code-as-an-eval-harness.org: `CLAUDE_CODE_OAUTH_TOKEN` authenticates a run on the subscription
- the error return — claude-code-as-an-eval-harness.org: A failed run ends with a `result` event carrying `is_error`, and exits 1

```js
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evalsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.join(evalsDir, '..');
const casesDir = path.join(evalsDir, 'cases');

const identity = {
  GIT_AUTHOR_NAME: 'Record Keeper',
  GIT_AUTHOR_EMAIL: 'keeper@example.com',
  GIT_COMMITTER_NAME: 'Record Keeper',
  GIT_COMMITTER_EMAIL: 'keeper@example.com',
};

function git(cwd, ...args) {
  execFileSync('git', args, {
    cwd,
    stdio: 'ignore',
    env: { ...process.env, ...identity, GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z' },
  });
}

function resolved(command) {
  return fs.realpathSync(execFileSync('sh', ['-c', `command -v ${command}`], { encoding: 'utf8' }).trim());
}

function claudeBinary() {
  return resolved('claude');
}

export function recsSkills() {
  return fs
    .readdirSync(path.join(repoDir, 'skills'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('recs-'))
    .map((e) => e.name)
    .sort();
}

function prepare(caseName, withSkills) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `recs-eval-${caseName}-`));
  const project = path.join(root, 'project');
  const home = path.join(root, 'home');
  const configDir = path.join(home, '.claude');
  fs.cpSync(path.join(casesDir, caseName, 'fixture'), project, { recursive: true });
  if (withSkills) {
    fs.cpSync(path.join(repoDir, 'skills'), path.join(project, '.claude', 'skills'), { recursive: true });
    fs.cpSync(path.join(repoDir, 'agents'), path.join(project, '.claude', 'agents'), { recursive: true });
  }
  fs.mkdirSync(configDir, { recursive: true });
  git(project, 'init', '--quiet', '--initial-branch=main');
  git(project, 'add', '-A');
  git(project, 'commit', '--quiet', '-m', 'Start the project');
  return { root, project, home, configDir };
}

function sandboxed({ root, project, home, configDir }, binary, env, args) {
  const options = [
    '--unshare-all', '--share-net', '--die-with-parent', '--clearenv',
    '--ro-bind', '/usr', '/usr',
    '--symlink', 'usr/bin', '/bin', '--symlink', 'usr/lib', '/lib',
    '--symlink', 'usr/lib', '/lib64', '--symlink', 'usr/bin', '/sbin',
    '--ro-bind', '/etc', '/etc',
    '--proc', '/proc', '--dev', '/dev', '--tmpfs', '/tmp',
    '--bind', root, root,
    '--ro-bind', binary, '/opt/claude/claude',
    ...(fs.existsSync('/etc/claude-code') ? ['--tmpfs', '/etc/claude-code'] : []),
    ...Object.entries({ PATH: '/opt/claude:/usr/bin', HOME: home, CLAUDE_CONFIG_DIR: configDir, LANG: 'C.UTF-8', DISABLE_AUTOUPDATER: '1', ...env })
      .flatMap(([k, v]) => ['--setenv', k, v]),
    '--chdir', project,
  ];
  return { argv: ['--args', '3', '--', '/opt/claude/claude', ...args], options: options.map((o) => `${o}\0`).join('') };
}

function run({ argv, options }, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(resolved('bwrap'), argv, { argv0: 'bwrap', env: {}, stdio: ['ignore', 'pipe', 'pipe', 'pipe'] });
    child.stdio[3].on('error', () => {});
    child.stdio[3].end(options);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr });
    });
  });
}

function events(stdout) {
  return stdout
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

function mainThread(all) {
  return all.filter((e) => e.type === 'assistant' && e.parent_tool_use_id == null).flatMap((e) => e.message?.content ?? []);
}

export function said(all) {
  return mainThread(all)
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n\n');
}

export function skillCalls(all) {
  const results = new Map(
    all
      .filter((e) => e.type === 'user')
      .flatMap((e) => (Array.isArray(e.message?.content) ? e.message.content : []).filter((c) => c.type === 'tool_result'))
      .map((c) => [c.tool_use_id, c]),
  );
  return mainThread(all)
    .filter((c) => c.type === 'tool_use' && c.name === 'Skill')
    .map((c) => ({ name: c.input?.skill, is_error: !results.has(c.id) || Boolean(results.get(c.id).is_error) }));
}

export function initProblem(all, expected) {
  const init = all.find((e) => e.type === 'system' && e.subtype === 'init');
  if (!init) return 'the run reported no init event';
  if (init.permissionMode !== 'bypassPermissions') return `the run started in permission mode ${init.permissionMode}, not bypassPermissions`;
  const offered = init.skills ?? [];
  const named = (skill) => offered.some((o) => o === skill || o.endsWith(`:${skill}`));
  const missing = expected.filter((skill) => !named(skill));
  if (missing.length > 0) return `the run's init event does not offer ${missing.join(', ')}`;
  const stray = expected.length === 0 ? offered.filter((o) => /(^|:)recs-/.test(o)) : [];
  if (stray.length > 0) return `the run without the skills offers ${stray.join(', ')}`;
  return undefined;
}

export default class ClaudeCodeProvider {
  constructor(options = {}) {
    this.config = options.config ?? {};
    this.label = options.label;
  }

  id() {
    return `claude-code:${this.config.model}`;
  }

  async callApi(prompt, context) {
    let binary;
    try {
      binary = claudeBinary();
    } catch (error) {
      return { error: `no claude binary on PATH: ${error.message}` };
    }
    const token = process.env.CLAUDE_CODE_OAUTH_TOKEN;
    if (!token) return { error: 'CLAUDE_CODE_OAUTH_TOKEN is not set: run `claude setup-token` and export the token it prints' };
    const dirs = prepare(context?.vars?.case, this.config.skills);
    const expected = this.config.skills ? recsSkills() : [];
    const args = [
      '-p', '--output-format', 'stream-json', '--verbose', '--no-session-persistence',
      '--permission-mode', 'bypassPermissions',
      '--model', this.config.model,
      '--', prompt,
    ];
    const env = { ...identity, CLAUDE_CODE_OAUTH_TOKEN: token };
    const started = Date.now();
    const result = await run(sandboxed(dirs, binary, env, args), this.config.timeoutMs ?? 15 * 60 * 1000);
    const transcript = path.join(dirs.root, 'claude.jsonl');
    fs.writeFileSync(transcript, result.stdout);
    fs.writeFileSync(path.join(dirs.root, 'claude.stderr'), result.stderr);
    const all = events(result.stdout);
    const final = all.findLast((e) => e.type === 'result');
    const problem = initProblem(all, expected);
    const metadata = { workingDir: dirs.project, transcript, said: said(all), skillCalls: skillCalls(all), initProblem: problem, durationMs: Date.now() - started };
    if (!final || final.is_error || result.code !== 0) {
      return { error: final?.result ?? `claude exited ${result.code ?? result.signal}: ${result.stderr.slice(-2000)}`, metadata };
    }
    if (problem) return { error: problem, metadata };
    return { output: final.result ?? '', cost: final.total_cost_usd ?? 0, metadata };
  }
}
```

**Step 4: Run the tests to verify they pass**

Run: `cd evals && node --test providers/claude.test.mjs checks/citations.test.mjs`
Expected: PASS, 18 tests.

**Step 5: Prove the skills load, with no model reached**

The token below is not a real one: the run fails authentication after its
init event, which is all this step reads.

```bash
cd evals && CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-notarealtoken node -e "
import('./providers/claude.js').then(async ({ default: P }) => {
  for (const skills of [true, false]) {
    const r = await new P({ config: { model: 'claude-sonnet-5-5', skills, timeoutMs: 120000 } })
      .callApi('hi', { vars: { case: 'citing-records-to-the-record-keeper' } });
    console.log(skills, r.metadata.initProblem ?? 'init ok', '|', r.error);
  }
})"
```

Expected: `true init ok | ... 401 ...` and `false init ok | ... 401 ...`.

If `true` prints "does not offer": project skills in `.claude/skills` are not
offered in print mode as copied. STOP and report the init event's `skills`
list (`grep '"subtype":"init"' <root>/claude.jsonl`) to the record keeper.
Do not work around it.

**Step 6: Write down what the run established**

Append to `docs/knowledge-base/claude-code-as-an-eval-harness.org` an entry
headed "* Skills copied into a project's `.claude/skills` are offered in print
mode", saying the Claude Code version (`claude --version`), the date, the
command from Step 5, and the init event's `skills` list it printed, as the
entry's other headings do.

**Step 7: Register the arms and a script**

In `evals/promptfooconfig.yaml`, append to `providers:`:

```yaml
  - id: file://providers/claude.js
    label: claude-code-sonnet with-skills
    config:
      model: claude-sonnet-5-5
      skills: true
  - id: file://providers/claude.js
    label: claude-code-sonnet without-skills
    config:
      model: claude-sonnet-5-5
      skills: false
```

In `evals/package.json`, add to `scripts`:

```json
"eval:claude-code": "PROMPTFOO_SCHEDULER_QUEUE_TIMEOUT_MS=3600000 promptfoo eval --no-cache --filter-providers claude-code"
```

**Step 8: Commit**

```bash
git add evals/providers/claude.js evals/providers/claude.test.mjs evals/promptfooconfig.yaml evals/package.json docs/knowledge-base/claude-code-as-an-eval-harness.org
git commit -m "test: run the evals in Claude Code on the raw skills

Runs on the record keeper's subscription, so evals of a skill change
cost no API spend. Cut down from the provider on harness-rendering."
```

### Task 6: Baseline — watch it fail

**Records:** `F-12: The agent cites a record to the record keeper in its title's exact words`

@superpowers:writing-skills: a skill change is written only after an agent is
seen failing without it.

**Step 1: The record keeper exports the token**

The record keeper runs `claude setup-token` and exports what it prints as
`CLAUDE_CODE_OAUTH_TOKEN` in the shell that runs the eval. A model in the run
can read the token from Claude Code's own process (claude-code-as-an-eval-harness.org:
A shell run by Claude Code can read `CLAUDE_CODE_OAUTH_TOKEN` from Claude Code's own process),
so transcripts are not shared outside this machine.

**Step 2: Run the case, both arms, three times**

Run: `cd evals && npm run eval:claude-code -- --filter-pattern 'cites records' --repeat 3`
Expected: six runs complete with no provider error. Any metric may fail.

**Step 3: Record the baseline**

For each arm, note pass counts for the five metrics, and from failing runs
the check's reason (the excerpts). Read one with-skills transcript
(`metadata.transcript`) to confirm `said` holds what the reply showed, with no
block repeated.

**Step 4: Add the valid-token run to the knowledge base**

Under "`CLAUDE_CODE_OAUTH_TOKEN` authenticates a run on the subscription",
add what a valid-token run showed: the init event's `apiKeySource`, and that
the run completed. Commit:

```bash
git add docs/knowledge-base/claude-code-as-an-eval-harness.org
git commit -m "docs: a run on the subscription token completes"
```

**Step 5: STOP and report the baseline to the record keeper**

Show the table and the failing excerpts. If every metric already passes 3/3
with the skills, say so: Task 7 may then be only the examples. Wait for the
record keeper before Task 7.

### Task 7: Tell the agent how to cite to the record keeper

**Records:** `F-12: The agent cites a record to the record keeper in its title's exact words`; `ADR-2: The recs files live apart from any project that uses them`

ADR-2 means none of these texts cites F-12 or any record of this repository.

**Files:**
- Modify: `skills/recs-kickstart/agents-seed.md` ("How to talk to the record keeper")
- Modify: `evals/cases/citing-records-to-the-record-keeper/fixture/AGENTS.md` (the same section)
- Modify: `AGENTS.md` (the same section)
- Modify: `skills/recs-brainstorming/SKILL.md:18`
- Modify: `skills/recs-receiving-code-review/SKILL.md:123`

**Step 1: The seed, the fixture's AGENTS.md and this repository's AGENTS.md**

In each, replace

```
you need to talk to the record keeper about it, use the record number and the record title.

Good: "`X-8: Frobnicate the widgets`"
Bad: "`X-8`"
```

with

```
you need to talk to the record keeper about it, use the record number and the record title.
Copy the title word for word from the record's heading. A section goes between
the number and the title. Set each citation in backticks, and write it on one line.

Good: "`X-8: Frobnicate the widgets`"
Good: "`X-8 §2: Frobnicate the widgets`"
Bad: "`X-8`"
Bad: "`X-8: Frobnicating widgets`"
Bad: "X-8: Frobnicate the widgets"
```

**Step 2: recs-brainstorming**

Replace

```
- Speak in record numbers and titles throughout the dialogue ("that touches UW-4: Import contacts from a spreadsheet") - never a bare number, and never a paraphrase where a record already says it.
```

with

```
- Speak in record numbers and titles throughout the dialogue ("that touches `UW-4: Import contacts from a spreadsheet`") - never a bare number, and never a paraphrase where a record already says it. Copy each title word for word from its record's heading, set each citation in backticks, and keep it on one line.
```

**Step 3: recs-receiving-code-review**

In line 123, put the example citation in backticks:
`("ADR-12: One connection per client")` → ``("`ADR-12: One connection per client`")``.

**Step 4: Confirm nothing cites this repository's records**

Run: `grep -n 'F-12' skills/ -r`
Expected: no output.

**Step 5: Commit**

```bash
git add skills/recs-kickstart/agents-seed.md skills/recs-brainstorming/SKILL.md skills/recs-receiving-code-review/SKILL.md AGENTS.md evals/cases/citing-records-to-the-record-keeper/fixture/AGENTS.md
git commit -m "feat: cite a record to the record keeper in its exact words

F-12 asks for the title as the heading carries it, the section between
number and title, backticks, and one line, so a record keeper's tools can
follow every citation the agent gives."
```

### Task 8: Run again until it holds, three tries at most

**Records:** `F-12: The agent cites a record to the record keeper in its title's exact words`

**Step 1: Run the case**

Run: `cd evals && npm run eval:claude-code -- --filter-pattern 'cites records' --repeat 3`
Expected: with-skills passes all five metrics 3/3.

**Step 2: If a metric fails**

Read the failing excerpts and transcripts. Change the wording of Task 7's
texts only, in the same places, and commit with the run's result in the body.
After the third failing round, STOP and report to the record keeper with the
excerpts; do not add new places or new rules.

**Step 3: Check the other cases still pass in Claude Code**

Run: `cd evals && npm run eval:claude-code -- --filter-providers 'claude-code-sonnet with-skills'`
Expected: every case completes. Report each case's metrics; this is the first
run of the older cases in Claude Code, so a failure there is reported, not
fixed in this plan.

### Task 9: README and CHANGELOG

**Files:**
- Modify: `README.md` ("### Evals")
- Modify: `CHANGELOG.md` (an `## Unreleased` section above `## 1.0.0-beta`)

**Step 1: README**

After the paragraph that ends "Each run's transcript is kept beside its
project, as `pi.jsonl`.", add:

```markdown
The `claude-code-sonnet` arms run the `claude` CLI in the same sandbox, with
`skills/` copied into the run's `.claude/skills`, on your Claude subscription:
run `claude setup-token`, export what it prints as `CLAUDE_CODE_OAUTH_TOKEN`,
and run `npm run eval:claude-code`. A model in the run can read that token, so
keep its transcripts on your machine.
```

**Step 2: CHANGELOG**

```markdown
## Unreleased

- The agent cites a record to the record keeper in its title's exact words,
  with any section between the number and the title, in backticks, and on one
  line (`F-12: The agent cites a record to the record keeper in its title's exact words`).
- The evals run in Claude Code on a Claude subscription, beside pi.
- A new eval case, `citing-records-to-the-record-keeper`, with its Claude Code
  results: <the with-skills and without-skills pass counts from Task 8>.
```

**Step 3: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: the Claude Code evals and F-12 in the changelog"
```

Then finish the branch with @recs-finishing-a-development-branch.
