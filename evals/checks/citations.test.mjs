import test from 'node:test';
import assert from 'node:assert/strict';
import { citations } from './citations.js';

const titles = new Map([
  ['F-1', 'A borrower renews a loan for one more loan period unless the book is reserved'],
  ['MSG-1', 'A reserved book cannot be renewed'],
  ['UL-1', 'Loan'],
  ['UW-1', 'A borrower’s loan is renewed'],
  ['F-2', 'A librarian waives a fine'],
]);
const whole = 'A borrower renews a loan for one more loan period unless the book is reserved';
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

test('a title with words added inside its backticks is not the title', () => {
  const c = one('`MSG-1: A reserved book cannot be renewed early`');
  assert.equal(c.titled, false);
  assert.equal(c.backticked, true);
  assert.equal(one('`UL-1: Loan period`').titled, false);
  assert.equal(one('`MSG-1: A reserved book cannot be renewed.`').titled, false);
});

test('a section before a backticked citation, or after it past a comma, is misplaced', () => {
  assert.equal(one(`§2 of \`F-1: ${whole}\``).sectionMisplaced, true);
  assert.equal(one(`\`F-1: ${whole}\`, §2`).sectionMisplaced, true);
});

test('a section that opens the next citation is not misplaced on the one before it', () => {
  const [first, second] = citations(`See \`F-1: ${whole}\`, §2 of \`F-2: A librarian waives a fine\``, titles);
  assert.equal(first.sectionMisplaced, false);
  assert.equal(second.sectionMisplaced, true);
});

test('a section name may carry a hyphen', () => {
  const c = one(`\`F-1 §Status-change: ${whole}\``);
  assert.deepEqual(
    { titled: c.titled, backticked: c.backticked, sectionMisplaced: c.sectionMisplaced, sections: c.sections },
    { titled: true, backticked: true, sectionMisplaced: false, sections: 1 },
  );
  assert.equal(one(`\`F-1: ${whole}\` §Status-change`).sectionMisplaced, true);
});

test('several sections between the number and the title hold, and are counted', () => {
  for (const text of [`\`F-1 §2, §3: ${whole}\``, `\`F-1 §2–§3: ${whole}\``]) {
    const c = one(text);
    assert.deepEqual(
      { titled: c.titled, backticked: c.backticked, sectionMisplaced: c.sectionMisplaced, sections: c.sections },
      { titled: true, backticked: true, sectionMisplaced: false, sections: 2 },
      text,
    );
  }
  assert.equal(one(`\`F-1 §2: ${whole}\``).sections, 1);
  assert.equal(one(`\`F-1: ${whole}\``).sections, 0);
});

test('a line break before the section or the colon is titled and broken', () => {
  for (const text of [`\`F-1\n§2: ${whole}\``, `\`F-1\n: ${whole}\``]) {
    const c = one(text);
    assert.equal(c.titled, true, text);
    assert.equal(c.broken, true, text);
  }
});

test('an inline triple-backtick span does not open a fence', () => {
  assert.equal(citations('```F-1``` text\nand F-1 again', titles).length, 2);
});

test('an untitled excerpt runs to the closing backtick, or to the end of the line', () => {
  assert.equal(one('`F-1: Borrowers renew loans` and more').excerpt, 'F-1: Borrowers renew loans`');
  assert.equal(one('F-1: Borrowers renew loans\nnext').excerpt, 'F-1: Borrowers renew loans');
});

test('a straight apostrophe matches a curly one in the title', () => {
  assert.equal(one("`UW-1: A borrower's loan is renewed`").titled, true);
  assert.equal(one('`UW-1: A borrower’s loan is renewed`').titled, true);
});

test('words that only look like identifiers are not citations', () => {
  assert.deepEqual(citations('UTF-8, ISO-8601 and F-2-ish', titles), []);
});

test('a number with no record on disk is unknown', () => {
  assert.equal(one('`F-9: Something else`').known, false);
});

test('a fenced block is not something said', () => {
  assert.deepEqual(citations('```org\n* F-1 A borrower\n```', titles), []);
});

test('a paraphrased title in backticks is not titled, and is backticked', () => {
  const c = one('`F-1: Borrower renewal` says so');
  assert.equal(c.titled, false);
  assert.equal(c.backticked, true);
  assert.equal(one('`F-1: Borrower renewal\nsays so`').backticked, false);
});

test('a section map after a whole citation is not a misplaced section', () => {
  const [c] = citations(`Supersedes \`F-1: ${whole}\` (§1 → §1; §2 → §2, §3; §3 → none)`, titles);
  assert.equal(c.titled, true);
  assert.equal(c.sectionMisplaced, false);
});

test('a citation by a dated identifier holds', () => {
  const dated = new Map([['ADR-20261015-70tz', 'A record change is one commit of its own']]);
  const found = citations('See `ADR-20261015-70tz: A record change is one commit of its own`.', dated);
  assert.equal(found.length, 1);
  assert.deepEqual(
    { known: found[0].known, titled: found[0].titled, backticked: found[0].backticked },
    { known: true, titled: true, backticked: true },
  );
});
