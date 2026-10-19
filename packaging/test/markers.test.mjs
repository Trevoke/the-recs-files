import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markers, renderText, checkProfile, capabilities, checkMemoryFile, memoryFile } from '../markers.mjs';

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

test('renders delegate, memory and load from the harness profile', () => {
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
  assert.match(problems[5], /ask is not rendered by a capability marker/);
});

test('refuses a marker its harness profile or context cannot carry', () => {
  assert.match(renderText('{{trf: load}}', profile, context).problems[0], /load takes one skill/);
  const noLoad = structuredClone(profile);
  delete noLoad.capabilities.load;
  assert.match(renderText('{{trf: load recs-b}}', noLoad, context).problems[0], /the test harness profile has no load/);
  const unknownRole = { ...context, roles: [...context.roles, 'recs-planner'] };
  assert.match(renderText('{{trf: delegate recs-planner brief}}', profile, unknownRole).problems[0], /does not say how it carries recs-planner/);
  const noList = structuredClone(profile);
  delete noList.capabilities.memory.list;
  assert.match(renderText('{{trf: memory}}', noList, context).problems[0], /has no entry for it/);
  const noRoleFile = { ...context, roleFile: undefined };
  assert.match(renderText('{{trf: delegate recs-code-reviewer brief}}', profile, noRoleFile).problems[0], /recs-code-reviewer needs a role file and none was given/);
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
  const misdeclared = structuredClone(profile);
  misdeclared.capabilities.delegate.roles['recs-code-reviewer'] = 'carrier pigeon';
  assert.deepEqual(checkProfile(misdeclared), [
    'test: delegate carries recs-code-reviewer as carrier pigeon, not native or role file',
  ]);
  assert.equal(capabilities.length, 8);
});

test('a harness profile\'s requirements and installUser, where present, are non-empty lists of strings', () => {
  assert.deepEqual(checkProfile({ ...profile, requirements: ['Set X.'], installUser: ['install x'] }), []);
  assert.deepEqual(checkProfile({ ...profile, requirements: [], installUser: 'install x' }), [
    'test: requirements is not a non-empty list of strings',
    'test: installUser is not a non-empty list of strings',
  ]);
  assert.deepEqual(checkProfile({ ...profile, requirements: ['Set X.', ''], installUser: [3] }), [
    'test: requirements is not a non-empty list of strings',
    'test: installUser is not a non-empty list of strings',
  ]);
});

test('a memory file kept in prose is named by an absolute path', () => {
  const prose = structuredClone(profile);
  prose.capabilities.memory = { status: 'prose', list: 'the memory file (`/tmp/m-<the project>.md`, a checklist)', 'in-progress': 'doing', completed: 'done' };
  assert.equal(memoryFile(prose), '/tmp/m-<the project>.md');
  assert.deepEqual(checkMemoryFile(prose), []);
  prose.capabilities.memory.list = 'the memory file (`notes/m.md`, a checklist)';
  assert.deepEqual(checkMemoryFile(prose), ['test: the memory file notes/m.md is not an absolute path']);
  prose.capabilities.memory.list = 'the memory file';
  assert.deepEqual(checkMemoryFile(prose), ['test: the memory file is not named by a path']);
  assert.deepEqual(checkMemoryFile(profile), []);
});
