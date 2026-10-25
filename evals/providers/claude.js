import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evalsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.join(evalsDir, '..');
const casesDir = path.join(evalsDir, 'cases');

const identity = {
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

function resolved(command) {
  return fs.realpathSync(execFileSync('sh', ['-c', `command -v ${command}`], { encoding: 'utf8' }).trim());
}

// docs/knowledge-base/claude-code-as-an-eval-harness.org: The `claude` binary is one executable that needs only the system's libraries
function claudeBinary() {
  return resolved('claude');
}

export function recsSkills() {
  return fs
    .readdirSync(path.join(repoDir, 'skills'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('recs-'))
    .map((e) => e.name)
    .sort();
}

export function recsAgents() {
  return fs
    .readdirSync(path.join(repoDir, 'agents'), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => path.basename(e.name, '.md'))
    .sort();
}

export function caseProblem(caseName) {
  if (!caseName || !fs.existsSync(path.join(casesDir, caseName, 'fixture'))) return `no case named ${caseName}`;
  return undefined;
}

// docs/knowledge-base/claude-code-as-an-eval-harness.org: Claude Code loads CLAUDE.md and AGENTS.md from the working directory and its parents
function prepare(caseName, withSkills) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `recs-eval-${caseName}-`));
  const project = path.join(root, 'project');
  const home = path.join(root, 'home');
  const configDir = path.join(home, '.claude');
  fs.cpSync(path.join(casesDir, caseName, 'fixture'), project, { recursive: true });
  if (withSkills) {
    fs.cpSync(path.join(repoDir, 'skills'), path.join(project, '.claude', 'skills'), { recursive: true });
    fs.cpSync(path.join(repoDir, 'agents'), path.join(project, '.claude', 'agents'), { recursive: true });
  }
  fs.mkdirSync(configDir, { recursive: true });
  git(project, 'init', '--quiet', '--initial-branch=main');
  // docs/knowledge-base/pi-as-an-eval-harness.org: `git init` creates `.git/info` only when its template directory has one
  fs.mkdirSync(path.join(project, '.git', 'info'), { recursive: true });
  // docs/knowledge-base/pi-as-an-eval-harness.org: `.git/info/exclude` hides a path from `git status`, `git add -A` and `git ls-files --others --exclude-standard`
  fs.appendFileSync(path.join(project, '.git', 'info', 'exclude'), '/.claude/skills/\n/.claude/agents/\n');
  git(project, 'add', '-A');
  git(project, 'commit', '--quiet', '-m', 'Start the project');
  return { root, project, home, configDir };
}

// docs/knowledge-base/bubblewrap-confines-an-eval-run.org: A run sees only the system, its harness and its own directory
// docs/knowledge-base/bubblewrap-confines-an-eval-run.org: Options read from `--args` keep the environment out of `/proc/<pid>/cmdline`
// docs/knowledge-base/claude-code-as-an-eval-harness.org: `HOME` and `CLAUDE_CONFIG_DIR` inside the run keep the user's configuration out
// docs/knowledge-base/claude-code-as-an-eval-harness.org: A tmpfs over `/etc/claude-code` keeps the host's managed settings out
function sandboxed({ root, project, home, configDir }, binary, env, args) {
  const options = [
    '--unshare-all', '--share-net', '--die-with-parent', '--clearenv',
    '--ro-bind', '/usr', '/usr',
    '--symlink', 'usr/bin', '/bin', '--symlink', 'usr/lib', '/lib',
    '--symlink', 'usr/lib', '/lib64', '--symlink', 'usr/bin', '/sbin',
    '--ro-bind', '/etc', '/etc',
    '--proc', '/proc', '--dev', '/dev', '--tmpfs', '/tmp',
    '--bind', root, root,
    '--ro-bind', binary, '/opt/claude/claude',
    ...(fs.existsSync('/etc/claude-code') ? ['--tmpfs', '/etc/claude-code'] : []),
    ...Object.entries({ PATH: '/opt/claude:/usr/bin', HOME: home, CLAUDE_CONFIG_DIR: configDir, LANG: 'C.UTF-8', DISABLE_AUTOUPDATER: '1', ...env })
      .flatMap(([k, v]) => ['--setenv', k, v]),
    '--chdir', project,
  ];
  return { argv: ['--args', '3', '--', '/opt/claude/claude', ...args], options: options.map((o) => `${o}\0`).join('') };
}

function run(bwrap, { argv, options }, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(bwrap, argv, { argv0: 'bwrap', env: {}, stdio: ['ignore', 'pipe', 'pipe', 'pipe'] });
    child.stdio[3].on('error', () => {});
    child.stdio[3].end(options);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: null, signal: null, stdout, stderr: `${stderr}${error.message}`, timedOut });
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, timedOut });
    });
  });
}

