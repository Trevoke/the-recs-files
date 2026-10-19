import fs from 'node:fs';
import path from 'node:path';

export const capabilities = ['delegate', 'handoff', 'clear', 'load', 'tool', 'ask', 'memory', 'restrict'];
const statuses = ['native', 'extension', 'prose', 'absent'];
const pattern = /\{\{trf:\s*([^}]*?)\s*\}\}/g;
const entries = { delegate: ['brief', 'sentence'], load: ['skill'], memory: ['list', 'in-progress', 'completed'] };

export function fill(value, vars) {
  if (typeof value === 'string') return value.replace(/\{(\w+)\}/g, (m, k) => (Object.hasOwn(vars, k) ? vars[k] : m));
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
    if (how === 'role file' && !context.roleFile) return { problem: `${role} needs a role file and none was given` };
    const vars = { role: c.roleNames?.[role] ?? role };
    if (how === 'role file') vars.roleFile = path.posix.relative(path.posix.dirname(context.file ?? ''), context.roleFile);
    return { template: c[how === 'role file' ? `${form}-role-file` : form], vars };
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
  return { problem: `${keyword} is not rendered by a capability marker` };
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
    if (c[name] && !statuses.includes(c[name].status)) problems.push(`${profile.harness}: ${name} has status ${c[name].status}, not ${statuses.slice(0, -1).join(', ')} or ${statuses.at(-1)}`);
  }
  for (const name of capabilities) if (!c[name]) problems.push(`${profile.harness}: ${name} is missing`);
  for (const [role, how] of Object.entries(c.delegate?.roles ?? {})) {
    if (!['native', 'role file'].includes(how)) problems.push(`${profile.harness}: delegate carries ${role} as ${how}, not native or role file`);
  }
  for (const [name, keys] of Object.entries(entries)) {
    const needed = name === 'delegate' && Object.values(c.delegate?.roles ?? {}).includes('role file')
      ? [...keys, 'brief-role-file', 'sentence-role-file']
      : keys;
    for (const key of needed) if (c[name] && typeof c[name][key] !== 'string') problems.push(`${profile.harness}: ${name} has no ${key} entry`);
  }
  for (const field of ['requirements', 'installUser']) {
    if (!(field in profile)) continue;
    const value = profile[field];
    if (!Array.isArray(value) || value.length === 0 || !value.every((v) => typeof v === 'string' && v.length > 0)) {
      problems.push(`${profile.harness}: ${field} is not a non-empty list of strings`);
    }
  }
  return problems;
}

export function memoryFile(profile) {
  return profile.capabilities?.memory?.list?.match(/`([^`]+)`/)?.[1];
}

export function checkMemoryFile(profile) {
  if (profile.capabilities?.memory?.status !== 'prose') return [];
  const file = memoryFile(profile);
  if (!file) return [`${profile.harness}: the memory file is not named by a path`];
  return file.startsWith('/') ? [] : [`${profile.harness}: the memory file ${file} is not an absolute path`];
}

export function leftovers(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return leftovers(full, base);
    return fs.readFileSync(full, 'utf8').includes('{{trf:') ? [`${path.relative(base, full)}: a capability marker was left unrendered`] : [];
  });
}
