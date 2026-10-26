import fs from 'node:fs';
import path from 'node:path';
import { changedFiles, read, result, workingDir } from './workspace.js';

const prefix = '(?:ADR|F|UW|UL|MSG)';
const recordFile = /^docs\/[^/]+\/(?:adr|f|uw|ul|msg)-\d+-[^/]*\.org$/;
const projectionEntry = new RegExp(`^- ${prefix}-\\d+ ::`);
const wholeProjectionEntry = new RegExp(`^- ${prefix}-\\d+ :: \\[\\[[^\\]\\n]+\\]\\[[^\\]\\n]+\\]\\]$`);
const drawerLine = /^:[A-Za-z0-9_-]+\+?:(?: .*)?$/;

function changedOrg(context) {
  return changedFiles(context)
    .filter((f) => f.endsWith('.org'))
    .map((file) => ({ file, text: read(context, file) }))
    .filter((f) => f.text !== undefined);
}

export function lineFaults(file, text) {
  const lines = text.split('\n');
  const faults = [];
  const at = (i, what) => faults.push(`${file}:${i + 1} ${what}`);
  if (recordFile.test(file) && !(/^\* /.test(lines[0] ?? '') && lines[1] === ':PROPERTIES:')) {
    at(0, 'heading not followed by its drawer');
  }
  let drawer = null;
  lines.forEach((line, i) => {
    if (line === ':PROPERTIES:') {
      if (i === 0 || !/^\*+ /.test(lines[i - 1])) at(i, 'drawer not directly under a heading');
      drawer = new Set();
      return;
    }
    if (drawer) {
      if (line === ':END:') {
        drawer = null;
        return;
      }
      if (!drawerLine.test(line)) {
        at(i, `broken property line: ${line.trim()}`);
        return;
      }
      const key = line.match(/^:([A-Za-z0-9_-]+)\+?:/)?.[1];
      if (key && drawer.has(key)) at(i, `property repeated: ${key}`);
      if (key) drawer.add(key);
      return;
    }
    const opened = (line.match(/\[\[/g) ?? []).length;
    const closed = (line.match(/\]\]/g) ?? []).length;
    if (opened !== closed) at(i, 'link broken across lines');
    if (projectionEntry.test(line) && !wholeProjectionEntry.test(line)) at(i, 'projection line broken');
    if (/^\s*\|/.test(line) && !/\|\s*$/.test(line)) at(i, 'table row broken');
  });
  if (drawer) at(lines.length - 1, 'drawer never closed');
  return faults;
}

export function plainNames(file, text) {
  if (!recordFile.test(file)) return [];
  const names = [];
  text.split('\n').forEach((line, i) => {
    if (i === 0) return;
    const bare = line.replace(/\[\[[^\]]*\]\[[^\]]*\]\]/g, '');
    for (const m of bare.matchAll(new RegExp(`\\b${prefix}-\\d+\\b`, 'g'))) names.push(`${file}:${i + 1} ${m[0]}`);
  });
  return names;
}

export function deadLinks(dir, file, text) {
  const dead = [];
  for (const m of text.matchAll(/\[\[([^\]\n]+)\]\[[^\]\n]*\]\]/g)) {
    const target = m[1].replace(/^file:/, '').replace(/::.*$/, '');
    if (/^[a-z]+:/i.test(target)) continue;
    if (!fs.existsSync(path.join(dir, path.dirname(file), target))) dead.push(`${file} ${target}`);
  }
  return dead;
}

export function linesWhole(output, context) {
  const faults = changedOrg(context).flatMap((f) => lineFaults(f.file, f.text));
  return result(faults.length === 0, faults.length ? faults.join('; ') : 'every org line whole');
}

export function namesByLink(output, context) {
  const names = changedOrg(context).flatMap((f) => plainNames(f.file, f.text));
  return result(names.length === 0, names.length ? `plain names: ${names.join('; ')}` : 'every record named by a link');
}

export function linksResolve(output, context) {
  const dir = workingDir(context);
  const dead = changedOrg(context).flatMap((f) => deadLinks(dir, f.file, f.text));
  return result(dead.length === 0, dead.length ? `dead links: ${dead.join('; ')}` : 'every link resolves');
}
