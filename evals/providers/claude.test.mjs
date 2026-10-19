import test from 'node:test';
import assert from 'node:assert/strict';
import { initProblem, skillCalls } from './claude.js';

const use = (id, name, input, parent = null) => ({
  type: 'assistant',
  message: { role: 'assistant', content: [{ type: 'tool_use', id, name, input }] },
  parent_tool_use_id: parent,
});
const answer = (id, isError = false, parent = null) => ({
  type: 'user',
  message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: 'ok', is_error: isError }] },
  parent_tool_use_id: parent,
});
const init = (over = {}) => ({
  type: 'system',
  subtype: 'init',
  permissionMode: 'bypassPermissions',
  skills: ['deep-research', 'recs-files:recs-writing-records'],
  ...over,
});

test('skillCalls reports the main agent\'s Skill tool uses, with their outcome', () => {
  const calls = skillCalls([
    use('a', 'Skill', { skill: 'recs-files:recs-writing-records' }), answer('a'),
    use('b', 'Skill', { skill: 'recs-files:recs-kickstart' }), answer('b', true),
    use('c', 'Skill', { skill: 'recs-files:recs-brainstorming' }),
  ]);
  assert.deepEqual(calls, [
    { name: 'recs-files:recs-writing-records', is_error: false },
    { name: 'recs-files:recs-kickstart', is_error: true },
    { name: 'recs-files:recs-brainstorming', is_error: true },
  ]);
});

test('skillCalls leaves out a subagent\'s Skill tool uses', () => {
  const calls = skillCalls([
    use('t', 'Task', { subagent_type: 'general-purpose', prompt: 'p', description: 'd' }),
    use('s', 'Skill', { skill: 'recs-files:recs-writing-records' }, 't'), answer('s', false, 't'),
    answer('t'),
  ]);
  assert.deepEqual(calls, []);
});

test('initProblem accepts a with-skills run that loaded the plugin\'s skills, bypassing permissions', () => {
  assert.equal(initProblem([init()], 'recs-files'), undefined);
});

test('initProblem accepts a without-skills run with no plugin skills', () => {
  assert.equal(initProblem([init({ skills: ['deep-research'] })], undefined), undefined);
});

test('initProblem reports a with-skills run whose init lists no plugin skill', () => {
  assert.match(initProblem([init({ skills: ['deep-research'] })], 'recs-files'), /no recs-files: skill/);
});

test('initProblem reports a run not bypassing permissions', () => {
  assert.match(initProblem([init({ permissionMode: 'default' })], 'recs-files'), /permission mode default/);
});

test('initProblem reports a run with no init event', () => {
  assert.match(initProblem([], undefined), /no init event/);
});
