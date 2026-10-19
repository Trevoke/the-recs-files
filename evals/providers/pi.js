import fs from 'node:fs';
import path from 'node:path';
import { evalsDir, events, exclude, identity, prepare as prepareProject, renderedPackage, run, sandbox } from './common.js';

const modulesDir = path.join(evalsDir, 'node_modules');
const pi = path.join(modulesDir, '@earendil-works', 'pi-coding-agent', 'dist', 'bundle', 'cli.js');
const nodeDir = path.dirname(path.dirname(process.execPath));

function prepare(caseName) {
  const dirs = prepareProject(caseName);
  const agentDir = path.join(dirs.root, 'agent');
  fs.mkdirSync(agentDir);
  return { ...dirs, agentDir };
}

async function install(dirs, env) {
  const { project, agentDir } = dirs;
  const rendered = renderedPackage('pi');
  const name = JSON.parse(fs.readFileSync(path.join(rendered, 'package.json'), 'utf8')).name;
  const pkg = path.join(project, '.pi', name);
  fs.cpSync(rendered, pkg, { recursive: true });
  exclude(project, ['/.pi/settings.json', `/.pi/${name}/`]);
  // docs/knowledge-base/pi-as-an-eval-harness.org: A project package loads only under project trust
  // docs/knowledge-base/pi-as-an-eval-harness.org: `<agent-dir>/trust.json` keeps a project trust decision; `--approve` lasts one run
  fs.writeFileSync(path.join(agentDir, 'trust.json'), `${JSON.stringify({ [project]: true }, null, 2)}\n`);
  // docs/knowledge-base/pi-as-an-eval-harness.org: `pi install -l <path>` records the path in `.pi/settings.json` and copies nothing
  const result = await run(sandboxed(dirs, env, ['install', '-l', `./${path.relative(project, pkg)}`]), 60 * 1000);
  if (result.code !== 0) throw new Error(`pi install exited ${result.code ?? result.signal}: ${result.stderr.slice(-2000)}`);
  const settings = JSON.parse(fs.readFileSync(path.join(project, '.pi', 'settings.json'), 'utf8'));
  if (!(settings.packages ?? []).includes(name)) throw new Error(`.pi/settings.json does not list ${name} in packages`);
  // docs/knowledge-base/pi-as-an-eval-harness.org: An rpc `get_commands` lists the skills a run loads, with no model reached
  const offered = await run(sandboxed(dirs, env, ['--mode', 'rpc', '--no-session', '--offline']), 60 * 1000, '{"type":"get_commands"}\n');
  const said = offered.stdout + offered.stderr;
  if (said.includes('Failed to load extension')) throw new Error(`pi could not load the package's extension: ${said.slice(-2000)}`);
  const found = new Set([...offered.stdout.matchAll(/"skill:(recs-[a-z-]+)"/g)].map((m) => m[1]));
  const missing = fs.readdirSync(path.join(pkg, 'skills'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('recs-'))
    .map((e) => e.name)
    .filter((skill) => !found.has(skill));
  if (missing.length > 0) throw new Error(`pi does not offer ${missing.join(', ')} from the installed package`);
  return { pkg, skills: [...found].sort() };
}

// docs/knowledge-base/pi-as-an-eval-harness.org: Nothing confines pi to its working directory
function sandboxed(dirs, env, args) {
  return sandbox(
    dirs,
    [[nodeDir, '/opt/node'], [modulesDir, '/opt/evals/node_modules']],
    { PATH: '/opt/node/bin:/usr/bin', HOME: dirs.home, LANG: 'C.UTF-8', ...env },
    ['/opt/node/bin/node', path.join('/opt/evals/node_modules', path.relative(modulesDir, pi)), ...args],
  );
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
    const dirs = prepare(caseName);
    const { root, project, agentDir } = dirs;
    // docs/knowledge-base/pi-as-an-eval-harness.org: `PI_CODING_AGENT_DIR` moves settings, models and auth
    const env = { ...identity, PI_CODING_AGENT_DIR: agentDir, OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? '' };
    let pkg;
    let packageSkills;
    if (this.config.skills) {
      try {
        ({ pkg, skills: packageSkills } = await install(dirs, env));
      } catch (error) {
        return { error: `the package did not install: ${error.message}`, metadata: { workingDir: project, skillCalls: [] } };
      }
    }
    const args = [
      '-p', '--mode', 'json', '--no-session',
      '--no-prompt-templates', '--no-themes', '--offline',
      '--model', this.config.model,
      '--', prompt,
    ];
    const started = Date.now();
    const result = await run(sandboxed(dirs, env, args), this.config.timeoutMs ?? 15 * 60 * 1000);
    fs.writeFileSync(path.join(root, 'pi.jsonl'), result.stdout);
    fs.writeFileSync(path.join(root, 'pi.stderr'), result.stderr);
    const all = events(result.stdout);
    const messages = all.filter((e) => e.type === 'message_end').map((e) => e.message);
    const assistant = messages.filter((m) => m?.role === 'assistant');
    const metadata = { workingDir: project, transcript: path.join(root, 'pi.jsonl'), ...(pkg ? { packageDir: pkg, packageSkills } : {}), skillCalls: skillCalls(all), durationMs: Date.now() - started };
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
