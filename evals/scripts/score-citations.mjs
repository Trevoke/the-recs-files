import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { citations } from '../checks/citations.js';
import { projectionTitles } from '../checks/citing-records.js';

const evalsDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixtureDocs = path.join(evalsDir, 'cases', 'citing-records-to-the-record-keeper', 'fixture', 'docs');
const fixtureTitles = new Map();
for (const f of fs.readdirSync(fixtureDocs).filter((f) => f.endsWith('.org'))) projectionTitles(fs.readFileSync(path.join(fixtureDocs, f), 'utf8'), fixtureTitles);

function budget(said) {
  const known = citations(said || '', fixtureTitles).filter((c) => c.known);
  return { records: new Set(known.map((c) => c.id)).size, citations: known.filter((c) => c.titled).length, namings: known.length };
}
// UW-20261028-838j: Answer a question the agent raises
const supporting = ['sections in record order', 'quotes in code blocks'];
const checks = ['judged meaning', 'exact titles', 'again by citation or title', 'sections first cited', 'section before title', 'sections in one citation', 'sections listed under their citation', 'sections in record order', 'no sections of a record not on disk', 'quotes in code blocks', 'in backticks', 'one line'];

function options(argv) {
  const opts = { split: 'train', repeat: 3, jobs: 2, out: null, against: null, log: null, from: null, pool: null, keep: null, label: null, question: null };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    if (!(key in opts)) throw new Error(`unknown option --${key}`);
    opts[key] = ['repeat', 'jobs'].includes(key) ? Number(argv[i + 1]) : argv[i + 1];
  }
  if (!['train', 'held-out', 'all'].includes(opts.split)) throw new Error(`--split is train, held-out or all, not ${opts.split}`);
  return opts;
}

function run(opts) {
  const raw = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'score-citations-')), 'results.json');
  const split = opts.split === 'all' ? '(?:train|held-out)' : opts.split;
  const args = [
    'promptfoo', 'eval', '--no-cache',
    '--filter-providers', 'claude-code-sonnet with-skills',
    '--filter-pattern', `cites records to the record keeper \\(${split}: ${opts.question ?? ''}`,
    '--repeat', String(opts.repeat), '-j', String(opts.jobs), '-o', raw,
  ];
  const child = spawnSync('npx', args, {
    cwd: evalsDir,
    env: { ...process.env, PROMPTFOO_SCHEDULER_QUEUE_TIMEOUT_MS: '3600000' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (![0, 100].includes(child.status)) throw new Error(`promptfoo exited ${child.status}`);
  return raw;
}

function counts(reason) {
  const failing = /^(\d+) of (\d+) citations [^:]*: (.*)$/s.exec(reason);
  if (failing) return { faults: Number(failing[1]), total: Number(failing[2]), excerpts: failing[3].split('; ') };
  const holding = /^all (\d+) citations hold$/.exec(reason);
  if (holding) return { faults: 0, total: Number(holding[1]), excerpts: [] };
  const faulty = /^(\d+) (?:sentences|lines|citations|references|faults) [^:]*: (.*)$/s.exec(reason);
  if (faulty) return { faults: Number(faulty[1]), total: null, excerpts: faulty[2].split('; ') };
  if (/^(?:each|every) /.test(reason)) return { faults: 0, total: null, excerpts: [] };
  return null;
}

function reply(result) {
  const scenario = /\((?:train|held-out): ([^)]+)\)/.exec(result.testCase?.description || result.description || '')?.[1] || 'unknown';
  const components = result.gradingResult?.componentResults || [];
  const byCheck = Object.fromEntries(components.map((c) => [c.assertion?.metric, c]));
  const titles = byCheck['exact titles'] && counts(byCheck['exact titles'].reason || '');
  if (!titles) return { scenario, error: result.error || 'no citation of a record on disk' };
  const faults = {};
  const excerpts = {};
  for (const check of checks) {
    const found = byCheck[check] && counts(byCheck[check].reason || '');
    faults[check] = found ? found.faults : 0;
    if (found?.excerpts.length) excerpts[check] = found.excerpts;
  }
  const sum = Object.values(faults).reduce((a, b) => a + b, 0);
  const bounds = checks.filter((c) => !supporting.includes(c)).every((c) => faults[c] === 0) && !(byCheck['judged meaning'] && !byCheck['judged meaning'].pass);
  return { scenario, total: titles.total, faults, score: sum / titles.total, pass: result.success === true, bounds, excerpts, budget: budget(result.response?.metadata?.said) };
}

function mean(xs) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function standardError(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1) / xs.length);
}

function summary(replies, opts) {
  const scored = replies.filter((r) => r.error === undefined);
  const scores = scored.map((r) => r.score);
  const scenarios = {};
  for (const r of scored) (scenarios[r.scenario] ||= []).push(r.score);
  return {
    commit: spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: evalsDir, encoding: 'utf8' }).stdout.trim(),
    split: opts.split,
    replies: replies.length,
    errors: replies.filter((r) => r.error !== undefined).map((r) => `${r.scenario}: ${r.error}`),
    score: scores.length ? mean(scores) : null,
    standardError: standardError(scores),
    passing: scored.filter((r) => r.pass).length,
    bounding: scored.filter((r) => r.bounds).length,
    scenarios: Object.fromEntries(Object.entries(scenarios).map(([k, v]) => {
      const spent = scored.filter((r) => r.scenario === k && r.budget).map((r) => r.budget);
      const most = (key) => Math.max(...spent.map((b) => b[key]));
      const usual = (key) => Number(mean(spent.map((b) => b[key])).toFixed(1));
      return [k, { score: mean(v), standardError: standardError(v), replies: v.length,
        budget: spent.length ? { records: usual('records'), mostRecords: most('records'), citations: usual('citations'), mostCitations: most('citations'), namings: usual('namings') } : null }];
    })),
    faults: Object.fromEntries(checks.map((c) => [c, scored.reduce((a, r) => a + r.faults[c], 0)])),
    detail: replies,
  };
}

