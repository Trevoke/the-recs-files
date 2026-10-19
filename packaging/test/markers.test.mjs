import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markers, renderText, checkProfile, capabilities } from '../markers.mjs';

const profile = {
  harness: 'test',
  capabilities: {
    delegate: {
      status: 'native',
      brief: 'Call ({role})',
      sentence: 'Call with {role} type',
      'brief-role-file': 'Call (general-purpose, with `{roleFile}` first in its prompt)',
      'sentence-role-file': 'Call with `{roleFile}` first in its prompt',
      roles: { 'recs-code-reviewer': 'role file' },
      roleNames: { 'general-purpose': 'self' },
    },
    handoff: { status: 'prose' },
    clear: { status: 'prose' },
    load: { status: 'native', skill: '{skill}' },
    tool: { status: 'native' },
    ask: { status: 'prose' },
    memory: { status: 'native', list: 'Todo', 'in-progress': 'doing', completed: 'done' },
    restrict: { status: 'prose' },
  },
};
const context = {
  file: 'skills/recs-a/prompt.md',
  roleFile: 'skills/recs-requesting-code-review/reviewer-role.md',
  roles: ['recs-code-reviewer'],
  skills: ['recs-a', 'recs-b'],
};

test('finds capability markers and their arguments', () => {
  assert.deepEqual(markers('x {{trf: load recs-b}} y {{trf:memory}}'), [
    { raw: '{{trf: load recs-b}}', keyword: 'load', args: ['recs-b'] },
    { raw: '{{trf:memory}}', keyword: 'memory', args: [] },
  ]);
});

test('renders each harness capability from the harness profile', () => {
  const { text, problems } = renderText(
    [
      '{{trf: delegate general-purpose brief}}:',
      'Use {{trf: delegate recs-code-reviewer sentence}}, fill',
      '{{trf: delegate recs-code-reviewer brief}}:',
      'Create {{trf: memory}} and proceed',
      'Mark as {{trf: memory in-progress}} then {{trf: memory completed}}',
      'Use {{trf: load recs-b}}',
    ].join('\n'),
    profile,
    context,
  );
  assert.deepEqual(problems, []);
  assert.equal(text, [
    'Call (self):',
    'Use Call with `../recs-requesting-code-review/reviewer-role.md` first in its prompt, fill',
    'Call (general-purpose, with `../recs-requesting-code-review/reviewer-role.md` first in its prompt):',
    'Create Todo and proceed',
    'Mark as doing then done',
    'Use recs-b',
  ].join('\n'));
});

test('refuses what it cannot render', () => {
  const { problems } = renderText(
    [
      '{{trf: teleport}}',
      '{{trf: delegate general-purpose}}',
      '{{trf: delegate stranger brief}}',
      '{{trf: memory sideways}}',
      '{{trf: load recs-z}}',
      '{{trf: ask}}',
    ].join('\n'),
    profile,
    context,
  );
  assert.equal(problems.length, 6);
  assert.match(problems[0], /teleport is not a harness capability/);
  assert.match(problems[1], /delegate takes a role and a form, brief or sentence/);
  assert.match(problems[2], /stranger is not general-purpose or an agent under agents/);
  assert.match(problems[3], /memory takes nothing, in-progress or completed/);
  assert.match(problems[4], /recs-z is not a skill under skills/);
  assert.match(problems[5], /ask has no capability marker yet/);
});

test('a harness profile names every harness capability, with a status and its entries', () => {
  assert.deepEqual(checkProfile(profile), []);
  const gappy = structuredClone(profile);
  delete gappy.capabilities.restrict;
  gappy.capabilities.ask.status = 'maybe';
  delete gappy.capabilities.memory.completed;
  delete gappy.capabilities.delegate['sentence-role-file'];
  assert.deepEqual(checkProfile(gappy), [
    'test: ask has status maybe, not native, extension, prose or absent',
    'test: restrict is missing',
    'test: delegate has no sentence-role-file entry',
    'test: memory has no completed entry',
  ]);
  assert.equal(capabilities.length, 8);
});
