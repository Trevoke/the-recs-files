import fs from 'node:fs';
import path from 'node:path';
import { markers } from './markers.mjs';

const edgeLine = /^\s*"([^"]+)"\s*->\s*"([^"]+)"\s*\[([^\]]*)\]\s*;?\s*$/;
const nodeLine = /^\s*"([^"]+)"\s*;?\s*$/;
const frameLine = /^\s*(digraph\s+\w+\s*\{|\}|\/\/.*)?\s*$/;
const kinds = ['load', 'handoff', 'delegate'];
const categories = { UW: 'user-workflows', ADR: 'architectural-decisions' };

export function parseFlow(text) {
  const nodes = new Set();
  const edges = [];
  const problems = [];
  text.split('\n').forEach((line, i) => {
    const edge = edgeLine.exec(line);
    if (edge) {
      const attrs = Object.fromEntries([...edge[3].matchAll(/(\w+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
      edges.push({ from: edge[1], to: edge[2], ...attrs });
      nodes.add(edge[1]).add(edge[2]);
      return;
    }
    const node = nodeLine.exec(line);
    if (node) nodes.add(node[1]);
    else if (!frameLine.test(line)) problems.push(`skill-flow.dot:${i + 1}: not a node or an edge`);
  });
  return { nodes, edges, problems };
}

// ADR-2 §Consequences: The recs files live apart from any project that uses them
export function shippedFlow(text) {
  return text.replace(/\s*\[\s*cite="[^"]*"\s*\]/g, '').replace(/,\s*cite="[^"]*"/g, '').replace(/cite="[^"]*",\s*/g, '');
}

function escape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function checkCitation(root, citation) {
  const cite = citation.trim();
  const m = /^(UW|ADR)-(\d+) §([^:]+): (.+)$/.exec(cite);
  if (!m) return `${cite}: not a citation of a record's section`;
  const [, prefix, n, section, title] = m;
  const dir = path.join(root, 'docs', categories[prefix]);
  const file = fs.existsSync(dir) && fs.readdirSync(dir).find((f) => f.startsWith(`${prefix.toLowerCase()}-${n}-`));
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

function isNode(skillsDir, skills, n) {
  if (skills.includes(n)) return true;
  const m = /^([^/]+)\/([^/]+\.md)$/.exec(n);
  return Boolean(m) && skills.includes(m[1]) && m[2] !== 'SKILL.md' && fs.statSync(path.join(skillsDir, n), { throwIfNoEntry: false })?.isFile() === true;
}

// ADR-11 §Decision: Keep the order of the skills in a skill flow beside them
// ADR-11 §Consequences: Keep the order of the skills in a skill flow beside them
export function checkFlow(root) {
  const skillsDir = path.join(root, 'skills');
  const flowFile = path.join(skillsDir, 'skill-flow.dot');
  if (!fs.existsSync(flowFile)) return ['skills/skill-flow.dot is missing'];
  const { nodes, edges, problems } = parseFlow(fs.readFileSync(flowFile, 'utf8'));
  const skills = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();

  for (const s of skills) if (!nodes.has(s)) problems.push(`skill-flow.dot: ${s} is not a node`);
  for (const n of nodes) if (!isNode(skillsDir, skills, n)) problems.push(`skill-flow.dot: ${n} is neither a skill nor a prompt template`);

  const found = skills.flatMap((skill) => files(path.join(skillsDir, skill)).flatMap((file) =>
    markers(fs.readFileSync(path.join(skillsDir, skill, file), 'utf8'))
      .filter((m) => m.keyword === 'load' || m.keyword === 'delegate')
      .map((m) => ({ skill, file, keyword: m.keyword, arg: m.args[0] }))));

  for (const e of edges) {
    const name = `skill-flow.dot: ${e.from} -> ${e.to}`;
    if (!kinds.includes(e.kind)) problems.push(`${name} has kind ${e.kind}, not load, handoff or delegate`);
    if (!e.cite) problems.push(`${name} cites nothing`);
    for (const c of (e.cite ?? '').split(';').map((x) => x.trim()).filter(Boolean)) {
      const record = /^([A-Z]+-\d+) §/.exec(c);
      if (record && !record[1].startsWith('UW-') && record[1] !== 'ADR-9') {
        problems.push(`${name}: ${c} is neither a user workflow step or extension nor ADR-9`);
        continue;
      }
      const p = checkCitation(root, c);
      if (p) problems.push(`${name}: ${p}`);
    }
    if (e.kind === 'load' && !found.some((f) => f.keyword === 'load' && f.skill === e.from && f.arg === e.to)) problems.push(`${name}: no load capability marker in ${e.from}`);
    if (e.kind === 'delegate' && !found.some((f) => f.keyword === 'delegate' && (`${f.skill}/${f.file}` === e.to || (f.skill === e.from && f.file === 'SKILL.md')))) problems.push(`${name}: no delegate capability marker in ${e.to} or ${e.from}/SKILL.md`);
  }
  for (const f of found) {
    const where = `skills/${f.skill}/${f.file}`;
    if (f.keyword === 'load' && !edges.some((e) => e.kind === 'load' && e.from === f.skill && e.to === f.arg)) problems.push(`${where}: load ${f.arg} has no load edge from ${f.skill}`);
    if (f.keyword === 'delegate' && f.file !== 'SKILL.md' && !edges.some((e) => e.kind === 'delegate' && e.from === f.skill && e.to === `${f.skill}/${f.file}`)) problems.push(`${where}: delegate has no delegate edge from ${f.skill} to ${f.skill}/${f.file}`);
    if (f.keyword === 'delegate' && f.file === 'SKILL.md' && !edges.some((e) => e.kind === 'delegate' && e.from === f.skill)) problems.push(`${where}: delegate has no delegate edge from ${f.skill}`);
  }
  return problems;
}
