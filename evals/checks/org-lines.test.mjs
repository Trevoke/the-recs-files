import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deadLinks, lineFaults, plainNames } from './org-lines.js';

const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const file = 'docs/architectural-decisions/adr-5-merge.org';
const link4 = '[[./adr-4-retry-every-failed-job-from-one-shared-queue.org][ADR-4: Retry every failed job from one shared queue]]';
const record = (drawer, body = 'Body.') => `* ADR-5 Merge\n:PROPERTIES:\n${drawer}\n:END:\n${body}\n`;

test('a whole record has no faults', () => {
  assert.deepEqual(lineFaults(file, record(`:STATUS: Proposed\n:SUPERSEDES: ${link4} ${link4}`)), []);
});

test('a wrapped heading leaves the drawer away from it', () => {
  const text = '* ADR-5 Retry each provider\'s failed jobs\n  from one queue\n:PROPERTIES:\n:STATUS: Proposed\n:END:\n';
  const faults = lineFaults(file, text);
  assert.match(faults.join(), /heading not followed by its drawer/);
  assert.match(faults.join(), /drawer not directly under a heading/);
});

test('a wrapped property line is broken', () => {
  assert.match(lineFaults(file, record(':STATUS: Proposed\n:SUPERSEDES: [[./adr-4-x.org][ADR-4: Retry\n  every failed job]]')).join(), /broken property line/);
});

test('a repeated property is a fault, plus form included', () => {
  assert.match(lineFaults(file, record(':SUPERSEDES: a\n:SUPERSEDES: b')).join(), /property repeated: SUPERSEDES/);
  assert.match(lineFaults(file, record(':SUPERSEDES: a\n:SUPERSEDES+: b')).join(), /property repeated: SUPERSEDES/);
});

test('a link broken across body lines is a fault', () => {
  assert.match(lineFaults(file, record(':STATUS: Proposed', 'As [[./adr-4-x.org][ADR-4: Retry\nevery failed job]].')).join(), /link broken/);
});

test('a broken projection line is a fault', () => {
  const projection = '#+TITLE: Architectural decisions\n\n- ADR-5 :: [[./architectural-decisions/adr-5-merge.org][Merge\n  the queues]]\n';
  assert.match(lineFaults('docs/architectural-decisions.org', projection).join(), /projection line broken/);
});

test('a plain record name in a record body is found, a linked one is not', () => {
  assert.deepEqual(plainNames(file, record(':STATUS: Proposed', `Rests on ${link4}.`)), []);
  assert.deepEqual(plainNames(file, record(':STATUS: Proposed', 'Rests on `ADR-4: Retry every failed job from one shared queue`.')), [`${file}:5 ADR-4`]);
});

test('this repository\'s records are whole and name records by links', () => {
  const docs = path.join(repo, 'docs');
  const files = fs.readdirSync(docs, { recursive: true }).filter((f) => f.endsWith('.org') && !f.startsWith('knowledge-base') && !f.startsWith('plans'));
  for (const f of files) {
    const rel = `docs/${f}`;
    const text = fs.readFileSync(path.join(repo, rel), 'utf8');
    assert.deepEqual(lineFaults(rel, text), [], rel);
    assert.deepEqual(deadLinks(repo, rel, text), [], rel);
    if (!/f-12-the-agent-cites/.test(rel)) assert.deepEqual(plainNames(rel, text), [], rel);
  }
});

test('links on a :SUPERSEDES: line are parted by a comma and a space, after any section map', async () => {
  const { separators } = await import('./superseding-two-features.js');
  const a = '[[./f-1-x.org][F-1: X]]';
  const b = '[[./f-2-y.org][F-2: Y]]';
  assert.deepEqual(separators(`:SUPERSEDES: ${a} (§1 → §1; §2 → none), ${b} (§1 → §2)`), [', ']);
  assert.deepEqual(separators(`:SUPERSEDES: ${a}, ${b}`), [', ']);
  assert.deepEqual(separators(`:SUPERSEDES: ${a} ${b}`), [' ']);
});
