import test from 'node:test';
import assert from 'node:assert/strict';
import { caseProblem, initProblem, recsAgents, runError, said, skillCalls } from './claude.js';

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
  agents: ['claude', 'Explore', 'general-purpose', 'Plan', 'recs-code-reviewer', 'statusline-setup'],
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

test('initProblem accepts a run offering every expected agent', () => {
  assert.equal(initProblem([init()], ['recs-brainstorming'], ['recs-code-reviewer']), undefined);
});

test('initProblem reports an expected agent the run does not offer', () => {
  assert.match(initProblem([init({ agents: ['claude'] })], ['recs-brainstorming'], ['recs-code-reviewer']), /does not offer agent recs-code-reviewer/);
});

test('initProblem reports a without-skills run that offers a recs agent', () => {
  assert.match(initProblem([init({ skills: ['deep-research'] })], [], []), /without the skills offers agent recs-code-reviewer/);
});

test('recsAgents names the agents the with-skills arm copies', () => {
  assert.deepEqual(recsAgents(), ['recs-code-reviewer']);
});

test('caseProblem accepts a case with a fixture', () => {
  assert.equal(caseProblem('citing-records-to-the-record-keeper'), undefined);
});

test('caseProblem reports a missing or unknown case', () => {
  assert.match(caseProblem(undefined), /no case named undefined/);
  assert.match(caseProblem('no-such-case'), /no case named no-such-case/);
});

test('runError reports a timed-out run', () => {
  assert.equal(runError({ code: null, signal: 'SIGKILL', stderr: '', timedOut: true }, undefined, 5000), 'claude timed out after 5000 ms');
});

test('runError reports a failed result event\'s text', () => {
  assert.equal(runError({ code: 1, signal: null, stderr: '' }, { type: 'result', is_error: true, result: 'nope' }, 5000), 'nope');
});

test('runError reports a run that could not start', () => {
  assert.match(runError({ code: null, signal: null, stderr: 'spawn bwrap ENOENT' }, undefined, 5000), /claude exited null: spawn bwrap ENOENT/);
});

test('runError reports nothing for a successful run', () => {
  assert.equal(runError({ code: 0, signal: null, stderr: '' }, { type: 'result', is_error: false, result: 'done' }, 5000), undefined);
});
