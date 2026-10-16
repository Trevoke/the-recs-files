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

function frontmatter(file) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const [, head, body] = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const description = head.match(/^description: \|\n((?:  .*\n?)+)/m)?.[1].replace(/^  /gm, '').trim()
    ?? head.match(/^description: (.*)$/m)[1].trim();
  return { name: head.match(/^name: (.*)$/m)[1].trim(), description, body };
}

function yamlBlock(text) {
  return `|\n${text.split('\n').map((l) => `  ${l}`).join('\n')}`;
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
  codex: 'the skills',
  pi: 'the skills',
  agy: 'the skills and the `recs-code-reviewer` subagent',
};

const releaseWorkflow = `name: release

on:
  push:
    tags: ['v*']

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create the release
        env:
          GH_TOKEN: \${{ github.token }}
          TAG: \${{ github.ref_name }}
        run: |
          version="\${TAG#v}"
          awk -v v="$version" '
            index($0, "## " v " ") == 1 || $0 == "## " v { on = 1; next }
            on && /^## / { exit }
            on { print }
          ' CHANGELOG.md > notes.md
          flags=""
          case "$version" in *-*) flags="--prerelease" ;; esac
          if gh release view "$TAG" >/dev/null 2>&1; then
            gh release edit "$TAG" --notes-file notes.md
          else
            gh release create "$TAG" --title "$TAG" --notes-file notes.md $flags
          fi
`;

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
copy('skills');
copy('LICENSE');
copy('CHANGELOG.md');
write('.github/workflows/release.yml', releaseWorkflow);
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
  copy('agents');
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
    pi: { skills: ['./skills'] },
  });
}

if (harness === 'agy') {
  write('plugin.json', {
    $schema: 'https://antigravity.google/schemas/v1/plugin.json',
    name: plugin, description,
  });
  for (const file of fs.readdirSync(path.join(root, 'agents'))) {
    const agent = frontmatter(path.join('agents', file));
    write(path.join('agents', file), `---
name: ${agent.name}
description: ${yamlBlock(agent.description)}
tools:
  - view_file
  - grep_search
  - run_command
mainAgent: false
subagent: true
model: inherit
---
${agent.body}`);
  }
}

console.log(`built ${repo} ${version} in ${out}`);
