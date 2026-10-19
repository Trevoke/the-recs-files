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

let ids = 0;
const call = (toolName, args, isError = false) => {
  ids += 1;
  return [
    { type: 'tool_execution_start', toolCallId: `c${ids}`, toolName, args },
    { type: 'tool_execution_end', toolCallId: `c${ids}`, toolName, isError },
  ];
};
const start = (toolName, args) => call(toolName, args)[0];
const memory = '/tmp/recs-files-memory-project.md';

test('the reviewer role is the first line of the code reviewer body', () => {
  assert.equal(reviewerRole(), fs.readFileSync(new URL('../../agents/recs-code-reviewer.md', import.meta.url), 'utf8').split('\n')
    .find((l) => l.startsWith('You are a Senior Code Reviewer')));
});

test('reviewerDelegated passes when a subagent prompt opens with the role', (t) => {
  const context = run(t, [start('subagent', { prompt: `${reviewerRole()}\n\nReview src/inspection.js.` })]);
  assert.equal(reviewerDelegated('', context).pass, true);
});

test('reviewerDelegated passes when a heading or a fence comes before the role', (t) => {
  for (const prompt of [
    `# Code review\n\n${reviewerRole()}\n\nReview src/inspection.js.`,
    `Your role:\n\n\`\`\`\n${reviewerRole()}\n\`\`\``,
    `---\n## Role\n${reviewerRole()}`,
  ]) {
    const r = reviewerDelegated('', run(t, [start('subagent', { prompt })]));
    assert.equal(r.pass, true, prompt);
    assert.match(r.reason, /at line \d+/);
  }
});

test('reviewerDelegated fails when the template opening comes before the role', (t) => {
  const prompt = `# Code Review Agent\n\nYou are reviewing code changes against the plan task and the records it cites.\n\n${reviewerRole()}`;
  const r = reviewerDelegated('', run(t, [start('subagent', { prompt })]));
  assert.equal(r.pass, false);
  assert.match(r.reason, /found at line 5/);
});

test('reviewerRole reads the rendered role file from the run package', (t) => {
  const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'recs-check-pkg-'));
  t.after(() => fs.rmSync(pkg, { recursive: true, force: true }));
  fs.mkdirSync(path.join(pkg, 'skills', 'recs-requesting-code-review'), { recursive: true });
  fs.writeFileSync(path.join(pkg, 'skills', 'recs-requesting-code-review', 'reviewer-role.md'), 'You are the rendered role.\n\nMore.\n');
  const context = { providerResponse: { metadata: { packageDir: pkg } } };
  assert.equal(reviewerRole(context), 'You are the rendered role.');
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
  const context = run(t, [...call('write', { path: memory, content: '- [ ] one' }), ...call('edit', { path: memory, edits: [] })]);
  assert.equal(memoryFileKept('', context).pass, true);
});

test('memoryFileKept fails on one write, or writes elsewhere', (t) => {
  assert.equal(memoryFileKept('', run(t, [...call('write', { path: memory })])).pass, false);
  assert.equal(memoryFileKept('', run(t, [...call('write', { path: 'TODO.md' }), ...call('edit', { path: 'TODO.md' })])).pass, false);
  assert.equal(memoryFileKept('', run(t, [...call('write', { path: '/tmp/x/recs-files-memory-project.md' }), ...call('edit', { path: '/tmp/x/recs-files-memory-project.md' })])).pass, false);
});

test('memoryFileKept counts bash writes to the memory file', (t) => {
  for (const command of [
    `printf -- '- [ ] one\\n' > ${memory}`,
    `echo '- [x] one' >> ${memory}`,
    `echo '- [ ] two' | tee -a ${memory}`,
    `sed -i 's/- \\[ \\] one/- [x] one/' ${memory}`,
  ]) {
    assert.equal(memoryFileKept('', run(t, [...call('bash', { command }), ...call('write', { path: memory })])).pass, true, command);
  }
});

test('memoryFileKept does not count a bash read of the memory file', (t) => {
  assert.equal(memoryFileKept('', run(t, [...call('bash', { command: `cat ${memory}` }), ...call('write', { path: memory })])).pass, false);
  assert.equal(memoryFileKept('', run(t, [...call('bash', { command: `grep one ${memory} > /dev/null` }), ...call('write', { path: memory })])).pass, false);
});

test('memoryFileKept does not count failed or unfinished calls', (t) => {
  assert.equal(memoryFileKept('', run(t, [...call('write', { path: memory }), ...call('edit', { path: memory }, true)])).pass, false);
  assert.equal(memoryFileKept('', run(t, [...call('write', { path: memory }), start('edit', { path: memory })])).pass, false);
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
