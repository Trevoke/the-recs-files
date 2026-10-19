import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fill, leftovers, renderText } from './markers.mjs';

export const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const harnesses = ['claude', 'codex', 'pi', 'agy'];
const roleFile = 'skills/recs-requesting-code-review/reviewer-role.md';
const vars = {
  plugin: 'recs-files',
  description: 'Skills for working on a project whose records are the source of truth.',
  author: 'Aldric Giacomoni',
  source: 'https://github.com/Trevoke/the-recs-files',
};

export function profile(harness) {
  return JSON.parse(fs.readFileSync(path.join(root, 'packaging', 'profiles', `${harness}.json`), 'utf8'));
}

function frontmatter(file) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const [, head, body] = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const description = head.match(/^description: \|\n((?:  .*\n?)+)/m)?.[1].replace(/^  /gm, '').trim()
    ?? head.match(/^description: (.*)$/m)[1].trim();
  return { file, name: head.match(/^name: (.*)$/m)[1].trim(), description, body };
}

function yaml(key, value) {
  if (Array.isArray(value)) return `${key}:\n${value.map((v) => `  - ${v}`).join('\n')}`;
  if (typeof value === 'string' && value.includes('\n')) return `${key}: |\n${value.split('\n').map((l) => `  ${l}`).join('\n')}`;
  return `${key}: ${value}`;
}

function files(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? files(full, base) : [path.relative(base, full)];
  }).sort();
}

export function render(harness, outArg, versionArg) {
  const p = profile(harness);
  const out = path.resolve(outArg);
  const v = { ...vars, version: versionArg.replace(/^v/, ''), repo: `the-recs-files-${harness}` };
  const problems = [];
  const write = (file, content) => {
    const full = path.join(out, file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`);
  };
  const copy = (from, to = from) => fs.cpSync(path.join(root, from), path.join(out, to), { recursive: true });

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  const agents = fs.readdirSync(path.join(root, 'agents')).sort().map((f) => frontmatter(path.join('agents', f)));
  const skills = fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const rel of files(path.join(root, 'skills'))) {
    const file = path.join('skills', rel);
    const result = renderText(fs.readFileSync(path.join(root, file), 'utf8'), p, {
      file, roleFile, roles: agents.map((a) => a.name), skills,
    });
    problems.push(...result.problems.map((m) => `${file}: ${m}`));
    write(file, result.text);
    fs.chmodSync(path.join(out, file), fs.statSync(path.join(root, file)).mode);
  }

  copy('LICENSE');
  copy('CHANGELOG.md');
  write('.github/workflows/release.yml', fs.readFileSync(path.join(root, 'packaging', 'templates', 'release.yml'), 'utf8'));
  write('README.md', `# ${v.repo}

The [recs files](${v.source}) packaged for ${p.name}: ${p.contents}, version ${v.version}.

This repository is generated from ${v.source} on each release. Open issues and
pull requests there; changes made here are overwritten.

## Install

\`\`\`sh
${fill(p.install, v).join('\n')}
\`\`\`

Then open a project and ask for \`recs-kickstart\`.

## License

MIT; see \`LICENSE\`.
`);
  for (const [file, content] of Object.entries(p.files)) write(file, fill(content, v));
  for (const [to, from] of Object.entries(p.copy ?? {})) copy(from, to);

  if (p.agents === 'copy') copy('agents');
  if (p.agents === 'generate') {
    for (const a of agents) {
      const head = [yaml('name', a.name), `description: |\n${a.description.split('\n').map((l) => `  ${l}`).join('\n')}`, ...Object.entries(p.agentFrontmatter).map(([k, val]) => yaml(k, val))];
      write(a.file, `---\n${head.join('\n')}\n---\n${a.body}`);
    }
  }
  if (p.agents === 'role file') {
    const reviewer = agents.find((a) => a.name === 'recs-code-reviewer');
    write(roleFile, reviewer.body.replace(/^\n+/, ''));
  }

  problems.push(...leftovers(out));
  if (problems.length) {
    fs.rmSync(out, { recursive: true, force: true });
    throw new Error(`${harness}: rendering refused\n- ${problems.join('\n- ')}`);
  }
  return out;
}
