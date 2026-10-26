import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { identifierFromDateAndCharacters, listedUnderProposed, sameTitle } from './proposing-a-record.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, '..', 'cases', 'proposing-a-record', 'fixture');
const title = 'Store inspection times in UTC';
const today = new Date().toISOString().slice(0, 10).replaceAll('-', '');

function project(name, heading, line) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proposing-a-record-'));
  fs.cpSync(fixture, dir, { recursive: true });
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'fixture');
  fs.writeFileSync(path.join(dir, 'docs/architectural-decisions', name), `* ${heading} ${title}\n:PROPERTIES:\n:STATUS: Proposed\n:END:\n`);
  fs.appendFileSync(path.join(dir, 'docs/architectural-decisions.org'), `\n* Proposed\n${line}\n`);
  return dir;
}

const dirs = [];
function context(...args) {
  const dir = project(...args);
  dirs.push(dir);
  return { providerResponse: { metadata: { workingDir: dir } } };
}
test.after(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

const dated = (chars = 'kzx5') => {
  const id = `ADR-${today}-${chars}`;
  return [`adr-${today}-${chars}-store-inspection-times-in-utc.org`, id, `- ${id} :: [[./architectural-decisions/adr-${today}-${chars}-store-inspection-times-in-utc.org][${title}]]`];
};

test('a record identified by the day it was drafted and four characters passes', () => {
  const c = context(...dated());
  assert.equal(identifierFromDateAndCharacters('', c).pass, true);
  assert.equal(listedUnderProposed('', c).pass, true);
  assert.equal(sameTitle('', c).pass, true);
});

test('a record given the next number fails', () => {
  const c = context('adr-4-store-inspection-times-in-utc.org', 'ADR-4', `- ADR-4 :: [[./architectural-decisions/adr-4-store-inspection-times-in-utc.org][${title}]]`);
  assert.equal(identifierFromDateAndCharacters('', c).pass, false);
});

test('a record dated another day fails', () => {
  const name = 'adr-20200101-kzx5-store-inspection-times-in-utc.org';
  const c = context(name, 'ADR-20200101-kzx5', `- ADR-20200101-kzx5 :: [[./architectural-decisions/${name}][${title}]]`);
  assert.equal(identifierFromDateAndCharacters('', c).pass, false);
});

test('characters outside lowercase Crockford base32 fail', () => {
  assert.equal(identifierFromDateAndCharacters('', context(...dated('kzil'))).pass, false);
  assert.equal(identifierFromDateAndCharacters('', context(...dated('KZX5'))).pass, false);
});

test('a heading that does not carry the file\'s identifier fails', () => {
  const [name, , line] = dated();
  assert.equal(identifierFromDateAndCharacters('', context(name, `ADR-${today}-aaaa`, line)).pass, false);
});
