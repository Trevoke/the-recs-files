import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProfile, memoryFile } from '../markers.mjs';
import { harnesses } from '../render.mjs';
import { memoryPath } from '../../evals/checks/harness-capabilities.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'profiles');

for (const harness of harnesses) {
  test(`the ${harness} harness profile is complete`, () => {
    const profile = JSON.parse(fs.readFileSync(path.join(dir, `${harness}.json`), 'utf8'));
    assert.equal(profile.harness, harness);
    assert.deepEqual(checkProfile(profile), []);
    for (const key of ['name', 'contents', 'install', 'agents', 'files']) assert.ok(profile[key], `no ${key}`);
    if ('installUser' in profile) assert.ok(Array.isArray(profile.installUser) && profile.installUser.length > 0, 'installUser, where present, lists at least one line');
    assert.ok(!JSON.stringify(profile.capabilities).includes('\\'), 'no entry holds a double quote or a backslash');
  });
}

test('the eval memory file check matches the pi harness profile\'s memory file', () => {
  const profile = JSON.parse(fs.readFileSync(path.join(dir, 'pi.json'), 'utf8'));
  assert.ok(memoryPath.test(memoryFile(profile).replace(/<[^>]*>/g, 'project')), 'the pi memory file, for a project, matches the check');
});
