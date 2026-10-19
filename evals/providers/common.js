import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../../packaging/render.mjs';

export const evalsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const casesDir = path.join(evalsDir, 'cases');

export const identity = {
  GIT_AUTHOR_NAME: 'Record Keeper',
  GIT_AUTHOR_EMAIL: 'keeper@example.com',
  GIT_COMMITTER_NAME: 'Record Keeper',
  GIT_COMMITTER_EMAIL: 'keeper@example.com',
};

function git(cwd, ...args) {
  execFileSync('git', args, {
    cwd,
    stdio: 'ignore',
    env: { ...process.env, ...identity, GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z' },
  });
}

const renderings = new Map();
export function renderedPackage(harness) {
  if (!renderings.has(harness)) {
    renderings.set(harness, (() => {
      try {
        const pkg = render(harness, fs.mkdtempSync(path.join(os.tmpdir(), `recs-eval-${harness}-package-`)), 'v0.0.0-eval');
        process.once('exit', () => fs.rmSync(pkg, { recursive: true, force: true }));
        return { pkg };
      } catch (error) {
        return { error };
      }
    })());
  }
  const rendering = renderings.get(harness);
  if (rendering.error) throw rendering.error;
  return rendering.pkg;
}

// docs/knowledge-base/pi-as-an-eval-harness.org: A parent directory's AGENTS.md loads, even past a git root
export function prepare(caseName) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `recs-eval-${caseName}-`));
  const project = path.join(root, 'project');
  const home = path.join(root, 'home');
  fs.cpSync(path.join(casesDir, caseName, 'fixture'), project, { recursive: true });
  fs.mkdirSync(home);
  git(project, 'init', '--quiet', '--initial-branch=main');
  git(project, 'add', '-A');
  git(project, 'commit', '--quiet', '-m', 'Start the project');
  const change = path.join(casesDir, caseName, 'change');
  if (fs.existsSync(change)) {
    fs.cpSync(change, project, { recursive: true });
    git(project, 'add', '-A');
    git(project, 'commit', '--quiet', '-m', 'Add the change under review');
  }
  return { root, project, home };
}

// docs/knowledge-base/pi-as-an-eval-harness.org: `.git/info/exclude` hides a path from `git status`, `git add -A` and `git ls-files --others --exclude-standard`
export function exclude(project, patterns) {
  fs.mkdirSync(path.join(project, '.git', 'info'), { recursive: true });
  fs.appendFileSync(path.join(project, '.git', 'info', 'exclude'), patterns.map((p) => `${p}\n`).join(''));
}

// docs/knowledge-base/bubblewrap-confines-an-eval-run.org: A run sees only the system, node, pi and its own directory
export function sandbox({ root, project }, binds, env, command) {
  return [
    '--unshare-all', '--share-net', '--die-with-parent', '--clearenv',
    '--ro-bind', '/usr', '/usr',
    '--symlink', 'usr/bin', '/bin', '--symlink', 'usr/lib', '/lib',
    '--symlink', 'usr/lib', '/lib64', '--symlink', 'usr/bin', '/sbin',
    '--ro-bind', '/etc', '/etc',
    '--proc', '/proc', '--dev', '/dev', '--tmpfs', '/tmp',
    '--bind', root, root,
    ...binds.flatMap(([from, to]) => ['--ro-bind', from, to]),
    ...Object.entries(env).flatMap(([k, v]) => ['--setenv', k, v]),
    '--chdir', project,
    '--', ...command,
  ];
}

export function run(args, timeoutMs, input) {
  return new Promise((resolve) => {
    const child = spawn('bwrap', args, { stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
    if (input !== undefined) child.stdin.end(input);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr });
    });
  });
}

// docs/knowledge-base/pi-as-an-eval-harness.org: The JSONL is split on LF only
export function events(stdout) {
  return stdout
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}
