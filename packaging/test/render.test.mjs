import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { render, root } from '../render.mjs';

const temp = (t, name) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), name));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};

for (const harness of ['claude', 'codex', 'pi', 'agy']) {
  test(`renders the ${harness} package with no capability marker left`, (t) => {
    const out = render(harness, temp(t, `render-${harness}-`), 'v1.2.3');
    assert.ok(fs.existsSync(path.join(out, 'skills', 'recs-writing-records', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(out, '.github', 'workflows', 'release.yml')));
    const all = fs.readdirSync(out, { recursive: true }).filter((f) => fs.statSync(path.join(out, f)).isFile());
    assert.ok(all.every((f) => !fs.readFileSync(path.join(out, f), 'utf8').includes('{{trf:')));
  });
}

const fixture = (t) => {
  const from = temp(t, 'render-fixture-');
  for (const p of ['packaging/profiles', 'packaging/templates', 'agents', 'LICENSE', 'CHANGELOG.md']) {
    fs.cpSync(path.join(root, p), path.join(from, p), { recursive: true });
  }
  fs.mkdirSync(path.join(from, 'skills', 'recs-a'), { recursive: true });
  fs.writeFileSync(path.join(from, 'skills', 'recs-a', 'SKILL.md'), '{{trf: teleport}}\n');
  return from;
};

test('refuses a render with a marker it cannot render, and leaves no package', (t) => {
  const from = fixture(t);
  const out = path.join(temp(t, 'render-refused-'), 'out');
  assert.throws(() => render('claude', out, 'v1.2.3', { root: from }), /rendering refused/);
  assert.ok(!fs.existsSync(out), 'the refused render leaves no output directory');
});

test('refuses an output inside the source, and deletes nothing', (t) => {
  const from = fixture(t);
  assert.throws(() => render('claude', path.join(from, 'packaging'), 'v1.2.3', { root: from }), /holds the source/);
  assert.ok(fs.existsSync(path.join(from, 'packaging', 'profiles')), 'the source survives the refused render');
});
