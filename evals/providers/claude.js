import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { events, exclude, identity, prepare as prepareProject, renderedPackage, run, sandbox } from './common.js';

// docs/knowledge-base/claude-code-as-an-eval-harness.org: The `claude` binary is one executable that needs only the system's libraries
function claudeBinary() {
  return fs.realpathSync(execFileSync('sh', ['-c', 'command -v claude'], { encoding: 'utf8' }).trim());
}

function prepare(caseName) {
  const dirs = prepareProject(caseName);
  const configDir = path.join(dirs.home, '.claude');
  fs.mkdirSync(configDir);
  return { ...dirs, configDir };
}

// docs/knowledge-base/claude-code-as-an-eval-harness.org: `HOME` and `CLAUDE_CONFIG_DIR` inside the run keep the user's configuration out
// docs/knowledge-base/claude-code-as-an-eval-harness.org: A tmpfs over `/etc/claude-code` keeps the host's managed settings out
function sandboxed(dirs, binary, env, args) {
  return sandbox(
    dirs,
    [[binary, '/opt/claude/claude']],
    { PATH: '/opt/claude:/usr/bin', HOME: dirs.home, CLAUDE_CONFIG_DIR: dirs.configDir, LANG: 'C.UTF-8', DISABLE_AUTOUPDATER: '1', ...env },
    ['/opt/claude/claude', ...args],
    fs.existsSync('/etc/claude-code') ? ['/etc/claude-code'] : [],
  );
}

function manifest(pkg, file) {
  return JSON.parse(fs.readFileSync(path.join(pkg, '.claude-plugin', file), 'utf8'));
}

