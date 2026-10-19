import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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

  test(`the ${harness} package passes the package checks`, (t) => {
    const out = render(harness, temp(t, `check-${harness}-`), 'v1.2.3');
    const said = execFileSync(process.execPath, [path.join(root, 'packaging', 'check.mjs'), harness, out], { encoding: 'utf8' });
    assert.match(said, new RegExp(`^${harness}: package checks pass`));
  });
}

test('the pi package declares and carries its subagent extension', (t) => {
  const out = render('pi', temp(t, 'render-pi-extension-'), 'v1.2.3');
  const pkg = JSON.parse(fs.readFileSync(path.join(out, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.pi.extensions, ['./extensions/subagent/index.ts']);
  assert.ok(fs.existsSync(path.join(out, 'extensions', 'subagent', 'index.ts')));
});

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

test('the package checks refuse a pi package without its subagent extension', (t) => {
  const out = render('pi', temp(t, 'check-pi-refused-'), 'v1.2.3');
  fs.rmSync(path.join(out, 'extensions'), { recursive: true });
  assert.throws(
    () => execFileSync(process.execPath, [path.join(root, 'packaging', 'check.mjs'), 'pi', out], { encoding: 'utf8', stdio: 'pipe' }),
    (e) => e.status === 1 && /extensions\/subagent\/index\.ts, which is missing/.test(e.stderr),
  );
});

const checkPackage = (harness, dir) => execFileSync(process.execPath, [path.join(root, 'packaging', 'check.mjs'), harness, dir], { encoding: 'utf8', stdio: 'pipe' });

test('the package checks refuse an unknown harness with the usage line', (t) => {
  const out = temp(t, 'check-unknown-');
  assert.throws(() => checkPackage('teleport', out), (e) => e.status === 2 && /^usage: node packaging\/check\.mjs/.test(e.stderr));
});

test('the package checks report a skill without its SKILL.md as a problem', (t) => {
  const out = render('claude', temp(t, 'check-no-skill-md-'), 'v1.2.3');
  fs.rmSync(path.join(out, 'skills', 'recs-writing-records', 'SKILL.md'));
  assert.throws(() => checkPackage('claude', out), (e) => e.status === 1 && /skills\/recs-writing-records\/SKILL\.md is missing/.test(e.stderr));
});

test('the package checks report a missing release workflow as a problem', (t) => {
  const out = render('claude', temp(t, 'check-no-release-'), 'v1.2.3');
  fs.rmSync(path.join(out, '.github'), { recursive: true });
  assert.throws(() => checkPackage('claude', out), (e) => e.status === 1 && /\.github\/workflows\/release\.yml is missing/.test(e.stderr));
});

test('validate.sh refuses a missing package directory with the usage line', () => {
  assert.throws(
    () => execFileSync(path.join(root, 'packaging', 'validate.sh'), ['pi'], { encoding: 'utf8', stdio: 'pipe' }),
    (e) => e.status === 2 && /^usage: packaging\/validate\.sh/.test(e.stderr),
  );
});
