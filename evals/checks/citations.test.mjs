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
