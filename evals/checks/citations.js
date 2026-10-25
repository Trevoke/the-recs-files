const identifier = /(?<![\w-])(?:UL|ADR|F|UW|MSG)-\d+(?![\w-])/g;
const sectionList = /^\s+§[\w.]+(?:,[ \t]*§[\w.]+|[ \t]*[–-][ \t]*§?\d[\w.]*)*/;

function unfenced(text) {
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

function excerptOf(plain, start, at, end, titled, opened) {
  if (titled) return plain.slice(start, end + 1).replace(/\s+/g, ' ');
  const close = opened ? plain.indexOf('`', at) : -1;
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
    const before = plain.slice(Math.max(0, start - 20), start);
    const after = plain.slice(end, end + 20);
    return {
      id,
      known: title !== undefined,
      titled,
      sections: section ? section[0].split(/,|[–-]/).length : 0,
      backticked: opened && plain[end] === '`',
      broken: plain.slice(start, end).includes('\n'),
      sectionMisplaced: !section && (/§[\w.]+[ \t]+(?:of[ \t]+)?`?$/.test(before) || /^`?[ \t]*(?:,[ \t]*)?\(?§/.test(after)),
      excerpt: excerptOf(plain, start, at, end, titled, opened),
    };
  });
}
