import { identifier as form, prefix } from './identifier.js';

const identifier = new RegExp(`(?<![\\w-])${prefix}-${form}(?![\\w-])`, 'g');
const name = '[\\w.]+(?:-[A-Za-z][\\w.]*)*';
const sectionList = new RegExp(`^\\s+§${name}(?:,[ \\t]*§${name}|[ \\t]*[–-][ \\t]*§?(?=\\d)${name})*`);
const separator = /,[ \t]*§|[ \t]*[–-][ \t]*§?\d/g;
const sectionBefore = new RegExp(`§${name}[ \\t]+(?:of[ \\t]+)?\`?$`);
const sectionAfter = /^`?[ \t]*(?:,[ \t]*)?\(?§/;
const nextCitation = new RegExp(`^\`?,?[ \\t]*§${name}[ \\t]+of[ \\t]+\`?(?:UL|ADR|F|UW|MSG)-\\d`);

export function unfenced(text) {
  let fence = null;
  return text
    .split('\n')
    .map((line) => {
      if (fence) {
        if (new RegExp(`^\\s*${fence[0]}{${fence.length},}\\s*$`).test(line)) fence = null;
        return '';
      }
      const open = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
      if (open && !(open[1][0] === '`' && open[2].includes('`'))) {
        fence = open[1];
        return '';
      }
      return line;
    })
    .join('\n');
}

function escaped(word) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, "['’]");
}

function closingTick(plain, at, opened) {
  if (!opened) return -1;
  const close = plain.indexOf('`', at);
  const lineEnd = plain.indexOf('\n', at);
  return close >= 0 && (lineEnd < 0 || close < lineEnd) ? close : -1;
}

function excerptOf(plain, start, at, end, titled, opened) {
  if (titled) return plain.slice(start, end + 1).replace(/\s+/g, ' ');
  const close = closingTick(plain, at, opened);
  const lineEnd = plain.indexOf('\n', at);
  const stop = close >= 0 ? close + 1 : lineEnd >= 0 ? lineEnd : plain.length;
  return plain.slice(start, Math.min(stop, start + 120)).replace(/\s+/g, ' ');
}

export function citations(text, titles) {
  const plain = unfenced(text);
  return [...plain.matchAll(identifier)].map((m) => {
    const id = m[0];
    const start = m.index;
    const title = titles.get(id);
    const opened = plain[start - 1] === '`';
    let at = start + id.length;
    const section = sectionList.exec(plain.slice(at));
    if (section) at += section[0].length;
    const pattern = title && new RegExp(`^\\s*:\\s+${title.split(/\s+/).map(escaped).join('\\s+')}(?![\\w'’-])`);
    const match = pattern ? pattern.exec(plain.slice(at)) : null;
    const titled = Boolean(match) && (!opened || plain[at + match[0].length] === '`');
    const end = titled ? at + match[0].length : at;
    const before = plain.slice(Math.max(0, start - 60), start);
    const after = plain.slice(end, end + 60);
    const close = closingTick(plain, at, opened);
    return {
      id,
      start: opened ? start - 1 : start,
      end: titled ? end + (plain[end] === '`' ? 1 : 0) : close >= 0 ? close + 1 : at,
      known: title !== undefined,
      titled,
      sections: section ? 1 + (section[0].match(separator) || []).length : 0,
      sectionText: section ? section[0].trim() : '',
      backticked: titled ? opened && plain[end] === '`' : closingTick(plain, at, opened) >= 0,
      broken: plain.slice(start, end).includes('\n'),
      sectionMisplaced: !section && (sectionBefore.test(before) || (sectionAfter.test(after) && !nextCitation.test(after))),
      excerpt: excerptOf(plain, start, at, end, titled, opened),
    };
  });
}

// F-20261028-1mkt §2, §3: The agent cites a record the first time a reply refers to it, says beneath it what each cited section says, then refers to it again by its title
export function titleReferences(text, titles) {
  const plain = unfenced(text);
  const refs = [];
  for (const [id, title] of titles) {
    const words = title.split(/\s+/).map(escaped).join('\\s+');
    const re = new RegExp(`\`${words}((?:[ \\t]+§${name}(?:,[ \\t]*§${name})*)?)\``, 'g');
    for (const m of plain.matchAll(re)) {
      const sectionText = m[1].trim();
      refs.push({ id, start: m.index, end: m.index + m[0].length, sectionText, sections: sectionText ? sectionText.split(',').length : 0, excerpt: m[0] });
    }
  }
  return refs.sort((a, b) => a.start - b.start);
}
