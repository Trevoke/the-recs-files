import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evalsDir = path.dirname(fileURLToPath(import.meta.url));
const skillsDir = path.join(evalsDir, '..', 'skills');
const casesDir = path.join(evalsDir, 'cases');
const workDir = path.join(evalsDir, '.work');

const arms = {
  'with-skills': ['.claude/skills', '.agents/skills'],
  'without-skills': [],
};

function git(cwd, ...args) {
  execFileSync('git', args, {
    cwd,
    stdio: 'ignore',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Record Keeper',
      GIT_AUTHOR_EMAIL: 'keeper@example.com',
      GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z',
      GIT_COMMITTER_NAME: 'Record Keeper',
      GIT_COMMITTER_EMAIL: 'keeper@example.com',
      GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z',
    },
  });
}

fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(path.join(workDir, 'codex-home'), { recursive: true });

for (const name of fs.readdirSync(casesDir)) {
  const fixture = path.join(casesDir, name, 'fixture');
  for (const [arm, skillRoots] of Object.entries(arms)) {
    const dest = path.join(workDir, name, arm);
    fs.cpSync(fixture, dest, { recursive: true });
    for (const root of skillRoots) {
      fs.cpSync(skillsDir, path.join(dest, root), { recursive: true });
    }
    git(dest, 'init', '--quiet', '--initial-branch=main');
    git(dest, 'add', '-A');
    git(dest, 'commit', '--quiet', '-m', 'Start the project');
    console.log(`prepared ${path.relative(evalsDir, dest)}`);
  }
}
