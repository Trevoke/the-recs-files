import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [harness, dirArg] = process.argv.slice(2);
if (!harness || !dirArg) {
  console.error('usage: node packaging/check.mjs <harness> <package-dir>');
  process.exit(2);
}
const dir = path.resolve(dirArg);
const problems = [];

function check(ok, message) {
  if (!ok) problems.push(message);
}

function exists(file) {
  return fs.existsSync(path.join(dir, file));
}

function json(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  } catch (e) {
    problems.push(`${file}: ${e.message}`);
    return {};
  }
}

function frontmatter(file) {
  const m = fs.readFileSync(path.join(dir, file), 'utf8').match(/^---\n([\s\S]*?)\n---\n/);
  check(m, `${file}: no frontmatter`);
  return m?.[1] ?? '';
}

const skillDirs = (from) => fs.readdirSync(path.join(from, 'skills'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const expected = skillDirs(root);
const shipped = exists('skills') ? skillDirs(dir) : [];
check(JSON.stringify(expected) === JSON.stringify(shipped), `skills: expected ${expected.join(', ')}, found ${shipped.join(', ')}`);
for (const skill of shipped) {
  const head = frontmatter(`skills/${skill}/SKILL.md`);
  check(new RegExp(`^name: ${skill}$`, 'm').test(head), `skills/${skill}/SKILL.md: name is not ${skill}`);
  check(/^description: \S/m.test(head), `skills/${skill}/SKILL.md: no description`);
}
for (const file of ['LICENSE', 'README.md', 'CHANGELOG.md', '.github/workflows/release.yml']) {
  check(exists(file), `${file} is missing`);
}

function actions(file) {
  const text = fs.readFileSync(file, 'utf8');
  return Object.fromEntries([...text.matchAll(/uses: ([\w.-]+\/[\w.-]+)@(\S+)/g)].map((m) => [m[1], m[2]]));
}
const pinned = actions(path.join(root, '.github', 'workflows', 'package.yml'));
for (const [action, version] of Object.entries(actions(path.join(dir, '.github', 'workflows', 'release.yml')))) {
  check(!pinned[action] || pinned[action] === version, `release.yml uses ${action}@${version}; .github/workflows/package.yml uses @${pinned[action]}`);
}

const harnessProfile = JSON.parse(fs.readFileSync(path.join(root, 'packaging', 'profiles', `${harness}.json`), 'utf8'));
const subagents = harnessProfile.agents === 'copy' || harnessProfile.agents === 'generate'
  ? fs.readdirSync(path.join(root, 'agents')).map((f) => f.replace(/\.md$/, ''))
  : [];
function checkSubagents(fields) {
  for (const name of subagents) {
    const file = `agents/${name}.md`;
    if (!exists(file)) {
      problems.push(`${file} is missing`);
      continue;
    }
    const head = frontmatter(file);
    for (const field of ['name', 'description', ...fields]) {
      check(new RegExp(`^${field}:`, 'm').test(head), `${file}: no ${field}`);
    }
  }
}
if (harnessProfile.agents === 'role file') check(exists('skills/recs-requesting-code-review/reviewer-role.md'), 'the role file is missing');
check(exists('skills/skill-flow.dot'), 'skills/skill-flow.dot is missing');

if (harness === 'claude') {
  const plugin = json('.claude-plugin/plugin.json');
  const market = json('.claude-plugin/marketplace.json');
  check(plugin.name && plugin.version, '.claude-plugin/plugin.json: name or version missing');
  check(market.plugins?.some((p) => p.name === plugin.name), '.claude-plugin/marketplace.json does not list the plugin');
  checkSubagents([]);
}

if (harness === 'codex') {
  const plugin = json('plugin.json');
  const market = json('.agents/plugins/marketplace.json');
  check(plugin.name && plugin.version, 'plugin.json: name or version missing');
  const entry = market.plugins?.find((p) => p.name === plugin.name);
  check(entry, '.agents/plugins/marketplace.json does not list the plugin');
  check(entry?.policy?.installation && entry?.policy?.authentication && entry?.category, 'marketplace entry needs policy.installation, policy.authentication and category');
}

if (harness === 'pi') {
  const pkg = json('package.json');
  check(pkg.keywords?.includes('pi-package'), 'package.json: no pi-package keyword');
  for (const p of [...(pkg.pi?.skills ?? []), ...(pkg.pi?.extensions ?? [])]) {
    check(exists(p), `package.json lists ${p}, which is missing`);
  }
  check((pkg.pi?.extensions ?? []).length > 0, 'package.json: no subagent extension');
}

if (harness === 'agy') {
  const plugin = json('plugin.json');
  const extra = Object.keys(plugin).filter((k) => !['$schema', 'name', 'description'].includes(k));
  check(extra.length === 0, `plugin.json: agy allows only $schema, name and description; found ${extra.join(', ')}`);
  check(/^[a-zA-Z0-9-_]+$/.test(plugin.name ?? ''), 'plugin.json: name must match ^[a-zA-Z0-9-_]+$');
  checkSubagents(['tools']);
}

if (problems.length) {
  console.error(`${harness}: ${problems.length} problem(s)\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`${harness}: package checks pass`);
