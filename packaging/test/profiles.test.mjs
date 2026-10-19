import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProfile } from '../markers.mjs';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'profiles');

for (const harness of ['claude', 'codex', 'pi', 'agy']) {
  test(`the ${harness} harness profile is complete`, () => {
    const profile = JSON.parse(fs.readFileSync(path.join(dir, `${harness}.json`), 'utf8'));
    assert.equal(profile.harness, harness);
    assert.deepEqual(checkProfile(profile), []);
    for (const key of ['name', 'contents', 'install', 'agents', 'files']) assert.ok(profile[key], `no ${key}`);
    assert.ok(!JSON.stringify(profile.capabilities).includes('\\'), 'no entry holds a double quote or a backslash, which break a Graphviz label');
  });
}
