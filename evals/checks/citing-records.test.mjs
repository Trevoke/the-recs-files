import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sectionBeforeTitle } from './citing-records.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, '..', 'cases', 'citing-records-to-the-record-keeper', 'fixture');
const whole = 'A borrower renews a loan for one more loan period unless the book is reserved';

function project() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'citing-records-'));
  fs.cpSync(fixture, dir, { recursive: true });
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'fixture');
  return dir;
}

const workingDir = project();
const check = (said) => sectionBeforeTitle('', { providerResponse: { metadata: { workingDir, said } } });

test.after(() => fs.rmSync(workingDir, { recursive: true, force: true }));

test('a citation naming one section passes', () => {
  assert.equal(check(`See \`F-1 §2: ${whole}\`.`).pass, true);
});

test('a citation naming two sections fails', () => {
  const r = check(`See \`F-1 §2, §3: ${whole}\`.`);
  assert.equal(r.pass, false);
  assert.match(r.reason, /or name more than one/);
});

test('two citations naming one section each pass', () => {
  assert.equal(check(`See \`F-1 §2: ${whole}\` and \`F-1 §3: ${whole}\`.`).pass, true);
});