function variance(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1);
}

function byScenario(replies) {
  const scenarios = {};
  for (const r of replies) if (r.error === undefined) (scenarios[r.scenario] ||= []).push(r.score);
  return scenarios;
}

function verdict(candidate, incumbent) {
  const ours = byScenario(candidate.detail);
  const theirs = byScenario(incumbent.detail);
  const shared = Object.keys(ours).filter((s) => theirs[s]?.length && ours[s].length);
  if (shared.length === 0) throw new Error('the two scores share no question');
  let gap = 0;
  let spread = 0;
  for (const s of shared) {
    gap += (mean(theirs[s]) - mean(ours[s])) / shared.length;
    spread += (variance(theirs[s]) / theirs[s].length + variance(ours[s]) / ours[s].length) / shared.length ** 2;
  }
  const margin = 2 * Math.sqrt(spread);
  return { gap, margin, keep: gap > margin, questions: shared.length };
}

function pooled(files) {
  const scores = files.split(',').map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  return { split: scores[0].split, detail: scores.flatMap((s) => s.detail) };
}

function trace(transcript) {
  if (!transcript || !fs.existsSync(transcript)) return [];
  const steps = [];
  for (const line of fs.readFileSync(transcript, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line);
    const content = entry.type === 'assistant' && Array.isArray(entry.message?.content) ? entry.message.content : [];
    for (const block of content) {
      if (block.type === 'text' && block.text.trim()) steps.push(`said: ${block.text.trim().split('\n')[0].slice(0, 160)}`);
      if (block.type === 'tool_use') {
        const input = block.input || {};
        steps.push(`${block.name}: ${String(input.file_path || input.command || input.pattern || input.path || '').split('\n')[0].slice(0, 160)}`);
      }
    }
  }
  return steps;
}

function keep(dir, raw, replies, scored) {
  fs.mkdirSync(path.join(dir, 'transcripts'), { recursive: true });
  fs.copyFileSync(raw, path.join(dir, 'results.json'));
  const results = JSON.parse(fs.readFileSync(raw, 'utf8')).results.results;
  const pages = [`# ${opts.label || 'Run'} at ${scored.commit}`, '', `${scored.replies} replies, ${scored.passing} passing, score ${scored.score?.toFixed(3)}.`];
  results.forEach((result, i) => {
    const r = replies[i];
    const n = String(i + 1).padStart(2, '0');
    const transcript = result.response?.metadata?.transcript;
    if (transcript && fs.existsSync(transcript)) fs.copyFileSync(transcript, path.join(dir, 'transcripts', `${n}-${r.scenario}.jsonl`));
    const failing = (result.gradingResult?.componentResults || []).filter((c) => !c.pass);
    pages.push('', `## Reply ${n}: ${r.scenario}, ${r.pass ? 'passes' : 'fails'}`, '');
    for (const c of failing) pages.push(`- ${c.assertion?.metric}: ${c.reason}`);
    pages.push('', '### Steps', '', ...trace(transcript).map((s) => `- ${s}`));
    pages.push('', '### What it said', '', '`````', result.response?.metadata?.said || result.response?.output || result.error || '', '`````');
  });
  fs.writeFileSync(path.join(dir, 'replies.md'), pages.join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'score.json'), JSON.stringify(scored, null, 2));
}

const opts = options(process.argv.slice(2));
let replies;
let raw;
if (opts.pool) {
  const merged = pooled(opts.pool);
  opts.split = merged.split;
  replies = merged.detail;
} else {
  raw = opts.from || run(opts);
  replies = JSON.parse(fs.readFileSync(raw, 'utf8')).results.results.map(reply);
}
const scored = summary(replies, opts);
if (raw) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = opts.keep || path.join(evalsDir, 'runs', `${stamp}-${scored.commit}${opts.label ? `-${opts.label}` : ''}`);
  keep(dir, raw, replies, scored);
  scored.kept = dir;
}
if (opts.against) scored.verdict = verdict(scored, pooled(opts.against));
if (opts.out) fs.writeFileSync(opts.out, JSON.stringify(scored, null, 2));
if (opts.log) {
  const fresh = !fs.existsSync(opts.log);
  const row = [new Date().toISOString(), scored.commit, scored.split, scored.replies, scored.score?.toFixed(4), scored.standardError.toFixed(4), scored.passing, scored.verdict ? (scored.verdict.keep ? 'keep' : 'discard') : ''];
  fs.appendFileSync(opts.log, (fresh ? 'time\tcommit\tsplit\treplies\tscore\tstandard error\tpassing\tverdict\n' : '') + row.join('\t') + '\n');
}
const { detail, ...shown } = scored;
console.log(JSON.stringify(shown, null, 2));
