const identifier = /(?<![\w-])(?:UL|ADR|F|UW|MSG)-\d+(?![\w-])/g;

function unfenced(text) {
  let fenced = false;
  return text
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fenced = !fenced;
        return '';
      }
      return fenced ? '' : line;
    })
    .join('\n');
}

function escaped(word) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function citations(text, titles) {
  const plain = unfenced(text);
  return [...plain.matchAll(identifier)].map((m) => {
    const id = m[0];
    const start = m.index;
    const title = titles.get(id);
    let at = start + id.length;
    const section = /^[ \t]+§[\w.]+/.exec(plain.slice(at));
    if (section) at += section[0].length;
    const pattern = title && new RegExp(`^:\\s+${title.split(/\s+/).map(escaped).join('\\s+')}(?![\\w'’-])`);
    const titled = pattern ? pattern.exec(plain.slice(at)) : null;
    const end = titled ? at + titled[0].length : at;
    const before = plain.slice(Math.max(0, start - 20), start);
    const after = plain.slice(end, end + 20);
    return {
      id,
      known: title !== undefined,
      titled: Boolean(titled),
      backticked: plain[start - 1] === '`' && plain[end] === '`',
      broken: plain.slice(start, end).includes('\n'),
      sectionMisplaced: !section && (/§[\w.]+[ \t]+(?:of[ \t]+)?$/.test(before) || /^`?[ \t]*\(?§/.test(after)),
      excerpt: plain.slice(start, end + 1).replace(/\s+/g, ' '),
    };
  });
}
