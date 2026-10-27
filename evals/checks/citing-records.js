import fs from 'node:fs';
import path from 'node:path';
import { citations, unfenced } from './citations.js';
import { identifier, prefix } from './identifier.js';
import { original, result, workingDir } from './workspace.js';

const projections = [
  'docs/ubiquitous-language.org',
  'docs/architectural-decisions.org',
  'docs/features.org',
  'docs/user-workflows.org',
  'docs/message-catalog.org',
];

const projectionLine = new RegExp(`^- (${prefix}-${identifier}) :: \\[\\[[^\\]]*\\]\\[(.*)\\]\\]$`, 'gm');

export function projectionTitles(text, map = new Map()) {
  for (const m of text.matchAll(projectionLine)) map.set(m[1], m[2]);
  return map;
}

function titles(context) {
  const map = new Map();
  for (const file of projections) projectionTitles(original(context, file), map);
  return map;
}

function found(output, context) {
  const said = context.providerResponse?.metadata?.said || output || '';
  return citations(said, titles(context));
}

function said(output, context) {
  return context.providerResponse?.metadata?.said || output || '';
}

function cited(output, context) {
  return found(output, context).filter((c) => c.known);
}

function every(output, context, holds, what) {
  const all = cited(output, context);
  if (all.length === 0) return result(false, 'no citation of a record on disk');
  const failing = all.filter((c) => !holds(c));
  return result(
    failing.length === 0,
    failing.length === 0
      ? `all ${all.length} citations hold`
      : `${failing.length} of ${all.length} citations ${what}: ${failing.map((c) => c.excerpt).join('; ')}`,
  );
}

export function citesRecords(output, context) {
  const all = found(output, context);
  const ids = [...new Set(all.filter((c) => c.known).map((c) => c.id))];
  const unknown = [...new Set(all.filter((c) => !c.known).map((c) => c.id))];
  const ignored = unknown.length ? `; ignored ${unknown.join(', ')}` : '';
  return result(ids.length >= 2, `cited ${ids.join(', ') || 'no record on disk'}${ignored}`);
}

export function exactTitles(output, context) {
  const firstCited = new Map();
  for (const c of cited(output, context)) if (c.titled && !firstCited.has(c.id)) firstCited.set(c.id, c.start);
  const citedBefore = (c) => firstCited.has(c.id) && firstCited.get(c.id) < c.start;
  return every(output, context, (c) => c.titled || citedBefore(c), 'do not carry the title before the reply has cited the record');
}

export function sectionBeforeTitle(output, context) {
  return every(output, context, (c) => !c.sectionMisplaced, 'put a section outside the place between the number and the title');
}

export function inBackticks(output, context) {
  return every(output, context, (c) => c.backticked, 'are not set in backticks');
}

export function oneLine(output, context) {
  return every(output, context, (c) => !c.broken, 'break across a line');
}

export function sectionsInOneCitation(output, context) {
  const all = cited(output, context);
  if (all.length === 0) return result(false, 'no citation of a record on disk');
  const plain = unfenced(said(output, context));
  const withSections = all.filter((c) => c.sections > 0);
  const split = [];
  withSections.forEach((a, i) => {
    const b = withSections.slice(i + 1).find((c) => c.id === a.id);
    if (!b) return;
    const between = plain.slice(a.end, b.start);
    if (!/[.!?](?:\s|$)|\n/.test(between)) split.push(`${a.excerpt} … ${b.excerpt}`);
  });
  return result(
    split.length === 0,
    split.length === 0
      ? `each sentence names a record's sections in one citation`
      : `${split.length} sentences cite one record's sections in more than one citation: ${split.join('; ')}`,
  );
}

const listItem = /^(\s*)(?:[-*+]|\d+[.)])\s+/;
const sectionLine = /^\s*(?:[-*+]|\d+[.)])\s+(?:\*{1,2}|_{1,2})?`?(§[\w.]+)/;
const fenceLine = /^\s*(`{3,}|~{3,})/;
const anyIdentifier = new RegExp(`(?<![\\w-])${prefix}-${identifier}(?![\\w-])`);

function indent(line) {
  return /^\s*/.exec(line)[0].length;
}

function parentOf(lines, n) {
  if (!listItem.test(lines[n])) return -1;
  const own = indent(lines[n]);
  for (let i = n - 1; i >= 0; i--) {
    if (lines[i].trim() === '') continue;
    const k = indent(lines[i]);
    if (k < own || (k === own && !listItem.test(lines[i]))) return i;
  }
  return -1;
}

function listedUnderACitation(lines, n) {
  for (let p = parentOf(lines, n); p >= 0; p = parentOf(lines, p)) {
    if (anyIdentifier.test(lines[p])) return true;
  }
  return false;
}

// What sits beneath line n: the section numbers on the list lines under it,
// and whether a code block (a quote) opens there.
function beneath(raw, lines, n) {
  const own = indent(lines[n]);
  const numbers = new Set();
  let quote = false;
  for (let i = n + 1; i < lines.length; i++) {
    if (raw[i].trim() === '' && lines[i].trim() === '') continue;
    if (fenceLine.test(raw[i]) && lines[i].trim() === '') {
      if (numbers.size === 0) quote = true;
      break;
    }
    if (!listItem.test(lines[i])) break;
    const m = sectionLine.exec(lines[i]);
    if (m) numbers.add(m[1].replace(/[.:]+$/, ''));
    else if (listItem.test(lines[n]) && indent(lines[i]) <= own) break;
  }
  return { numbers, quote };
}

