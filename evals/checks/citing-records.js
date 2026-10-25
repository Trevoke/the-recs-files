import { citations } from './citations.js';
import { original, result } from './workspace.js';

const projections = [
  'docs/ubiquitous-language.org',
  'docs/architectural-decisions.org',
  'docs/features.org',
  'docs/user-workflows.org',
  'docs/message-catalog.org',
];

function titles(context) {
  const map = new Map();
  for (const file of projections) {
    for (const m of original(context, file).matchAll(/^- ([A-Z]+-\d+) :: \[\[[^\]]*\]\[(.*)\]\]$/gm)) {
      map.set(m[1], m[2]);
    }
  }
  return map;
}

function cited(output, context) {
  const said = context.providerResponse?.metadata?.said ?? output ?? '';
  return citations(said, titles(context)).filter((c) => c.known);
}

function every(output, context, holds, what) {
  const all = cited(output, context);
  if (all.length === 0) return result(false, 'no citation of a record on disk');
  const failing = all.filter((c) => !holds(c));
  return result(
    failing.length === 0,
    failing.length === 0
      ? `all ${all.length} citations hold`
      : `${failing.length} of ${all.length} citations ${what}: ${failing.map((c) => c.excerpt).join(' | ')}`,
  );
}

export function citesRecords(output, context) {
  const ids = [...new Set(cited(output, context).map((c) => c.id))];
  return result(ids.length >= 2, `cited ${ids.join(', ') || 'no record on disk'}`);
}

export function exactTitles(output, context) {
  return every(output, context, (c) => c.titled, 'do not carry the title as the heading does');
}

export function sectionBeforeTitle(output, context) {
  return every(output, context, (c) => !c.sectionMisplaced, 'name a section away from between the number and the title');
}

export function inBackticks(output, context) {
  return every(output, context, (c) => c.backticked, 'are not set in backticks');
}

export function oneLine(output, context) {
  return every(output, context, (c) => !c.broken, 'break across a line');
}
