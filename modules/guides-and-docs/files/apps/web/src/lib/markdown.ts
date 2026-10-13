/**
 * A small Markdown to HTML converter for the guides shown in Settings. It handles what the guides use: headings, paragraphs, fenced code,
 * bullet and numbered lists (two levels), block quotes, tables, rules, and inline code, bold, italic and links. Everything that is not
 * markup is HTML-escaped first and only links with http(s)/mailto addresses become links, so a guide cannot inject anything.
 * Links to other guides (`OTHER.md`, `../x/OTHER.md#part`) become `data-doc` links the viewer handles itself.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s: string) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');

/** the name a guide is known by: `docs/appearance/THEMES.md` -> `appearance/THEMES` */
export function docNameFromLink(href: string): string | null {
  const m = /^(?:\.\.?\/)*((?:[\w.-]+\/)*[\w.-]+)\.md(?:#.*)?$/i.exec(href.trim());
  if (!m) return null;
  return m[1].replace(/^docs\//, '').replace(/^\.\//, '');
}

function inline(src: string): string {
  const codes: string[] = [];
  let s = src.replace(/`([^`]+)`/g, (_m, c: string) => { codes.push(`<code>${esc(c)}</code>`); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_m, text: string, href: string) => {
    const url = href.replace(/&amp;/g, '&');
    if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) return `<a href="${esc(url)}" target="_blank" rel="noreferrer noopener">${text}</a>`;
    const doc = docNameFromLink(url);
    return doc ? `<a href="#" data-doc="${esc(doc)}">${text}</a>` : text;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(>])\*([^*\s][^*]*)\*(?=$|[\s).,;:!?<])/g, '$1<em>$2</em>').replace(/(^|[\s(>])_([^_\s][^_]*)_(?=$|[\s).,;:!?<])/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => codes[Number(i)]);
}

const isTableSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l) && l.includes('-');
const cells = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim());
const listMatch = (l: string) => /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(l);

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const fence = /^\s*(```|~~~)\s*([\w-]*)/.exec(line);
    if (fence) {
      const buf: string[] = []; i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    const h = /^(#{1,4})\s+(.*?)\s*#*$/.exec(line);
    if (h) { const body = inline(h[2]); out.push(`<h${h[1].length} id="${slug(h[2])}">${body}</h${h[1].length}>`); i++; continue; }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push('<hr />'); i++; continue; }
    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(line); i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]));
      out.push(`<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${head.map((_, k) => `<td>${inline(r[k] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if (/^\s*>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${renderMarkdown(buf.join('\n'))}</blockquote>`);
      continue;
    }
    if (listMatch(line)) {
      const base = listMatch(line)![1].length;
      const items: { text: string[]; sub: string[]; ordered: boolean }[] = [];
      const ordered = /\d/.test(listMatch(line)![2]);
      while (i < lines.length) {
        const m = listMatch(lines[i]);
        if (m && m[1].length <= base + 1) {
          if (/\d/.test(m[2]) !== ordered) break; // a numbered list after a bulleted one (or the reverse) is a new list
          items.push({ text: [m[3]], sub: [], ordered: /\d/.test(m[2]) }); i++; continue;
        }
        if (m && items.length) { items[items.length - 1].sub.push(lines[i]); i++; continue; } // deeper item
        if (items.length && /^\s{2,}(```|~~~)/.test(lines[i])) { // a code block inside the item: keep it whole, fence to fence
          const last = items[items.length - 1], fenceMark = lines[i].trim().slice(0, 3);
          last.sub.push(lines[i++]);
          while (i < lines.length) { last.sub.push(lines[i]); if (lines[i++].trim().startsWith(fenceMark)) break; }
          continue;
        }
        if (lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && items.length) {
          const last = items[items.length - 1];
          if (last.sub.length) last.sub.push(lines[i]); else last.text.push(lines[i].trim());
          i++; continue;
        }
        if (!lines[i].trim() && i + 1 < lines.length && listMatch(lines[i + 1]) && /\d/.test(listMatch(lines[i + 1])![2]) === ordered && listMatch(lines[i + 1])![1].length <= base + 1) { i++; continue; }
        break;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((it) => `<li>${inline(it.text.join(' '))}${it.sub.length ? renderMarkdown(it.sub.map((l) => l.replace(/^\s{2,4}/, '')).join('\n')) : ''}</li>`).join('')}</${tag}>`);
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s*(```|~~~|#{1,4}\s|>)/.test(lines[i]) && !listMatch(lines[i]) && !(lines[i].includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1]))) buf.push(lines[i++].trim());
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}