async function install(dirs, binary, env) {
  const { project } = dirs;
  const rendered = renderedPackage('claude');
  const marketplace = manifest(rendered, 'marketplace.json').name;
  const plugin = `${manifest(rendered, 'plugin.json').name}@${marketplace}`;
  const pkg = path.join(project, '.claude', marketplace);
  fs.cpSync(rendered, pkg, { recursive: true });
  exclude(project, ['/.claude/settings.json', `/.claude/${marketplace}/`]);
  // docs/knowledge-base/claude-code-as-an-eval-harness.org: The plugin commands install a local marketplace at project scope with no network
  for (const args of [
    ['plugin', 'marketplace', 'add', `./${path.relative(project, pkg)}`, '--scope', 'project'],
    ['plugin', 'install', plugin, '--scope', 'project'],
  ]) {
    const result = await run(sandboxed(dirs, binary, env, args), 60 * 1000);
    if (result.code !== 0) throw new Error(`claude ${args.slice(0, 3).join(' ')} exited ${result.code ?? result.signal}: ${(result.stdout + result.stderr).slice(-2000)}`);
  }
  const settings = JSON.parse(fs.readFileSync(path.join(project, '.claude', 'settings.json'), 'utf8'));
  if (settings.enabledPlugins?.[plugin] !== true) throw new Error(`.claude/settings.json does not enable ${plugin}`);
  const listed = await run(sandboxed(dirs, binary, env, ['plugin', 'list', '--json']), 60 * 1000);
  let entry;
  try {
    entry = JSON.parse(listed.stdout).find((p) => p.id === plugin);
  } catch {}
  if (!entry || entry.scope !== 'project' || !entry.enabled || entry.projectPath !== project) {
    throw new Error(`claude plugin list does not show ${plugin} enabled at project scope: ${listed.stdout.slice(-2000)}`);
  }
  // docs/knowledge-base/claude-code-as-an-eval-harness.org: A print-mode run with no credential lists the skills and agents it loads, with no model reached
  const offered = await run(sandboxed(dirs, binary, env, ['-p', '--output-format', 'stream-json', '--verbose', '--no-session-persistence', '--', 'hi']), 60 * 1000);
  const init = events(offered.stdout).find((e) => e.type === 'system' && e.subtype === 'init');
  if (!init) throw new Error(`claude reported no init event: ${offered.stderr.slice(-2000)}`);
  const prefix = `${plugin.split('@')[0]}:`;
  const found = (init.skills ?? []).filter((s) => s.startsWith(prefix)).map((s) => s.slice(prefix.length));
  const missing = fs.readdirSync(path.join(pkg, 'skills'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('recs-'))
    .map((e) => e.name)
    .filter((skill) => !found.includes(skill));
  if (missing.length > 0) throw new Error(`Claude Code does not offer ${missing.join(', ')} from the installed plugin`);
  const agents = fs.readdirSync(path.join(pkg, 'agents')).map((f) => `${prefix}${path.basename(f, '.md')}`);
  const absent = agents.filter((a) => !(init.agents ?? []).includes(a));
  if (absent.length > 0) throw new Error(`Claude Code does not offer ${absent.join(', ')} from the installed plugin`);
  return { pkg, skills: found.sort() };
}

// docs/knowledge-base/claude-code-as-an-eval-harness.org: A print-mode run is `claude -p --output-format stream-json --verbose`
function toolUses(all) {
  return all
    .filter((e) => e.type === 'assistant' && e.parent_tool_use_id == null)
    .flatMap((e) => (e.message?.content ?? []).filter((c) => c.type === 'tool_use'));
}

function toolResults(all) {
  return new Map(
    all
      .filter((e) => e.type === 'user')
      .flatMap((e) => (Array.isArray(e.message?.content) ? e.message.content : []).filter((c) => c.type === 'tool_result'))
      .map((c) => [c.tool_use_id, c]),
  );
}

// docs/knowledge-base/claude-code-as-an-eval-harness.org: A skill load is a `Skill` tool use naming the skill
export function skillCalls(all) {
  const results = toolResults(all);
  return toolUses(all)
    .filter((c) => c.name === 'Skill')
    .map((c) => ({ name: c.input?.skill, is_error: !results.has(c.id) || Boolean(results.get(c.id).is_error) }));
}

export function initProblem(all, plugin) {
  const init = all.find((e) => e.type === 'system' && e.subtype === 'init');
  if (!init) return 'the run reported no init event';
  if (init.permissionMode !== 'bypassPermissions') return `the run started in permission mode ${init.permissionMode}, not bypassPermissions`;
  if (plugin && !(init.skills ?? []).some((s) => s.startsWith(`${plugin}:`))) return `the run's init event lists no ${plugin}: skill`;
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
    const caseName = context?.vars?.case;
    let binary;
    try {
      binary = claudeBinary();
    } catch (error) {
      return { error: `no claude binary on PATH: ${error.message}`, metadata: { harness: 'claude-code', skillCalls: [] } };
    }
    const dirs = prepare(caseName);
    const { root, project } = dirs;
    let pkg;
    let packageSkills;
    if (this.config.skills) {
      try {
        ({ pkg, skills: packageSkills } = await install(dirs, binary, identity));
      } catch (error) {
        return { error: `the package did not install: ${error.message}`, metadata: { harness: 'claude-code', workingDir: project, skillCalls: [] } };
      }
    }
    const token = process.env.CLAUDE_CODE_OAUTH_TOKEN;
    if (!token) {
      return {
        error: 'CLAUDE_CODE_OAUTH_TOKEN is not set: run `claude setup-token` and export the token it prints',
        metadata: { harness: 'claude-code', workingDir: project, ...(pkg ? { packageDir: pkg, packageSkills } : {}), skillCalls: [] },
      };
    }
    // docs/knowledge-base/claude-code-as-an-eval-harness.org: `CLAUDE_CODE_OAUTH_TOKEN` authenticates a run on the subscription
    const env = { ...identity, CLAUDE_CODE_OAUTH_TOKEN: token };
    const args = [
      '-p', '--output-format', 'stream-json', '--verbose', '--no-session-persistence',
      // docs/knowledge-base/claude-code-as-an-eval-harness.org: Inside bubblewrap, bypassing permissions is the sandbox's to confine
      '--permission-mode', 'bypassPermissions',
      '--model', this.config.model,
      '--', prompt,
    ];
    const started = Date.now();
    const result = await run(sandboxed(dirs, binary, env, args), this.config.timeoutMs ?? 15 * 60 * 1000);
    fs.writeFileSync(path.join(root, 'claude.jsonl'), result.stdout);
    fs.writeFileSync(path.join(root, 'claude.stderr'), result.stderr);
    const all = events(result.stdout);
    const final = all.findLast((e) => e.type === 'result');
    const problem = initProblem(all, pkg ? manifest(pkg, 'plugin.json').name : undefined);
    const metadata = { harness: 'claude-code', workingDir: project, transcript: path.join(root, 'claude.jsonl'), ...(pkg ? { packageDir: pkg, packageSkills } : {}), skillCalls: skillCalls(all), durationMs: Date.now() - started };
    // docs/knowledge-base/claude-code-as-an-eval-harness.org: A failed run ends with a `result` event carrying `is_error`, and exits 1
    if (!final || final.is_error || result.code !== 0) {
      return {
        error: final?.result ?? `claude exited ${result.code ?? result.signal}: ${result.stderr.slice(-2000)}`,
        metadata,
      };
    }
    if (problem) return { error: problem, metadata };
    return {
      output: final.result ?? '',
      cost: final.total_cost_usd ?? 0,
      metadata,
    };
  }
}
