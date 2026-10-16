import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [harness, outArg, versionArg] = process.argv.slice(2);
const harnesses = ['claude', 'codex', 'pi', 'agy'];

if (!harnesses.includes(harness) || !outArg || !versionArg) {
  console.error(`usage: node packaging/build.mjs <${harnesses.join('|')}> <out-dir> <version>`);
  process.exit(2);
}

const out = path.resolve(outArg);
const version = versionArg.replace(/^v/, '');
const repo = `the-recs-files-${harness}`;
const plugin = 'recs-files';
const description = 'Skills for working on a project whose records are the source of truth.';
const author = { name: 'Aldric Giacomoni' };
const source = 'https://github.com/Trevoke/the-recs-files';

function write(file, content) {
  const full = path.join(out, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`);
}

function copy(from, to = from) {
  fs.cpSync(path.join(root, from), path.join(out, to), { recursive: true });
}

const subagents = JSON.parse(fs.readFileSync(path.join(root, 'packaging', 'subagents.json'), 'utf8'));

function yaml(fields) {
  return Object.entries(fields)
    .map(([k, v]) => (Array.isArray(v) ? `${k}:\n${v.map((i) => `  - ${JSON.stringify(i)}`).join('\n')}` : `${k}: ${JSON.stringify(v)}`))
    .join('\n');
}

function writeSubagents() {
  for (const [name, agent] of Object.entries(subagents)) {
    const role = fs.readFileSync(path.join(root, agent.role), 'utf8');
    write(`agents/${name}.md`, `---\n${yaml({ name, description: agent.description, ...agent[harness] })}\n---\n\n${role}`);
  }
}

const install = {
  claude: [
    `claude plugin marketplace add Trevoke/${repo}`,
    `claude plugin install ${plugin}@the-recs-files`,
  ],
  codex: [
    `codex plugin marketplace add Trevoke/${repo}`,
    `codex plugin add ${plugin}@the-recs-files`,
  ],
  pi: [`pi install git:github.com/Trevoke/${repo}@v${version}`],
  agy: [`agy plugin install https://github.com/Trevoke/${repo}`],
};

const contents = {
  claude: 'the skills and the `recs-code-reviewer` subagent',
  codex: 'the skills, which dispatch Codex\'s own subagents',
  pi: 'the skills and a `subagent` tool for them to dispatch',
  agy: 'the skills and the `recs-code-reviewer` subagent',
};

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
copy('skills');
copy('LICENSE');
copy('CHANGELOG.md');
copy('packaging/templates/release.yml', '.github/workflows/release.yml');
write('README.md', `# ${repo}

The [recs files](${source}) packaged for ${{ claude: 'Claude Code', codex: 'Codex', pi: 'pi', agy: 'Antigravity' }[harness]}: ${contents[harness]}, version ${version}.

This repository is generated from ${source} on each release. Open issues and
pull requests there; changes made here are overwritten.

## Install

\`\`\`sh
${install[harness].join('\n')}
\`\`\`

Then open a project and ask for \`recs-kickstart\`.

## License

MIT; see \`LICENSE\`.
`);

if (harness === 'claude') {
  write('.claude-plugin/plugin.json', {
    name: plugin, version, description, author, homepage: source, repository: source, license: 'MIT',
  });
  write('.claude-plugin/marketplace.json', {
    name: 'the-recs-files',
    description,
    owner: author,
    plugins: [{ name: plugin, source: './', description, version }],
  });
  writeSubagents();
}

if (harness === 'codex') {
  write('plugin.json', {
    $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
    name: plugin, version, description,
  });
  write('.agents/plugins/marketplace.json', {
    name: 'the-recs-files',
    plugins: [{
      name: plugin,
      source: { source: 'local', path: './' },
      policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
      category: 'Coding',
    }],
  });
}

if (harness === 'pi') {
  write('package.json', {
    name: repo, version, description, license: 'MIT', repository: source,
    keywords: ['pi-package'],
    pi: { skills: ['./skills'], extensions: ['./extensions/subagent/index.ts'] },
    peerDependencies: { '@earendil-works/pi-coding-agent': '*', typebox: '*' },
  });
  copy('packaging/pi/extensions', 'extensions');
}

if (harness === 'agy') {
  write('plugin.json', {
    $schema: 'https://antigravity.google/schemas/v1/plugin.json',
    name: plugin, description,
  });
  writeSubagents();
}

console.log(`built ${repo} ${version} in ${out}`);
