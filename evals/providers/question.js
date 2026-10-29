import fs from 'node:fs';
import path from 'node:path';

// docs/architectural-decisions/adr-20261029-cfj8-keep-the-evals-questions-in-a-repository-of-their-own-beside-the-project.org
export function question(request) {
  const named = /^question:(.+)$/.exec(String(request).trim());
  if (!named) return request;
  const dir = process.env.RECS_EVALS_QUESTIONS;
  if (!dir) throw new Error('RECS_EVALS_QUESTIONS is not set: it names the checkout of the-recs-files-evals');
  return fs.readFileSync(path.join(dir, 'cases', named[1]), 'utf8').trim();
}

// docs/architectural-decisions/adr-20261029-cfj8-keep-the-evals-questions-in-a-repository-of-their-own-beside-the-project.org
export function situation(request) {
  const named = /^question:(.+)\.md$/.exec(String(request).trim());
  const dir = process.env.RECS_EVALS_QUESTIONS;
  if (!named || !dir) return '';
  const file = path.join(dir, 'cases', `${named[1]}.situation.md`);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : '';
}
