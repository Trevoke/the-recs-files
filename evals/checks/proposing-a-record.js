import fs from 'node:fs';
import path from 'node:path';
import { changedFiles, commitsSinceStart, read, result, uncommitted, workingDir } from './workspace.js';

const projection = 'docs/architectural-decisions.org';
const dir = 'docs/architectural-decisions';

function drafted(context) {
  const full = path.join(workingDir(context), dir);
  return fs
    .readdirSync(full)
    .filter((f) => !/^adr-[123]-/.test(f))
    .map((f) => ({ file: `${dir}/${f}`, text: fs.readFileSync(path.join(full, f), 'utf8') }));
}

function proposedSection(context) {
  const text = read(context, projection) ?? '';
  const at = text.search(/^\* Proposed\s*$/m);
  return at === -1 ? '' : text.slice(at);
}

export function numberedFour(output, context) {
  const files = drafted(context);
  const ok = files.length === 1 && /^adr-4-/.test(path.basename(files[0].file)) && /^\* ADR-4 /m.test(files[0].text);
  return result(ok, files.length ? `drafted: ${files.map((f) => f.file).join(', ')}` : 'no new record file');
}

export function writtenAsProposed(output, context) {
  const files = drafted(context);
  if (files.length !== 1) return result(false, `${files.length} new record files`);
  const status = files[0].text.match(/^:STATUS:\s*(.*)$/m)?.[1]?.trim();
  return result(status === 'Proposed', `status is ${status ?? 'missing'}`);
}

export function listedUnderProposed(output, context) {
  const line = proposedSection(context).split('\n').find((l) => /^- ADR-4 ::/.test(l));
  return result(Boolean(line), line ? `listed: ${line.trim()}` : 'no ADR-4 line under the Proposed heading');
}

export function sameTitle(output, context) {
  const files = drafted(context);
  if (files.length !== 1) return result(false, `${files.length} new record files`);
  const heading = files[0].text.match(/^\* ADR-4 (.*)$/m)?.[1]?.trim();
  const line = (read(context, projection) ?? '').match(/^- ADR-4 :: \[\[[^\]]*\]\[(.*)\]\]$/m)?.[1]?.trim();
  return result(Boolean(heading) && heading === line, `heading "${heading}", projection "${line}"`);
}

export function nothingElseWritten(output, context) {
  const files = drafted(context).map((f) => f.file);
  const extra = changedFiles(context).filter((f) => f !== projection && !files.includes(f));
  return result(extra.length === 0, extra.length ? `also changed: ${extra.join(', ')}` : 'only the draft and its projection changed');
}

export function committedAlone(output, context) {
  const commits = commitsSinceStart(context);
  if (commits.length === 0) return result(true, 'not committed');
  const files = drafted(context).map((f) => f.file);
  const dirty = uncommitted(context).length > 0;
  const ok = commits.length === 1 && !dirty && commits[0].files.every((f) => f === projection || files.includes(f));
  return result(ok, `${commits.length} new commit(s) touching ${commits.flatMap((c) => c.files).join(', ')}${dirty ? ', with uncommitted changes' : ''}`);
}
