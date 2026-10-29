import test from 'node:test';
import assert from 'node:assert/strict';
import { recordFiles } from './stopping.js';

test('a record file and a projection are records', () => {
  assert.deepEqual(recordFiles(['docs/features.org', 'docs/features/f-2-a-returned-copy-is-held.org']), ['docs/features.org', 'docs/features/f-2-a-returned-copy-is-held.org']);
});

test('code, tests, a plan and the vision are not records', () => {
  assert.deepEqual(recordFiles(['src/holds.py', 'tests/test_holds.py', 'docs/plans/2026-10-20-renewals-on-the-ledger.md', 'docs/vision.org']), []);
});
