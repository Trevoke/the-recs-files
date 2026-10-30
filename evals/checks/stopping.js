import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { changedFiles, result, workingDir } from './workspace.js';

export function recordFiles(files) {
  return files.filter((f) => /^docs\/.+\.org$/.test(f) && f !== 'docs/vision.org');
}

function proposedLinesOnly(before, after) {
  const left = before.split('\n');
  const added = [];
  for (const line of after.split('\n')) {
    const i = left.indexOf(line);
    if (i >= 0) left.splice(i, 1);
    else added.push(line);
  }
  if (left.some((l) => l.trim())) return false;
  const lines = after.split('\n');
  const proposed = lines.indexOf('* Proposed');
  return added.every((l) => !l.trim() || l === '* Proposed' || (proposed >= 0 && lines.lastIndexOf(l) > proposed));
}

// F-20261014-pbwk §1: A record change is agreed before it stands
export function recordFaults(changes) {
  return changes
    .filter(({ file, before, after }) => {
      if (before === undefined) return !/^:STATUS: Proposed$/m.test(after ?? '');
      if (after === undefined) return true;
      return !proposedLinesOnly(before, after);
    })
    .map(({ file }) => file);
}

function atRoot(dir, file) {
  const root = execFileSync('git', ['rev-list', '--max-parents=0', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
  try {
    return execFileSync('git', ['show', `${root}:${file}`], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return undefined;
  }
}

// UW-20261028-838j §Minimal guarantee: Answer a question the agent raises
export function recordsUnchanged(output, context) {
  const dir = workingDir(context);
  const changes = recordFiles(changedFiles(context)).map((file) => {
    const full = path.join(dir, file);
    return { file, before: atRoot(dir, file), after: fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : undefined };
  });
  const faults = recordFaults(changes);
  return result(
    faults.length === 0,
    faults.length ? `${faults.length} faults in the records before the answer: ${faults.join('; ')}` : 'each record stands as it was',
  );
}
