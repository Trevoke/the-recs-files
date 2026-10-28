import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { againByCitationOrTitle, exactTitles, noSectionsOfARecordNotOnDisk, sectionsFirstCited, quotesInCodeBlocks, sectionBeforeTitle, sectionsInOneCitation, sectionsInRecordOrder, sectionsListedUnder } from './citing-records.js';

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
const run = (fn) => (said) => fn('', { providerResponse: { metadata: { workingDir, said } } });
const check = run(sectionBeforeTitle);
const oneCitation = run(sectionsInOneCitation);
const listed = run(sectionsListedUnder);

test.after(() => fs.rmSync(workingDir, { recursive: true, force: true }));

test('a citation referring to one section passes', () => {
  assert.equal(check(`See \`F-1 §2: ${whole}\`.`).pass, true);
});

test('a citation referring to two sections passes', () => {
  assert.equal(check(`See \`F-1 §2, §3: ${whole}\`.`).pass, true);
});

test('a section after the title fails', () => {
  assert.equal(check(`See \`F-1: ${whole}\` §2.`).pass, false);
});

test('two citations referring to one section each pass', () => {
  assert.equal(check(`See \`F-1 §2: ${whole}\` and \`F-1 §3: ${whole}\`.`).pass, true);
});

test('a projection line with a dated identifier gives its title', async () => {
  const { projectionTitles } = await import('./citing-records.js');
  const text = '- ADR-20261015-70tz :: [[./architectural-decisions/adr-20261015-70tz-a-record-change-is-one-commit-of-its-own.org][A record change is one commit of its own]]\n';
  assert.deepEqual([...projectionTitles(text)], [['ADR-20261015-70tz', 'A record change is one commit of its own']]);
});

test('one citation referring to a record\'s sections passes', () => {
  assert.equal(oneCitation(`The refusals are \`F-1 §2, §3: ${whole}\`.`).pass, true);
});

test('two citations of one record\'s sections in one sentence fail', () => {
  const r = oneCitation(`The refusals are \`F-1 §2: ${whole}\` and \`F-1 §3: ${whole}\`.`);
  assert.equal(r.pass, false);
  assert.match(r.reason, /F-1/);
});

test('citations of one record\'s sections in two sentences pass', () => {
  assert.equal(oneCitation(`\`F-1 §2: ${whole}\` holds. Later, \`F-1 §3: ${whole}\` changes.`).pass, true);
});

test('sections listed on lines under their citation pass', () => {
  const said = `\`F-1 §2, §3: ${whole}\` refuse a renewal:\n- §2: of a reserved book\n- §3: past the limit\n`;
  assert.equal(listed(said).pass, true);
});

test('a section cited with its line beneath passes', () => {
  assert.equal(listed(`\`F-1 §2: ${whole}\`\n- §2: refuses a renewal of a reserved book\n\nThe ledger change doesn't touch it.`).pass, true);
});

test('a section cited with no line beneath fails', () => {
  const r = listed(`See \`F-1 §2: ${whole}\`.`);
  assert.equal(r.pass, false);
  assert.match(r.reason, /^1 citations .*\(§2\)/);
});

test('a section cited with its quote beneath passes', () => {
  assert.equal(listed(`\`F-1 §2: ${whole}\` reads:\n\`\`\`\n2. If the book is reserved, then the library shall refuse the renewal.\n\`\`\`\n`).pass, true);
});

test('a section line set apart from its citation by a blank line fails', () => {
  assert.equal(listed(`\`F-1 §2: ${whole}\`\n\n- §2: refuses a renewal of a reserved book\n`).pass, false);
});

test('a quote set apart from its citation by a blank line fails', () => {
  assert.equal(listed(`\`F-1 §2: ${whole}\` reads:\n\n\`\`\`\n2. If the book is reserved, then the library shall refuse the renewal.\n\`\`\`\n`).pass, false);
});

test('one of two sections without its line fails', () => {
  const r = listed(`\`F-1 §2, §3: ${whole}\`:\n- §2: refuses a reserved book\n`);
  assert.equal(r.pass, false);
  assert.match(r.reason, /\(§3\)/);
});

test('what a section says on the citation\'s own line fails', () => {
  assert.equal(listed(`\`F-1 §2, §3: ${whole}\`: §2 refuses a reserved book, §3 refuses past the limit.`).pass, false);
});

test('a section referred to again after its line needs none', () => {
  assert.equal(listed(`\`F-1 §2: ${whole}\`\n- §2: refuses a reserved book\n\nThe code already enforces \`${whole} §2\`.`).pass, true);
});

test('a section listed under a citation of the whole record fails', () => {
  const r = listed(`\`F-1: ${whole}\`\n- §2: refuses a reserved book\n`);
  assert.equal(r.pass, false);
  assert.match(r.reason, /§2/);
});

