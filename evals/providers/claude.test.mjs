import test from 'node:test';
import assert from 'node:assert/strict';
import { caseProblem, initProblem, runError, said, skillCalls, taskToolsMissing } from './claude.js';

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

test('taskToolsMissing names TaskCreate and TaskUpdate where the init event\'s tools lack them', () => {
  assert.deepEqual(taskToolsMissing(init({ tools: ['Task', 'TaskCreate', 'TaskGet', 'TaskList', 'TaskStop', 'TaskUpdate'] })), []);
  assert.deepEqual(taskToolsMissing(init({ tools: ['Task', 'TaskStop'] })), ['TaskCreate', 'TaskUpdate']);
  assert.deepEqual(taskToolsMissing(init({ tools: ['Task', 'TaskCreate'] })), ['TaskUpdate']);
  assert.deepEqual(taskToolsMissing(init()), ['TaskCreate', 'TaskUpdate']);
});

test('said joins the main agent\'s text and leaves out a subagent\'s', () => {
  assert.equal(said([words('first'), words('hidden', 't'), words('second')]), 'first\n\nsecond');
});

test('initProblem reports a without-skills run that offers a recs skill', () => {
  assert.match(initProblem([init()], undefined), /without the skills offers recs-files:recs-writing-records/);
});

test('initProblem reports a without-skills run that offers a recs agent', () => {
  assert.match(initProblem([init({ skills: ['deep-research'], agents: ['claude', 'recs-files:recs-code-reviewer'] })], undefined), /without the skills offers agent recs-files:recs-code-reviewer/);
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

test('the provider id names its arm first', async () => {
  const { default: Provider } = await import('./claude.js');
  assert.equal(new Provider({ config: { model: 'claude-sonnet-5-5', skills: true } }).id(), 'with-skills:claude-code:claude-sonnet-5-5');
  assert.equal(new Provider({ config: { model: 'claude-sonnet-5-5', skills: false } }).id(), 'without-skills:claude-code:claude-sonnet-5-5');
});
