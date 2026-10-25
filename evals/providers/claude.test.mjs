import test from 'node:test';
import assert from 'node:assert/strict';
import { initProblem, said, skillCalls } from './claude.js';

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
const words = (text, parent = null) => ({
  type: 'assistant',
  message: { role: 'assistant', content: [{ type: 'text', text }] },
  parent_tool_use_id: parent,
});
const init = (over = {}) => ({
  type: 'system',
  subtype: 'init',
  permissionMode: 'bypassPermissions',
  skills: ['deep-research', 'recs-brainstorming', 'recs-writing-records'],
  ...over,
});

test('skillCalls reports the main agent\'s Skill tool uses, with their outcome', () => {
  assert.deepEqual(
    skillCalls([use('a', 'Skill', { skill: 'recs-brainstorming' }), answer('a'), use('b', 'Skill', { skill: 'recs-kickstart' })]),
    [{ name: 'recs-brainstorming', is_error: false }, { name: 'recs-kickstart', is_error: true }],
  );
});

test('skillCalls leaves out a subagent\'s Skill tool uses', () => {
  assert.deepEqual(skillCalls([use('s', 'Skill', { skill: 'recs-brainstorming' }, 't'), answer('s', false, 't')]), []);
});

test('said joins the main agent\'s text and leaves out a subagent\'s', () => {
  assert.equal(said([words('first'), words('hidden', 't'), words('second')]), 'first\n\nsecond');
});

test('initProblem accepts a run offering every expected skill, bypassing permissions', () => {
  assert.equal(initProblem([init()], ['recs-brainstorming', 'recs-writing-records']), undefined);
});

test('initProblem reports an expected skill the run does not offer', () => {
  assert.match(initProblem([init()], ['recs-kickstart']), /does not offer recs-kickstart/);
});

test('initProblem reports a without-skills run that offers a recs skill', () => {
  assert.match(initProblem([init()], []), /without the skills offers recs-brainstorming/);
});

test('initProblem reports a run not bypassing permissions', () => {
  assert.match(initProblem([init({ permissionMode: 'default' })], ['recs-brainstorming']), /permission mode default/);
});

test('initProblem reports a run with no init event', () => {
  assert.match(initProblem([], []), /no init event/);
});
