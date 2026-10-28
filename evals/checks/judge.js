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
          section: { type: 'string', enum: ['§1', '§4', '§6', '§9', '§10'] },
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
  return `You grade one reply that an agent gave to the record keeper of a project, against a feature record that says how the agent cites records. Read the feature record, the terms it uses, the project's records the agent could read, then the reply.

# The feature record

${repoRecord('features', 'F-20261028-1mkt')}
# The terms it uses

${['UL-20261028-tk52', 'UL-20261028-wm45', 'UL-20261028-chtt', 'UL-20261015-aycy', 'UL-20261027-1z2h'].map((id) => repoRecord('ubiquitous-language', id)).join('\n')}
# The project's records, as the agent found them

${records}
# The reply

<reply>
${reply}
</reply>

# What to report

Scripts already check every reference made by an identifier (\`F-1\`, \`F-1 §2\`), every title in backticks, backticks, line breaks, the order of sections, a list item's place, and text set in quote marks. Report only what a script cannot read: the meaning of the reply's words.

Report a fault, with the section of the feature record it breaks, for each of these:
- §1: the reply refers to a record by a description of it or by a paraphrase of its title ("the two features", "the decision", "the loan period term", "the renewal workflow") at a point where the reply has not yet cited that record.
- §4: the reply refers to a section of a record by a description or by its number in words ("step 3", "the third requirement", "extension 2a", "its Consequences") at a point where no citation in the reply has yet carried that section.
- §6: a list item "§N: …" set under a citation says something section N of that record does not say, or says nothing of what it says.
- §9: the reply gives section numbers to a record that is not among the project's records.
- §10: the reply reproduces a record's text outside a code block and without quote marks, a clause or more of it word for word.

A reference is a mention of a record itself. A word used for the thing a record defines or decides ("the loan", "a reservation", "the due date") is the domain speaking, and refers to no record. These are references that hold: a description of a record after the reply has cited it; the vision, referred to as the vision; a record the agent proposes, not on disk, referred to by what it says.

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
