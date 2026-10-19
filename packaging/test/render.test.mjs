import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { render } from '../render.mjs';

for (const harness of ['claude', 'codex', 'pi', 'agy']) {
  test(`renders the ${harness} package with no capability marker left`, () => {
    const out = render(harness, fs.mkdtempSync(path.join(os.tmpdir(), `render-${harness}-`)), 'v1.2.3');
    assert.ok(fs.existsSync(path.join(out, 'skills', 'recs-writing-records', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(out, '.github', 'workflows', 'release.yml')));
    const all = fs.readdirSync(out, { recursive: true }).filter((f) => fs.statSync(path.join(out, f)).isFile());
    assert.ok(all.every((f) => !fs.readFileSync(path.join(out, f), 'utf8').includes('{{trf:')));
  });
}