test('a section listed under a citation that carries it passes', () => {
  assert.equal(listed(`\`F-1 §2: ${whole}\` and \`MSG-1: A reserved book cannot be renewed\`\n- §2: refuses a reserved book\n`).pass, true);
});

test('a record cited whole needs no line', () => {
  assert.equal(listed(`\`F-1: ${whole}\` gets a successor.`).pass, true);
});

test('what is said of sections in prose after their lines passes', () => {
  const said = `\`F-1 §1, §2: ${whole}\`:\n- §1: sets the due date\n- §2: refuses a reserved book\n\nThe successor carries §1 over and makes §2 two requirements.`;
  assert.equal(listed(said).pass, true);
});

test('a section map listed under its citation passes', () => {
  const said = `\`F-1 §1, §2: ${whole}\` maps to its successor:\n- §1 → §1\n- §2 → §2, §3\n`;
  assert.equal(listed(said).pass, true);
});

test('a section listed under no citation fails', () => {
  assert.equal(listed(`\`F-1: ${whole}\` bears.\n\nThe refusals:\n- §2: of a reserved book\n`).pass, false);
});

test('a listed section that cites another record passes', () => {
  const said = `\`F-1 §2: ${whole}\` refuses:\n- §2: the book is reserved, with \`MSG-1: A reserved book cannot be renewed\`\n`;
  assert.equal(listed(said).pass, true);
});

test('a section line nested under the list item that cites its record passes', () => {
  const said = `1. \`F-1 §1, §2: ${whole}\` bears\n   - §1: sets the due date\n   - §2: refuses a reserved book\n2. \`MSG-1: A reserved book cannot be renewed\` stands\n`;
  assert.equal(listed(said).pass, true);
});

test('a sibling item\'s section lines do not count for an earlier item', () => {
  const said = `- \`F-1 §1: ${whole}\` bears\n- \`F-2 §1: A returned copy is held for the borrower who reserved it\` bears\n  - §1: holds a copy\n`;
  assert.equal(listed(said).pass, false);
});

test('sections listed under a record not yet on disk pass', () => {
  const said = `\`F-1: ${whole}\` gets a successor.\n\n**Proposed F-9 requirements:**\n- §1: when a borrower renews a loan\n`;
  assert.equal(listed(said).pass, true);
});

test('a section line under a sibling item that cites nothing fails', () => {
  const said = `\`F-1: ${whole}\` gets a successor.\n\nWhat changes:\n- the title\n- §2: the refusal\n`;
  assert.equal(listed(said).pass, false);
});

test('a listed section set in bold passes', () => {
  const said = `\`F-1 §2, §3: ${whole}\`:\n- **§2:** the book is reserved\n- *§3*: past the limit\n`;
  assert.equal(listed(said).pass, true);
});

const ordered = run(sectionsInRecordOrder);
const onDisk = run(noSectionsOfARecordNotOnDisk);
const quoted = run(quotesInCodeBlocks);

test('sections in the record\'s order pass', () => {
  assert.equal(ordered(`\`F-1 §1, §3: ${whole}\` hold.`).pass, true);
});

test('sections out of the record\'s order fail', () => {
  const r = ordered(`\`F-1 §3, §1: ${whole}\` hold.`);
  assert.equal(r.pass, false);
  assert.match(r.reason, /§3, §1/);
});

test('a range of sections fails', () => {
  assert.equal(ordered(`\`F-1 §1–§3: ${whole}\` hold.`).pass, false);
  assert.equal(ordered(`\`F-1 §1-3: ${whole}\` hold.`).pass, false);
});

test('a workflow step before its extension passes, and after it fails', () => {
  const title = 'Renew a loan before its due date';
  assert.equal(ordered(`\`UW-1 §2, §2a: ${title}\` apply.`).pass, true);
  assert.equal(ordered(`\`UW-1 §2a, §2: ${title}\` apply.`).pass, false);
});

test('sections referred to in the Nygard order pass, and out of it fail', () => {
  const title = 'Keep loans as an append-only ledger of loan events';
  assert.equal(ordered(`\`ADR-1 §Context, §Decision: ${title}\` say so.`).pass, true);
  assert.equal(ordered(`\`ADR-1 §Consequences, §Context: ${title}\` say so.`).pass, false);
});

test('a section of a record on disk passes', () => {
  assert.equal(onDisk(`\`F-1 §2: ${whole}\` refuses it.`).pass, true);
});

test('a section of a record not on disk fails', () => {
  const r = onDisk(`\`F-1: ${whole}\` gets a successor, and \`F-3 §3: Renewals are limited\` refuses past the limit.`);
  assert.equal(r.pass, false);
  assert.match(r.reason, /F-3 §3/);
});

test('a record not on disk referred to without a section passes', () => {
  assert.equal(onDisk(`\`F-1: ${whole}\` gets a successor, F-3.`).pass, true);
});

