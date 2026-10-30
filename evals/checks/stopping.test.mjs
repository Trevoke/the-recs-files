import test from 'node:test';
import assert from 'node:assert/strict';
import { recordFiles, recordFaults } from './stopping.js';

test('a record file and a projection are records', () => {
  assert.deepEqual(recordFiles(['docs/features.org', 'docs/features/f-2-a-returned-copy-is-held.org']), ['docs/features.org', 'docs/features/f-2-a-returned-copy-is-held.org']);
});

test('code, tests, a plan and the vision are not records', () => {
  assert.deepEqual(recordFiles(['src/holds.py', 'tests/test_holds.py', 'docs/plans/2026-10-20-renewals-on-the-ledger.md', 'docs/vision.org']), []);
});

const projection = '#+TITLE: Features\n\n- F-1 :: [[./features/f-1-a.org][A]]\n';

test('a record that stood is edited: a fault', () => {
  assert.deepEqual(recordFaults([{ file: 'docs/features/f-1-a.org', before: '* F-1 A\n:PROPERTIES:\n:STATUS: Accepted\n:END:\n1. Old.\n', after: '* F-1 A\n:PROPERTIES:\n:STATUS: Accepted\n:END:\n1. New.\n' }]), ['docs/features/f-1-a.org']);
});

test('a record that stood is removed: a fault', () => {
  assert.deepEqual(recordFaults([{ file: 'docs/features/f-1-a.org', before: '* F-1 A\n', after: undefined }]), ['docs/features/f-1-a.org']);
});

test('a new record written as Proposed, with its line under * Proposed, stands as no change', () => {
  assert.deepEqual(recordFaults([
    { file: 'docs/features/f-3-b.org', before: undefined, after: '* F-3 B\n:PROPERTIES:\n:STATUS: Proposed\n:END:\n1. The library shall hold it.\n' },
    { file: 'docs/features.org', before: projection, after: `${projection}* Proposed\n- F-3 :: [[./features/f-3-b.org][B]]\n` },
  ]), []);
});

test('a new record written as Accepted: a fault', () => {
  assert.deepEqual(recordFaults([{ file: 'docs/features/f-3-b.org', before: undefined, after: '* F-3 B\n:PROPERTIES:\n:STATUS: Accepted\n:END:\n' }]), ['docs/features/f-3-b.org']);
});

test('a line added to a projection outside * Proposed: a fault', () => {
  assert.deepEqual(recordFaults([{ file: 'docs/features.org', before: projection, after: `${projection}- F-3 :: [[./features/f-3-b.org][B]]\n` }]), ['docs/features.org']);
});
