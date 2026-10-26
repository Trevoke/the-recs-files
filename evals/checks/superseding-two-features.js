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
