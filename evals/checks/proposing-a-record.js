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

const drawn = /^adr-(\d{8})-([0-9a-hjkmnp-tv-z]{4})-[a-z0-9-]+\.org$/;

function utcDate(ms) {
  return new Date(ms).toISOString().slice(0, 10).replaceAll('-', '');
}

function draftedIdentifier(context) {
  const files = drafted(context);
  return files.length === 1 ? files[0].text.match(/^\* (ADR-\S+) /m)?.[1] : undefined;
}

function escaped(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function identifierFromDateAndCharacters(output, context) {
  const files = drafted(context);
  if (files.length !== 1) return result(false, `${files.length} new record files`);
  const name = path.basename(files[0].file);
  const m = drawn.exec(name);
  const written = utcDate(fs.statSync(path.join(workingDir(context), files[0].file)).mtimeMs);
  const ok = Boolean(m) && m[1] === written && draftedIdentifier(context) === `ADR-${m[1]}-${m[2]}`;
  return result(ok, `drafted ${name}, headed ${draftedIdentifier(context) ?? 'with no identifier'}, written ${written}`);
}

export function writtenAsProposed(output, context) {
  const files = drafted(context);
  if (files.length !== 1) return result(false, `${files.length} new record files`);
  const status = files[0].text.match(/^:STATUS:\s*(.*)$/m)?.[1]?.trim();
  return result(status === 'Proposed', `status is ${status ?? 'missing'}`);
}

export function listedUnderProposed(output, context) {
  const id = draftedIdentifier(context);
  const line = id && proposedSection(context).split('\n').find((l) => l.startsWith(`- ${id} ::`));
  return result(Boolean(line), line ? `listed: ${line.trim()}` : `no ${id ?? 'drafted record'} line under the Proposed heading`);
}

export function sameTitle(output, context) {
  const files = drafted(context);
  if (files.length !== 1) return result(false, `${files.length} new record files`);
  const id = draftedIdentifier(context);
  if (!id) return result(false, 'the drafted record has no identifier in its heading');
  const heading = files[0].text.match(new RegExp(`^\\* ${escaped(id)} (.*)$`, 'm'))?.[1]?.trim();
  const line = (read(context, projection) ?? '').match(new RegExp(`^- ${escaped(id)} :: \\[\\[[^\\]]*\\]\\[(.*)\\]\\]$`, 'm'))?.[1]?.trim();
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
