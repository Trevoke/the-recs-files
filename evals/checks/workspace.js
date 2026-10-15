import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function workingDir(context) {
  const dir = context.providerResponse?.metadata?.workingDir;
  if (!dir) {
    throw new Error('the provider reported no workingDir');
  }
  return dir;
}

export function read(context, file) {
  const full = path.join(workingDir(context), file);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : undefined;
}

function git(dir, ...args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
}

export function original(context, file) {
  const dir = workingDir(context);
  const root = git(dir, 'rev-list', '--max-parents=0', 'HEAD').trim();
  return git(dir, 'show', `${root}:${file}`);
}

export function changedFiles(context) {
  const dir = workingDir(context);
  const root = git(dir, 'rev-list', '--max-parents=0', 'HEAD').trim();
  const tracked = git(dir, 'diff', '--name-only', root).split('\n');
  const untracked = git(dir, 'ls-files', '--others', '--exclude-standard').split('\n');
  return [...new Set([...tracked, ...untracked])].filter(Boolean).sort();
}

export function uncommitted(context) {
  const dir = workingDir(context);
  return git(dir, 'status', '--porcelain').split('\n').filter(Boolean);
}

export function commitsSinceStart(context) {
  const dir = workingDir(context);
  const root = git(dir, 'rev-list', '--max-parents=0', 'HEAD').trim();
  return git(dir, 'rev-list', '--reverse', `${root}..HEAD`)
    .split('\n')
    .filter(Boolean)
    .map((sha) => ({
      sha,
      files: git(dir, 'diff-tree', '--no-commit-id', '--name-only', '-r', sha).split('\n').filter(Boolean),
    }));
}

export function result(pass, reason) {
  return { pass, score: pass ? 1 : 0, reason };
}