// docs/knowledge-base/claude-code-as-an-eval-harness.org: A print-mode run is `claude -p --output-format stream-json --verbose`
function events(stdout) {
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

function mainThread(all) {
  return all.filter((e) => e.type === 'assistant' && e.parent_tool_use_id == null).flatMap((e) => e.message?.content ?? []);
}

export function said(all) {
  return mainThread(all)
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n\n');
}

// docs/knowledge-base/claude-code-as-an-eval-harness.org: A skill load is a `Skill` tool use naming the skill
export function skillCalls(all) {
  const results = new Map(
    all
      .filter((e) => e.type === 'user')
      .flatMap((e) => (Array.isArray(e.message?.content) ? e.message.content : []).filter((c) => c.type === 'tool_result'))
      .map((c) => [c.tool_use_id, c]),
  );
  return mainThread(all)
    .filter((c) => c.type === 'tool_use' && c.name === 'Skill')
    .map((c) => ({ name: c.input?.skill, is_error: !results.has(c.id) || Boolean(results.get(c.id).is_error) }));
}

export function initProblem(all, expected, agents = []) {
  const init = all.find((e) => e.type === 'system' && e.subtype === 'init');
  if (!init) return 'the run reported no init event';
  if (init.permissionMode !== 'bypassPermissions') return `the run started in permission mode ${init.permissionMode}, not bypassPermissions`;
  const offered = init.skills ?? [];
  const named = (skill) => offered.some((o) => o === skill || o.endsWith(`:${skill}`));
  const missing = expected.filter((skill) => !named(skill));
  if (missing.length > 0) return `the run's init event does not offer ${missing.join(', ')}`;
  const offeredAgents = init.agents ?? [];
  const missingAgents = agents.filter((agent) => !offeredAgents.some((o) => o === agent || o.endsWith(`:${agent}`)));
  if (missingAgents.length > 0) return `the run's init event does not offer agent ${missingAgents.join(', ')}`;
  const stray = expected.length === 0 ? offered.filter((o) => /(^|:)recs-/.test(o)) : [];
  if (stray.length > 0) return `the run without the skills offers ${stray.join(', ')}`;
  const strayAgents = expected.length === 0 ? offeredAgents.filter((o) => /(^|:)recs-/.test(o)) : [];
  if (strayAgents.length > 0) return `the run without the skills offers agent ${strayAgents.join(', ')}`;
  return undefined;
}

// docs/knowledge-base/claude-code-as-an-eval-harness.org: A failed run ends with a `result` event carrying `is_error`, and exits 1
export function runError(result, final, timeoutMs) {
  if (result.timedOut) return `claude timed out after ${timeoutMs} ms`;
  if (!final || final.is_error || result.code !== 0) {
    return final?.result ?? `claude exited ${result.code ?? result.signal}: ${result.stderr.slice(-2000)}`;
  }
  return undefined;
}

export default class ClaudeCodeProvider {
  constructor(options = {}) {
    this.config = options.config ?? {};
    this.label = options.label;
  }

  id() {
    return `claude-code:${this.config.model}`;
  }

  async callApi(prompt, context) {
    let binary;
    try {
      binary = claudeBinary();
    } catch (error) {
      return { error: `no claude binary on PATH: ${error.message}` };
    }
    let bwrap;
    try {
      bwrap = resolved('bwrap');
    } catch (error) {
      return { error: `no bwrap binary on PATH: ${error.message}` };
    }
    const caseName = context?.vars?.case;
    const unknown = caseProblem(caseName);
    if (unknown) return { error: unknown };
    const token = process.env.CLAUDE_CODE_OAUTH_TOKEN;
    if (!token) return { error: 'CLAUDE_CODE_OAUTH_TOKEN is not set: run `claude setup-token` and export the token it prints' };
    let dirs;
    try {
      dirs = prepare(caseName, this.config.skills);
    } catch (error) {
      return { error: `the run could not be prepared: ${error.message}` };
    }
    const expected = this.config.skills ? recsSkills() : [];
    const expectedAgents = this.config.skills ? recsAgents() : [];
    const args = [
      '-p', '--output-format', 'stream-json', '--verbose', '--no-session-persistence',
      // docs/knowledge-base/claude-code-as-an-eval-harness.org: Inside bubblewrap, bypassing permissions is the sandbox's to confine
      '--permission-mode', 'bypassPermissions',
      '--model', this.config.model,
      '--', prompt,
    ];
    // docs/knowledge-base/claude-code-as-an-eval-harness.org: `CLAUDE_CODE_OAUTH_TOKEN` authenticates a run on the subscription
    const env = { ...identity, CLAUDE_CODE_OAUTH_TOKEN: token };
    const started = Date.now();
    const timeoutMs = this.config.timeoutMs ?? 15 * 60 * 1000;
    const result = await run(bwrap, sandboxed(dirs, binary, env, args), timeoutMs);
    const transcript = path.join(dirs.root, 'claude.jsonl');
    fs.writeFileSync(transcript, result.stdout);
    fs.writeFileSync(path.join(dirs.root, 'claude.stderr'), result.stderr);
    const all = events(result.stdout);
    const final = all.findLast((e) => e.type === 'result');
    const problem = initProblem(all, expected, expectedAgents);
    const metadata = { workingDir: dirs.project, transcript, said: said(all), skillCalls: skillCalls(all), initProblem: problem, timedOut: result.timedOut, durationMs: Date.now() - started };
    const failed = runError(result, final, timeoutMs);
    if (failed) return { error: failed, metadata };
    if (problem) return { error: problem, metadata };
    return { output: final.result ?? '', cost: final.total_cost_usd ?? 0, metadata };
  }
}
