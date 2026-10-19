import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkFlow } from '../flow.mjs';
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
  fs.writeFileSync(path.join(from, 'skills', 'skill-flow.dot'), 'digraph skill_flow {\n  "recs-a";\n}\n');
  return from;
};

test('refuses a render with a marker it cannot render, and leaves no package', (t) => {
  const from = fixture(t);
  const out = path.join(temp(t, 'render-refused-'), 'out');
  assert.throws(() => render('claude', out, 'v1.2.3', { root: from }), (e) =>
    /rendering refused/.test(e.message) && /teleport is not a harness capability/.test(e.message));
  assert.ok(!fs.existsSync(out), 'the refused render leaves no output directory');
});

test('refuses an output inside the source, and deletes nothing', (t) => {
  const from = fixture(t);
  assert.throws(() => render('claude', path.join(from, 'packaging'), 'v1.2.3', { root: from }), /holds the source/);
  assert.ok(fs.existsSync(path.join(from, 'packaging', 'profiles')), 'the source survives the refused render');
});

// ADR-11 §Consequences: Keep the order of the skills in a skill flow beside them
test('the skill flow matches the skills and the records', () => {
  assert.deepEqual(checkFlow(root), []);
});

// ADR-2 §Consequences: The recs files live apart from any project that uses them
test('a rendered skill flow carries no citations', (t) => {
  const out = render('pi', temp(t, 'render-flow-'), 'v1.2.3');
  const flow = fs.readFileSync(path.join(out, 'skills', 'skill-flow.dot'), 'utf8');
  assert.ok(flow.includes('kind="load"'));
  assert.ok(!flow.includes('cite='));
});