test('a requirement quoted in a code block passes', () => {
  const said = `\`F-1 §2: ${whole}\` reads:\n\n\`\`\`\n2. If the book is reserved, then the library shall refuse the renewal with\n   [[../message-catalog/msg-1-a-reserved-book-cannot-be-renewed.org][MSG-1: A reserved book cannot be renewed]].\n\`\`\`\n`;
  assert.equal(quoted(said).pass, true);
});

test('a requirement quoted inline fails', () => {
  const r = quoted(`\`F-1 §2: ${whole}\` reads: "If the book is reserved, then the library shall refuse the renewal."`);
  assert.equal(r.pass, false);
  assert.match(r.reason, /shall refuse/);
});

test('a requirement quoted in a blockquote fails', () => {
  assert.equal(quoted(`\`F-1 §2: ${whole}\` reads:\n\n> If the book is reserved, then the library shall refuse the renewal.\n`).pass, false);
});

test('a property line holding a link, quoted inline, fails', () => {
  assert.equal(quoted(`The successor carries \`:SUPERSEDES: [[./f-1-x.org][F-1: ${whole}]]\`.`).pass, false);
});

test('a property value named inline passes', () => {
  assert.equal(quoted(`I'll write it as \`:STATUS: Proposed\` and commit it alone.`).pass, true);
  assert.equal(quoted(`\`F-1: ${whole}\` carries \`:STATUS: Accepted\`.`).pass, true);
});

test('an org link outside a code block fails', () => {
  assert.equal(quoted(`It cites [[../message-catalog/msg-1-a-reserved-book-cannot-be-renewed.org][MSG-1: A reserved book cannot be renewed]].`).pass, false);
});

test('a reply that quotes nothing passes', () => {
  assert.equal(quoted(`\`F-1 §2: ${whole}\` refuses a renewal of a reserved book.`).pass, true);
});

test('wording drafted for a record not on disk, in quotes, passes', () => {
  assert.equal(quoted(`A successor would add: "When the library releases a held copy, the library shall tell the borrower it was held for."`).pass, true);
});

test('a property named without its value passes', () => {
  assert.equal(quoted(`The successor's \`:SUPERSEDES:\` names \`F-1: ${whole}\`.`).pass, true);
});

const titles = run(exactTitles);

test('a record referred to by its identifier after the reply cited it in full passes', () => {
  assert.equal(titles(`\`F-1: ${whole}\` gets a successor.\n\nThe code misses \`F-1 §3\`, and \`F-1\` stays until then.`).pass, true);
});

test('a record referred to by its identifier before the reply cites it fails', () => {
  const r = titles(`The code misses \`F-1 §3\`.\n\n\`F-1: ${whole}\` gets a successor.`);
  assert.equal(r.pass, false);
  assert.match(r.reason, /^1 of 2 citations/);
});

test('an identifier after a full citation of another record fails', () => {
  assert.equal(titles(`\`MSG-1: A reserved book cannot be renewed\` stands, and \`F-1\` changes.`).pass, false);
});

test('a phrase of a record quoted inline fails', () => {
  assert.equal(quoted(`\`UL-3: Loan period\` is "set by the library", like the limit would be.`).pass, false);
});

test('a single word in quotes passes', () => {
  assert.equal(quoted(`\`UL-2: Reservation\` defines "reservation" and never "reserved".`).pass, true);
});

test('a record first referred to by its title fails', () => {
  const r = titles(`\`${whole}\` gets a successor.\n\n\`F-1: ${whole}\` stays until then.`);
  assert.equal(r.pass, false);
  assert.match(r.reason, new RegExp(whole));
});

const again = run(againByCitationOrTitle);

test('a record referred to again by its title passes', () => {
  assert.equal(again(`\`F-1: ${whole}\` gets a successor; \`${whole}\` stays until then.`).pass, true);
});

test('a record referred to again by its identifier fails', () => {
  const r = again(`\`F-1: ${whole}\` gets a successor; \`F-1\` stays until then.`);
  assert.equal(r.pass, false);
  assert.match(r.reason, /^1 of 2 citations/);
});

test('a section referred to again by its identifier fails', () => {
  assert.equal(again(`\`F-1 §2: ${whole}\`\n- §2: refuses a reserved book\n\nThe code enforces \`F-1 §2\`.`).pass, false);
});

test('a section referred to again by its record\'s title and the section passes', () => {
  assert.equal(again(`\`F-1 §2: ${whole}\`\n- §2: refuses a reserved book\n\nThe code enforces \`${whole} §2\`.`).pass, true);
});

const firstCited = run(sectionsFirstCited);

test('a section first referred to by its record\'s title and the section fails', () => {
  const r = firstCited(`\`F-1: ${whole}\` gets a successor, and \`${whole} §3\` changes.`);
  assert.equal(r.pass, false);
  assert.match(r.reason, /^1 references /);
});

test('a section referred to by title and section after its citation passes', () => {
  assert.equal(firstCited(`\`F-1 §3: ${whole}\`\n- §3: refuses a renewal past the limit\n\n\`${whole} §3\` changes.`).pass, true);
});