export function sectionsListedUnder(output, context) {
  const all = cited(output, context);
  if (all.length === 0) return result(false, 'no citation of a record on disk');
  const text = said(output, context);
  const raw = text.split('\n');
  const plain = unfenced(text);
  const lines = plain.split('\n');
  const lineStarts = [];
  lines.reduce((at, line) => (lineStarts.push(at), at + line.length + 1), 0);
  const lineOf = (at) => lineStarts.findLastIndex((s) => s <= at);
  const named = new Set();
  const missing = [];
  for (const c of all) {
    if (c.sections === 0) continue;
    const fresh = c.sectionText.match(/§[\w.]+/g).map((m) => m.replace(/[.:]+$/, '')).filter((m) => !named.has(`${c.id} ${m}`));
    if (fresh.length === 0) continue;
    fresh.forEach((m) => named.add(`${c.id} ${m}`));
    const { numbers, quote } = beneath(raw, lines, lineOf(c.start));
    const unsaid = quote ? [] : fresh.filter((m) => !numbers.has(m));
    if (unsaid.length) missing.push(`${c.excerpt} (${unsaid.join(', ')})`);
  }
  const stray = [];
  lines.forEach((line, n) => {
    if (sectionLine.test(line) && !listedUnderACitation(lines, n)) stray.push(line.trim().slice(0, 100));
  });
  const faults = missing.length + stray.length;
  return result(
    faults === 0,
    faults === 0
      ? 'each section, the first time a reply names it, has its line or its quote beneath'
      : `${faults} citations name a section with no line or quote beneath, or a section line sits under no record: ${[...missing, ...stray.map((l) => `stray ${l}`)].join('; ')}`,
  );
}

const nygard = ['Context', 'Decision', 'Consequences'];

function sectionKey(name) {
  const named = nygard.indexOf(name);
  if (named >= 0) return [named];
  const parts = name.match(/\d+|[a-z]+/gi);
  if (!parts || !/^\d/.test(name)) return null;
  return parts.map((p) => (/^\d+$/.test(p) ? Number(p) : p.toLowerCase().charCodeAt(0) - 96 + 0.5));
}

function before(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === undefined) return true;
    if (b[i] === undefined) return false;
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

export function sectionsInRecordOrder(output, context) {
  const all = cited(output, context).filter((c) => c.sections > 1);
  if (cited(output, context).length === 0) return result(false, 'no citation of a record on disk');
  const failing = all.filter((c) => {
    if (/[–-][ \t]*§?\d/.test(c.sectionText)) return true;
    const keys = c.sectionText.split(/,[ \t]*/).map((s) => sectionKey(s.replace(/^§/, '')));
    if (keys.some((k) => k === null)) return false;
    return keys.some((k, i) => i > 0 && !before(keys[i - 1], k));
  });
  return result(
    failing.length === 0,
    failing.length === 0
      ? 'every citation names its sections in the record\'s order, each written out'
      : `${failing.length} citations name sections out of the record's order or as a range: ${failing.map((c) => c.excerpt).join('; ')}`,
  );
}

const categoryDir = { UL: 'ubiquitous-language', ADR: 'architectural-decisions', F: 'features', UW: 'user-workflows', MSG: 'message-catalog' };

function onDisk(context, id) {
  const dir = path.join(workingDir(context), 'docs', categoryDir[id.split('-')[0]] || '');
  return fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.startsWith(`${id.toLowerCase()}-`));
}

export function noSectionsOfARecordNotOnDisk(output, context) {
  const failing = found(output, context).filter((c) => c.sections > 0 && !onDisk(context, c.id));
  return result(
    failing.length === 0,
    failing.length === 0
      ? 'every section cited is of a record on disk'
      : `${failing.length} citations name sections of a record not on disk: ${failing.map((c) => c.excerpt).join('; ')}`,
  );
}

const orgLink = /\[\[[^\]]+\]\[[^\]]+\]\]/g;
const quotedSentence = /["“]([^"”\n]*\bshall\b[^"”\n]*)["”]|^[ \t]*>([^\n]*\bshall\b[^\n]*)/gm;

function normal(text) {
  return text
    .replace(/\[\[[^\]]+\]\[([^\]]+)\]\]/g, '$1')
    .replace(/[`*_]/g, '')
    .replace(/^\s*\d+\.\s+/gm, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function recordText(context) {
  const docs = path.join(workingDir(context), 'docs');
  const texts = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) walk(full);
      else if (f.name.endsWith('.org')) texts.push(fs.readFileSync(full, 'utf8'));
    }
  };
  walk(docs);
  return normal(texts.join('\n'));
}

export function quotesInCodeBlocks(output, context) {
  const plain = unfenced(said(output, context));
  const records = recordText(context);
  const quotes = [...plain.matchAll(quotedSentence)].filter((m) => {
    const words = normal(m[1] ?? m[2]).replace(/[.,;:!?\s]+$/, '').trim();
    return words.length > 0 && records.includes(words);
  });
  const hits = [...plain.matchAll(orgLink), ...quotes].map((m) => m[0].trim().slice(0, 100));
  return result(
    hits.length === 0,
    hits.length === 0 ? 'every quote of a record\'s text is in a code block' : `${hits.length} lines quote a record's text outside a code block: ${hits.join('; ')}`,
  );
}
