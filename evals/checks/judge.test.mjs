import test from 'node:test';
import assert from 'node:assert/strict';
import { judgePrompt, verified } from './judge.js';

test('a fault whose passage is in the reply is kept, across line breaks', () => {
  const reply = 'I will open the two\nfeatures first.';
  assert.deepEqual(verified([{ section: '§1', passage: 'the two features', why: 'x' }], reply).length, 1);
});

test('a fault whose passage is not in the reply is dropped', () => {
  assert.deepEqual(verified([{ section: '§1', passage: 'the decision', why: 'x' }], 'Nothing here.'), []);
});

test('an empty passage is dropped', () => {
  assert.deepEqual(verified([{ section: '§6', passage: '  ', why: 'x' }], 'Anything.'), []);
});

test('the prompt carries the feature record from disk, the terms, the records, the question and the reply', () => {
  const p = judgePrompt('THE REPLY', '=== docs/features.org\nRECORDS', 'THE QUESTION');
  assert.match(p, /\* F-20261028-1mkt The agent cites a record/);
  assert.match(p, /\* UW-20261028-838j Answer a question the agent raises/);
  assert.match(p, /\* UL-20261028-tk52 Reference/);
  assert.match(p, /RECORDS/);
  assert.match(p, /<question>\nTHE QUESTION\n<\/question>/);
  assert.match(p, /<reply>\nTHE REPLY\n<\/reply>/);
});

test('a fault whose passage is in the agent\'s changes is kept', () => {
  assert.equal(verified([{ section: 'UW-20261028-838j §Minimal guarantee', passage: 'hold.expires = None', why: 'x' }], 'A reply.', '+    hold.expires = None').length, 1);
});

test('the prompt carries the agent\'s changes, and the situation where one is given', () => {
  const p = judgePrompt('THE REPLY', 'RECORDS', 'THE QUESTION', 'THE CHANGES', 'THE SITUATION');
  assert.match(p, /<changes>\nTHE CHANGES\n<\/changes>/);
  assert.match(p, /<situation>\nTHE SITUATION\n<\/situation>/);
  assert.doesNotMatch(judgePrompt('R', 'RECORDS', 'Q'), /<situation>/);
});

test('a citing fault whose passage is only in the agent\'s changes is dropped', () => {
  assert.equal(verified([{ section: 'F-20261028-1mkt §1', passage: 'hold_for_next', why: 'x' }], 'A reply.', '+def hold_for_next():').length, 0);
});

test('the judge faults carrying the work past the situation under the Trigger, and lets the mechanism the records settle stand', () => {
  const p = judgePrompt('R', 'RECORDS', 'Q', 'C', 'S');
  assert.match(p, /- UW-20261028-838j §Trigger: /);
  assert.match(p, /how it is built is the agent's/);
});
