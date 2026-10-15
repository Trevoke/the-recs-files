import { changedFiles, commitsSinceStart, original, read, result, uncommitted } from './workspace.js';

const projection = 'docs/architectural-decisions.org';
const record = 'docs/architectural-decisions/adr-3-keep-inspections-as-an-append-only-log.org';

export function lineRemoved(output, context) {
  const text = read(context, projection) ?? '';
  const line = text.split('\n').find((l) => /\bADR-3\b/.test(l));
  return result(!line, line ? `the projection still lists: ${line.trim()}` : 'the projection no longer lists ADR-3');
}

export function otherLinesKept(output, context) {
  const before = original(context, projection).split('\n').filter((l) => /^- ADR-[12] ::/.test(l));
  const after = (read(context, projection) ?? '').split('\n');
  const missing = before.filter((l) => !after.includes(l));
  return result(missing.length === 0, missing.length ? `lines lost: ${missing.join(' | ')}` : 'ADR-1 and ADR-2 are listed as before');
}

export function markedRejected(output, context) {
  const text = read(context, record);
  if (text === undefined) return result(false, 'the record file is gone');
  const status = text.match(/^:STATUS:\s*(.*)$/m)?.[1]?.trim();
  return result(status === 'Rejected', `status is ${status ?? 'missing'}`);
}

export function textStands(output, context) {
  const strip = (t) => t.replace(/^:STATUS:.*$/m, '').trim();
  const text = read(context, record);
  if (text === undefined) return result(false, 'the record file is gone');
  const same = strip(text) === strip(original(context, record));
  return result(same, same ? 'the text is as written' : 'the text was changed beyond its status');
}

export function nothingElseWritten(output, context) {
  const extra = changedFiles(context).filter((f) => f !== projection && f !== record);
  return result(extra.length === 0, extra.length ? `also changed: ${extra.join(', ')}` : 'only the record and its projection changed');
}

export function committedAlone(output, context) {
  const commits = commitsSinceStart(context);
  const dirty = uncommitted(context).length > 0;
  if (commits.length === 0) {
    return result(true, 'not committed');
  }
  if (commits.length !== 1 || dirty) {
    return result(false, `${commits.length} new commit(s), ${dirty ? 'with' : 'and no'} uncommitted changes`);
  }
  const files = commits[0].files;
  const alone = files.length === 2 && files.includes(projection) && files.includes(record);
  return result(alone, `one commit touching ${files.join(', ')}`);
}
