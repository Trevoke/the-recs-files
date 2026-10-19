import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryFileKept, onlyPlannedFilesWritten, reviewerDelegated, reviewerRole } from './harness-capabilities.js';

function run(t, events, files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'recs-check-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const project = path.join(root, 'project');
  fs.mkdirSync(project);
  const git = (...args) => execFileSync('git', args, {
    cwd: project,
    stdio: 'ignore',
    env: { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@example.com' },
  });
  fs.writeFileSync(path.join(project, 'AGENTS.md'), 'agents\n');
  git('init', '--quiet', '--initial-branch=main');
  git('add', '-A');
  git('commit', '--quiet', '-m', 'Start the project');
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(project, file)), { recursive: true });
    fs.writeFileSync(path.join(project, file), text);
  }
  const transcript = path.join(root, 'pi.jsonl');
  fs.writeFileSync(transcript, `${events.map((e) => JSON.stringify(e)).join('\n')}\nnot json\n`);
  return { providerResponse: { metadata: { workingDir: project, transcript } } };
}

const start = (toolName, args) => ({ type: 'tool_execution_start', toolCallId: Math.random().toString(), toolName, args });
const memory = '/tmp/recs-files-memory-project.md';

test('the reviewer role is the first line of the code reviewer body', () => {
  assert.equal(reviewerRole(), fs.readFileSync(new URL('../../agents/recs-code-reviewer.md', import.meta.url), 'utf8').split('\n')
    .find((l) => l.startsWith('You are a Senior Code Reviewer')));
});

test('reviewerDelegated passes when a subagent prompt opens with the role', (t) => {
  const context = run(t, [start('subagent', { prompt: `${reviewerRole()}\n\nReview src/inspection.js.` })]);
  assert.equal(reviewerDelegated('', context).pass, true);
});

test('reviewerDelegated fails when the role is not first in the prompt', (t) => {
  const context = run(t, [start('subagent', { prompt: `Review this.\n${reviewerRole()}` })]);
  assert.equal(reviewerDelegated('', context).pass, false);
});

test('reviewerDelegated fails when nothing is delegated', (t) => {
  const context = run(t, [start('read', { path: 'src/inspection.js' }), { type: 'tool_execution_end', toolName: 'subagent' }]);
  assert.equal(reviewerDelegated('', context).pass, false);
});

test('memoryFileKept passes on a write and an edit of the memory file', (t) => {
  const context = run(t, [start('write', { path: memory, content: '- [ ] one' }), start('edit', { path: memory, edits: [] })]);
  assert.equal(memoryFileKept('', context).pass, true);
});

test('memoryFileKept fails on one write, or writes elsewhere', (t) => {
  assert.equal(memoryFileKept('', run(t, [start('write', { path: memory })])).pass, false);
  assert.equal(memoryFileKept('', run(t, [start('write', { path: 'TODO.md' }), start('edit', { path: 'TODO.md' })])).pass, false);
  assert.equal(memoryFileKept('', run(t, [start('write', { path: '/tmp/x/recs-files-memory-project.md' }), start('edit', { path: '/tmp/x/recs-files-memory-project.md' })])).pass, false);
});

test('memoryFileKept throws without a transcript', () => {
  assert.throws(() => memoryFileKept('', { providerResponse: { metadata: {} } }), /no transcript/);
});

const notes = { 'notes/one.txt': 'one\n', 'notes/two.txt': 'two\n', 'notes/three.txt': 'three\n' };

test('onlyPlannedFilesWritten passes on exactly the planned files', (t) => {
  assert.equal(onlyPlannedFilesWritten('', run(t, [], notes)).pass, true);
});

test('onlyPlannedFilesWritten fails on an extra file', (t) => {
  const r = onlyPlannedFilesWritten('', run(t, [], { ...notes, 'TODO.md': '- [ ] one\n' }));
  assert.equal(r.pass, false);
  assert.match(r.reason, /TODO\.md/);
});

test('onlyPlannedFilesWritten fails on a missing planned file', (t) => {
  const r = onlyPlannedFilesWritten('', run(t, [], { 'notes/one.txt': 'one\n' }));
  assert.equal(r.pass, false);
  assert.match(r.reason, /notes\/two\.txt/);
});
