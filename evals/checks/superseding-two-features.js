import fs from 'node:fs';
import path from 'node:path';
import { result, workingDir } from './workspace.js';

const dir = 'docs/features';

function successors(context) {
  const full = path.join(workingDir(context), dir);
  return fs
    .readdirSync(full)
    .filter((f) => !/^f-[12]-/.test(f))
    .map((f) => ({ file: `${dir}/${f}`, text: fs.readFileSync(path.join(full, f), 'utf8') }));
}

export function writtenAsProposed(output, context) {
  const files = successors(context);
  if (files.length !== 1) return result(false, `${files.length} new feature files`);
  const status = files[0].text.match(/^:STATUS:\s*(.*)$/m)?.[1]?.trim();
  return result(status === 'Proposed', `status is ${status ?? 'missing'}`);
}

export function supersedesBothByLink(output, context) {
  const files = successors(context);
  if (files.length !== 1) return result(false, `${files.length} new feature files`);
  const lines = files[0].text.split('\n').filter((l) => /^:SUPERSEDES\+?:/.test(l));
  if (lines.length !== 1) return result(false, `${lines.length} :SUPERSEDES: lines`);
  const targets = [...lines[0].matchAll(/\[\[([^\]]+)\]\[[^\]]+\]\]/g)].map((m) => path.basename(m[1]));
  const ok = targets.some((t) => /^f-1-/.test(t)) && targets.some((t) => /^f-2-/.test(t));
  return result(ok, `:SUPERSEDES: links ${targets.join(', ') || 'nothing'}`);
}

export function separators(line) {
  const value = line.replace(/^:SUPERSEDES\+?:\s*/, '');
  const between = value.split(/\[\[[^\]]+\]\[[^\]]+\]\]/).slice(1, -1);
  return between.map((s) => s.replace(/^\s*\([^)]*\)/, ''));
}

export function outsideLinks(line) {
  return line.replace(/^:SUPERSEDES\+?:\s*/, '').split(/\[\[[^\]]+\]\[[^\]]+\]\]/).join('').replace(/,\s*/g, '').trim();
}

export function linksOnly(output, context) {
  const files = successors(context);
  if (files.length !== 1) return result(false, `${files.length} new feature files`);
  const line = files[0].text.split('\n').find((l) => /^:SUPERSEDES\+?:/.test(l)) ?? '';
  const rest = outsideLinks(line);
  return result(rest === '', rest ? `:SUPERSEDES: holds more than links: ${rest}` : ':SUPERSEDES: holds links only');
}

export function linksParted(output, context) {
  const files = successors(context);
  if (files.length !== 1) return result(false, `${files.length} new feature files`);
  const line = files[0].text.split('\n').find((l) => /^:SUPERSEDES\+?:/.test(l)) ?? '';
  const wrong = separators(line).filter((s) => s !== ', ');
  return result(wrong.length === 0, wrong.length ? `links parted by ${wrong.map((s) => JSON.stringify(s)).join(', ')}` : 'links parted by a comma and a space');
}
