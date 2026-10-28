import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { result, workingDir } from './workspace.js';

const repoDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function repoRecord(category, id) {
  const dir = path.join(repoDir, 'docs', category);
  const file = fs.readdirSync(dir).find((f) => f.startsWith(`${id.toLowerCase()}-`));
  return fs.readFileSync(path.join(dir, file), 'utf8');
}

function git(dir, ...args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
}

function projectRecords(context) {
  const dir = workingDir(context);
  const root = git(dir, 'rev-list', '--max-parents=0', 'HEAD').trim();
  return git(dir, 'ls-tree', '-r', '--name-only', root, 'docs')
    .split('\n')
    .filter((f) => f.endsWith('.org'))
    .map((f) => `=== ${f}\n${git(dir, 'show', `${root}:${f}`)}`)
    .join('\n');
}

const schema = {
  type: 'object',
  properties: {
    faults: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          section: { type: 'string', enum: ['UW-20261028-838j §1', 'UW-20261028-838j §5', 'F-20261028-1mkt §1', 'F-20261028-1mkt §4', 'F-20261028-1mkt §6', 'F-20261028-1mkt §9', 'F-20261028-1mkt §10'] },
          passage: { type: 'string' },
          why: { type: 'string' },
        },
        required: ['section', 'passage', 'why'],
      },
    },
  },
  required: ['faults'],
};

export function judgePrompt(reply, records) {
  return `You grade one reply that an agent gave to the record keeper of a project. The project keeps records as its source of truth, and two of its records say how the agent should speak to the record keeper: a user workflow, which says what the record keeper needs and why, and a feature, which says how the agent cites records. Read both, the terms they use, the project's records the agent could read, then the reply.

# The user workflow

${repoRecord('user-workflows', 'UW-20261028-838j')}
# The feature

${repoRecord('features', 'F-20261028-1mkt')}
# The terms they use

${['UL-20261028-tk52', 'UL-20261028-wm45', 'UL-20261028-chtt', 'UL-20261015-aycy', 'UL-20261027-1z2h'].map((id) => repoRecord('ubiquitous-language', id)).join('\n')}
# The project's records, as the agent found them

${records}
# The reply

<reply>
${reply}
</reply>

# What to judge

The intent behind both records: when the agent brings the record keeper a situation, it gives and bounds the context, by citing the records and sections the situation rests on, and shows the situation concretely, so the record keeper answers from their own records without working out what the agent means.

Scripts already read every reference by an identifier (\`F-1\`, \`F-1 §2\`), every title in backticks, backticks, line breaks, the order of sections, where a list item sits, and text in quote marks. Judge only what needs the meaning of the words. Report a fault, under the section it breaks, for each of these:
- UW-20261028-838j §1: the reply brings the record keeper a situation to decide, or answers their question about one, and does not start from the user workflow the situation is in (or each, where it is in more than one) with the step or extension that applies, where a user workflow holds it. A situation about what a word means is in no user workflow (extension 1a): a reply about a word needs none. Quote the reply's opening.
- UW-20261028-838j §5: the reply raises something (a situation to decide, a gap, a question, a choice) and gives no example of it, a concrete case that shows what it is about. Options, a summary of the records, or a restatement of the gap are not an example. Quote what the reply raises.
- F-20261028-1mkt §1: the reply refers to a particular record by a description or a paraphrase of its title ("the two features", "the decision", "the renewal workflow") before it has cited that record.
- F-20261028-1mkt §4: the reply refers to a particular section by a description or its number in words ("step 3", "the third requirement", "extension 2a") before a citation in the reply has carried it.
- F-20261028-1mkt §6: a list item "§N: …" under a citation says something section N of that record does not say, or nothing of what it says.
- F-20261028-1mkt §9: the reply gives section numbers to a record that is not among the project's records.
- F-20261028-1mkt §10: the reply presents text as a record's own words and the text differs from what the record's file holds.

These hold, and are no fault: a description of a record or section after the reply has cited it; a mention of a projection or a category ("the message catalog", "the features"); counting or summing up a record's sections ("it has two refusals"); a record's wording used in the reply's own sentences; the vision, referred to as the vision; a record the agent proposes, not on disk, referred to by what it says; a word for the thing a record defines ("the loan", "a reservation"), which refers to no record. A reply that only gives the record keeper what they asked for, and raises nothing, needs no workflow and no example.

For each fault, copy the passage from the reply character for character, as short as shows the fault, and say in one sentence why it breaks that section. A reply with no fault gets an empty list.`;
}

// docs/knowledge-base/claude-code-as-an-eval-harness.org: A print run with no tools and a JSON schema returns its answer as `structured_output`
function ask(prompt, timeoutMs = 300000) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'recs-judge-'));
  const args = ['-p', '--model', 'claude-opus-5-5', '--tools', '', '--setting-sources', '', '--no-session-persistence',
    '--output-format', 'json', '--json-schema', JSON.stringify(schema)];
  const env = { PATH: process.env.PATH, HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude'), DISABLE_AUTOUPDATER: '1',
    CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN ?? '' };
  return new Promise((resolve) => {
    const child = spawn('claude', args, { cwd: home, env, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', () => {
      clearTimeout(timer);
      fs.rmSync(home, { recursive: true, force: true });
      try {
        const answer = JSON.parse(out);
        resolve(answer.is_error ? { error: String(answer.result).slice(0, 200) } : { faults: answer.structured_output.faults });
      } catch {
        resolve({ error: `no answer: ${(err || out).slice(0, 200)}` });
      }
    });
    child.stdin.end(prompt);
  });
}

function squeezed(text) {
  return text.replace(/\s+/g, ' ').trim();
}

export function verified(faults, reply) {
  const whole = squeezed(reply);
  return faults.filter((f) => f.passage.trim() && whole.includes(squeezed(f.passage)));
}

export async function judgedMeaning(output, context) {
  const reply = context.providerResponse?.metadata?.said || output || '';
  let answer = await ask(judgePrompt(reply, projectRecords(context)));
  if (answer.error) answer = await ask(judgePrompt(reply, projectRecords(context)));
  if (answer.error) return result(false, `the judge gave no answer: ${answer.error}`);
  const faults = verified(answer.faults, reply);
  const dropped = answer.faults.length - faults.length;
  const note = dropped ? ` (${dropped} dropped, their passage not in the reply)` : '';
  return result(
    faults.length === 0,
    faults.length === 0
      ? `each reference the judge read holds${note}`
      : `${faults.length} faults judged in the reply's meaning${note}: ${faults.map((f) => `${f.section} "${squeezed(f.passage).slice(0, 100)}" — ${f.why}`).join('; ')}`,
  );
}
