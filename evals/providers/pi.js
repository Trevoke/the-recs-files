import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../../packaging/render.mjs';

const evalsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const casesDir = path.join(evalsDir, 'cases');
const modulesDir = path.join(evalsDir, 'node_modules');
const pi = path.join(modulesDir, '@earendil-works', 'pi-coding-agent', 'dist', 'bundle', 'cli.js');
const nodeDir = path.dirname(path.dirname(process.execPath));

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

let rendering;
function piPackage() {
  rendering ??= (() => {
    try {
      const pkg = render('pi', fs.mkdtempSync(path.join(os.tmpdir(), 'recs-eval-pi-package-')), 'v0.0.0-eval');
      process.once('exit', () => fs.rmSync(pkg, { recursive: true, force: true }));
      return { pkg };
    } catch (error) {
      return { error };
    }
  })();
  if (rendering.error) throw rendering.error;
  return rendering.pkg;
}

// docs/knowledge-base/pi-as-an-eval-harness.org: A parent directory's AGENTS.md loads, even past a git root
function prepare(caseName, withSkills) {
  const rendered = withSkills ? piPackage() : undefined;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `recs-eval-${caseName}-`));
  const project = path.join(root, 'project');
  const agentDir = path.join(root, 'agent');
  const home = path.join(root, 'home');
  const pkg = withSkills ? path.join(root, 'package') : undefined;
  fs.cpSync(path.join(casesDir, caseName, 'fixture'), project, { recursive: true });
  fs.mkdirSync(agentDir);
  if (withSkills) {
    fs.cpSync(rendered, pkg, { recursive: true });
    // docs/knowledge-base/pi-as-an-eval-harness.org: A print-mode run discovers `<agent-dir>/skills` without `--approve`
    fs.cpSync(path.join(pkg, 'skills'), path.join(agentDir, 'skills'), { recursive: true });
  }
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
  return { root, project, agentDir, home, pkg };
}

// docs/knowledge-base/pi-as-an-eval-harness.org: Nothing confines pi to its working directory
// docs/knowledge-base/bubblewrap-confines-an-eval-run.org: A run sees only the system, node, pi and its own directory
function sandboxed({ root, project, home }, env, args) {
  return [
    '--unshare-all', '--share-net', '--die-with-parent', '--clearenv',
    '--ro-bind', '/usr', '/usr',
    '--symlink', 'usr/bin', '/bin', '--symlink', 'usr/lib', '/lib',
    '--symlink', 'usr/lib', '/lib64', '--symlink', 'usr/bin', '/sbin',
    '--ro-bind', '/etc', '/etc',
    '--proc', '/proc', '--dev', '/dev', '--tmpfs', '/tmp',
    '--bind', root, root,
    '--ro-bind', nodeDir, '/opt/node',
    '--ro-bind', modulesDir, '/opt/evals/node_modules',
    ...Object.entries({ PATH: '/opt/node/bin:/usr/bin', HOME: home, LANG: 'C.UTF-8', ...env })
      .flatMap(([k, v]) => ['--setenv', k, v]),
    '--chdir', project,
    '--', '/opt/node/bin/node', path.join('/opt/evals/node_modules', path.relative(modulesDir, pi)), ...args,
  ];
}

function run(args, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn('bwrap', args, { stdio: ['ignore', 'pipe', 'pipe'] });
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

function text(message) {
  return (message?.content ?? [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n');
}

// docs/knowledge-base/pi-as-an-eval-harness.org: A skill load is a `read` of its SKILL.md
// docs/knowledge-base/pi-as-an-eval-harness.org: A model may read a skill through bash instead of `read`
function skillCalls(all) {
  const ended = new Map(all.filter((e) => e.type === 'tool_execution_end').map((e) => [e.toolCallId, e]));
  const read = (e) =>
    e.toolName === 'read'
      ? [/(?:^|\/)skills\/([^/\s]+)\/SKILL\.md$/.exec(e.args?.path ?? '')?.[1]]
      : e.toolName === 'bash'
        ? [...(e.args?.command ?? '').matchAll(/skills\/([^/\s'"]+)\/SKILL\.md/g)].map((m) => m[1])
        : [];
  return all
    .filter((e) => e.type === 'tool_execution_start')
    .flatMap((e) => read(e).filter(Boolean).map((name) => ({ name, end: ended.get(e.toolCallId) })))
    .map(({ name, end }) => ({ name, is_error: !end || Boolean(end.isError) }));
}

// docs/knowledge-base/pi-as-an-eval-harness.org: A tool's `usage` reaches the JSONL on its `tool_execution_end`
function subagentCost(all) {
  return all
    .filter((e) => e.type === 'tool_execution_end' && e.toolName === 'subagent')
    .reduce((sum, e) => sum + (e.result?.usage?.cost?.total ?? 0), 0);
}

export default class PiProvider {
  constructor(options = {}) {
    this.config = options.config ?? {};
    this.label = options.label;
  }

  id() {
    return `pi:${this.config.model}`;
  }

  async callApi(prompt, context) {
    const caseName = context?.vars?.case;
    const dirs = prepare(caseName, this.config.skills);
    const { root, project, agentDir, pkg } = dirs;
    // docs/knowledge-base/pi-as-an-eval-harness.org: `--no-skills --skill <dir>` loads exactly that directory's skills
    const args = [
      '-p', '--mode', 'json', '--no-session',
      '--no-skills', '--no-extensions', '--no-prompt-templates', '--no-themes', '--offline',
      ...(this.config.skills ? ['--skill', path.join(agentDir, 'skills')] : []),
      // docs/knowledge-base/pi-as-an-eval-harness.org: An explicit `-e` extension loads under `--no-extensions`
      ...(this.config.skills ? ['-e', path.join(pkg, 'extensions', 'subagent', 'index.ts')] : []),
      '--model', this.config.model,
      '--', prompt,
    ];
    // docs/knowledge-base/pi-as-an-eval-harness.org: `PI_CODING_AGENT_DIR` moves settings, models and auth
    const env = { ...identity, PI_CODING_AGENT_DIR: agentDir, OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? '' };
    const started = Date.now();
    const result = await run(sandboxed(dirs, env, args), this.config.timeoutMs ?? 15 * 60 * 1000);
    fs.writeFileSync(path.join(root, 'pi.jsonl'), result.stdout);
    fs.writeFileSync(path.join(root, 'pi.stderr'), result.stderr);
    const all = events(result.stdout);
    const messages = all.filter((e) => e.type === 'message_end').map((e) => e.message);
    const assistant = messages.filter((m) => m?.role === 'assistant');
    const metadata = { workingDir: project, transcript: path.join(root, 'pi.jsonl'), ...(pkg ? { packageDir: pkg } : {}), skillCalls: skillCalls(all), durationMs: Date.now() - started };
    // docs/knowledge-base/pi-as-an-eval-harness.org: pi exits 0 when the provider fails
    const failed = assistant.find((m) => m.stopReason === 'error');
    if (failed || result.code !== 0) {
      return {
        error: failed?.errorMessage ?? `pi exited ${result.code ?? result.signal}: ${result.stderr.slice(-2000)}`,
        metadata,
      };
    }
    return {
      output: text(assistant.at(-1)),
      cost: assistant.reduce((sum, m) => sum + (m.usage?.cost?.total ?? 0), 0) + subagentCost(all),
      metadata,
    };
  }
}
