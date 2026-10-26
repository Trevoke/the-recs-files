import { citations } from './citations.js';
import { identifier, prefix } from './identifier.js';
import { original, result } from './workspace.js';

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
  return every(output, context, (c) => c.titled, 'do not carry the title as the heading does');
}

export function sectionBeforeTitle(output, context) {
  return every(output, context, (c) => !c.sectionMisplaced && c.sections <= 1, 'put a section outside the place between the number and the title, or name more than one');
}

export function inBackticks(output, context) {
  return every(output, context, (c) => c.backticked, 'are not set in backticks');
}

export function oneLine(output, context) {
  return every(output, context, (c) => !c.broken, 'break across a line');
}
