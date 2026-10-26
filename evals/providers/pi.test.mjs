import test from 'node:test';
import assert from 'node:assert/strict';
import Provider from './pi.js';

test('the provider id names its arm first', () => {
  assert.equal(new Provider({ config: { model: 'openrouter/openai/gpt-5.5', skills: true } }).id(), 'with-skills:pi:openrouter/openai/gpt-5.5');
  assert.equal(new Provider({ config: { model: 'openrouter/openai/gpt-5.5', skills: false } }).id(), 'without-skills:pi:openrouter/openai/gpt-5.5');
});
