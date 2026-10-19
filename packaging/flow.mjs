import fs from 'node:fs';
import path from 'node:path';
import { markers } from './markers.mjs';

const edgeLine = /^\s*"([^"]+)"\s*->\s*"([^"]+)"\s*\[([^\]]*)\]\s*;?\s*$/;
const nodeLine = /^\s*"([^"]+)"\s*;?\s*$/;
const kinds = ['load', 'handoff', 'delegate'];
const categories = { UW: 'user-workflows', ADR: 'architectural-decisions', F: 'features', UL: 'ubiquitous-language', MSG: 'message-catalog' };

export function parseFlow(text) {
  const nodes = new Set();
  const edges = [];
  for (const line of text.split('\n')) {
    const edge = edgeLine.exec(line);
    if (edge) {
      const attrs = Object.fromEntries([...edge[3].matchAll(/(\w+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
      edges.push({ from: edge[1], to: edge[2], ...attrs });
      nodes.add(edge[1]).add(edge[2]);
      continue;
    }
    const node = nodeLine.exec(line);
    if (node) nodes.add(node[1]);
  }
  return { nodes, edges };
}

// ADR-2 §Consequences: The recs files live apart from any project that uses them
export function shippedFlow(text) {
  return text.replace(/,\s*cite="[^"]*"/g, '').replace(/cite="[^"]*",\s*/g, '');
}

function escape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function checkCitation(root, citation) {
  const m = /^(UW|ADR|F|UL|MSG)-(\d+) §([^:]+): (.+)$/.exec(citation.trim());
  if (!m) return `${citation.trim()}: not a citation of a record's section`;
  const [, prefix, n, section, title] = m;
  const dir = path.join(root, 'docs', categories[prefix]);
  const file = fs.existsSync(dir) && fs.readdirSync(dir).find((f) => f.startsWith(`${prefix.toLowerCase()}-${n}-`));
  const cite = citation.trim();
  if (!file) return `${cite}: ${prefix}-${n} is not on disk`;
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  if (!text.startsWith(`* ${prefix}-${n} ${title}\n`)) return `${cite}: ${prefix}-${n} is not titled ${title}`;
  if (!/^:STATUS: Accepted$/m.test(text)) return `${cite}: ${prefix}-${n} is not Accepted`;
  const heading = prefix === 'UW' ? new RegExp(`^\\*{3} ${escape(section)}\\. `, 'm') : new RegExp(`^\\*\\* ${escape(section)}$`, 'm');
  if (!heading.test(text)) return `${cite}: ${prefix}-${n} has no section ${section}`;
  return undefined;
}

function files(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? files(full, base) : [path.relative(base, full)];
  }).sort();
}

// ADR-11 §Consequences: Keep the order of the skills in a skill flow beside them
export function checkFlow(root) {
  const skillsDir = path.join(root, 'skills');
  const flowFile = path.join(skillsDir, 'skill-flow.dot');
  if (!fs.existsSync(flowFile)) return ['skills/skill-flow.dot is missing'];
  const { nodes, edges } = parseFlow(fs.readFileSync(flowFile, 'utf8'));
  const problems = [];
  const skills = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();

  for (const s of skills) if (!nodes.has(s)) problems.push(`skill-flow.dot: ${s} is not a node`);
  for (const n of nodes) if (!fs.existsSync(path.join(skillsDir, n))) problems.push(`skill-flow.dot: ${n} is neither a skill nor a prompt template`);

  const found = skills.flatMap((skill) => files(path.join(skillsDir, skill)).flatMap((file) =>
    markers(fs.readFileSync(path.join(skillsDir, skill, file), 'utf8'))
      .filter((m) => m.keyword === 'load' || m.keyword === 'delegate')
      .map((m) => ({ skill, file, keyword: m.keyword, arg: m.args[0] }))));

  for (const e of edges) {
    const name = `skill-flow.dot: ${e.from} -> ${e.to}`;
    if (!kinds.includes(e.kind)) problems.push(`${name} has kind ${e.kind}, not load, handoff or delegate`);
    if (!e.cite) problems.push(`${name} cites nothing`);
    for (const c of (e.cite ?? '').split(';').filter((x) => x.trim())) {
      const p = checkCitation(root, c);
      if (p) problems.push(`${name}: ${p}`);
    }
    if (e.kind === 'load' && !found.some((f) => f.keyword === 'load' && f.skill === e.from && f.arg === e.to)) problems.push(`${name}: no load capability marker in ${e.from}`);
    if (e.kind === 'delegate' && !found.some((f) => f.keyword === 'delegate' && f.skill === e.from)) problems.push(`${name}: no delegate capability marker in ${e.from}`);
  }
  for (const f of found) {
    const where = `skills/${f.skill}/${f.file}`;
    if (f.keyword === 'load' && !edges.some((e) => e.kind === 'load' && e.from === f.skill && e.to === f.arg)) problems.push(`${where}: load ${f.arg} has no load edge from ${f.skill}`);
    if (f.keyword === 'delegate' && f.file !== 'SKILL.md' && !edges.some((e) => e.kind === 'delegate' && e.from === f.skill && e.to === `${f.skill}/${f.file}`)) problems.push(`${where}: delegate has no delegate edge from ${f.skill} to ${f.skill}/${f.file}`);
    if (f.keyword === 'delegate' && f.file === 'SKILL.md' && !edges.some((e) => e.kind === 'delegate' && e.from === f.skill)) problems.push(`${where}: delegate has no delegate edge from ${f.skill}`);
  }
  return problems;
}
