import fs from 'node:fs';
import path from 'node:path';

export const capabilities = ['delegate', 'handoff', 'clear', 'load', 'tool', 'ask', 'memory', 'restrict'];
export const statuses = ['native', 'extension', 'prose', 'absent'];
const pattern = /\{\{trf:\s*([^}]*?)\s*\}\}/g;
const entries = { delegate: ['brief', 'sentence'], load: ['skill'], memory: ['list', 'in-progress', 'completed'] };

export function fill(value, vars) {
  if (typeof value === 'string') return value.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : vars[k]));
  if (Array.isArray(value)) return value.map((v) => fill(v, vars));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, vars)]));
  return value;
}

function parse(body) {
  const [keyword, ...args] = body.split(/\s+/).filter(Boolean);
  return { keyword, args };
}

export function markers(text) {
  return [...text.matchAll(pattern)].map((m) => ({ raw: m[0], ...parse(m[1]) }));
}

function entry(profile, { keyword, args }, context) {
  const c = profile.capabilities?.[keyword];
  if (!c) return { problem: `the ${profile.harness} harness profile has no ${keyword}` };
  if (keyword === 'delegate') {
    const [role, form] = args;
    if (args.length !== 2 || !['brief', 'sentence'].includes(form)) return { problem: 'delegate takes a role and a form, brief or sentence' };
    if (role !== 'general-purpose' && !(context.roles ?? []).includes(role)) return { problem: `${role} is not general-purpose or an agent under agents/` };
    const how = role === 'general-purpose' ? 'native' : c.roles?.[role];
    if (!how) return { problem: `the ${profile.harness} harness profile does not say how it carries ${role}` };
    const roleFile = path.posix.relative(path.posix.dirname(context.file ?? ''), context.roleFile ?? '');
    return { template: c[how === 'role file' ? `${form}-role-file` : form], vars: { role: c.roleNames?.[role] ?? role, roleFile } };
  }
  if (keyword === 'memory') {
    if (args.length > 1 || (args.length === 1 && !['in-progress', 'completed'].includes(args[0]))) return { problem: 'memory takes nothing, in-progress or completed' };
    return { template: c[args[0] ?? 'list'], vars: {} };
  }
  if (keyword === 'load') {
    if (args.length !== 1) return { problem: 'load takes one skill' };
    if (context.skills && !context.skills.includes(args[0])) return { problem: `${args[0]} is not a skill under skills/` };
    return { template: c.skill, vars: { skill: args[0] } };
  }
  return { problem: `${keyword} has no capability marker yet` };
}

export function renderText(text, profile, context = {}) {
  const problems = [];
  const rendered = text.replace(pattern, (raw, body) => {
    const marker = parse(body);
    if (!capabilities.includes(marker.keyword)) {
      problems.push(`${raw}: ${marker.keyword} is not a harness capability`);
      return raw;
    }
    const { problem, template, vars } = entry(profile, marker, context);
    if (problem || typeof template !== 'string') {
      problems.push(`${raw}: ${problem ?? `the ${profile.harness} harness profile has no entry for it`}`);
      return raw;
    }
    return fill(template, vars);
  });
  return { text: rendered, problems };
}

export function checkProfile(profile) {
  const problems = [];
  const c = profile.capabilities ?? {};
  for (const name of capabilities) {
    if (!c[name]) problems.push(`${profile.harness}: ${name} is missing`);
    else if (!statuses.includes(c[name].status)) problems.push(`${profile.harness}: ${name} has status ${c[name].status}, not ${statuses.slice(0, -1).join(', ')} or ${statuses.at(-1)}`);
  }
  problems.sort((a, b) => a.includes('is missing') - b.includes('is missing'));
  for (const [name, keys] of Object.entries(entries)) {
    const needed = name === 'delegate' && Object.values(c.delegate?.roles ?? {}).includes('role file')
      ? [...keys, 'brief-role-file', 'sentence-role-file']
      : keys;
    for (const key of needed) if (c[name] && typeof c[name][key] !== 'string') problems.push(`${profile.harness}: ${name} has no ${key} entry`);
  }
  return problems;
}

export function leftovers(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return leftovers(full, base);
    return fs.readFileSync(full, 'utf8').includes('{{trf:') ? [`${path.relative(base, full)}: a capability marker was left unrendered`] : [];
  });
}
