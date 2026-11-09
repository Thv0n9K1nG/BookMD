/**
 * Utilities for detecting and converting clipboard data (rich HTML or TSV)
 * into clean GitHub-flavored Markdown.
 *
 * Supports:
 * - Tables (HTML tables from Web/Word/Excel and TSV spreadsheets)
 * - Bold (<b>, <strong>, font-weight: bold / >= 600)
 * - Italic (<i>, <em>, font-style: italic)
 * - Inline code (<code>, <kbd>, <tt>)
 * - Code blocks (<pre><code>)
 * - Blockquotes (<blockquote>)
 * - Headers (<h1> through <h6>)
 * - Links (<a href="...">)
 * - Lists (unordered <ul> and ordered <ol>, including nested levels)
 * - Strikethrough (<s>, <del>, <strike>)
 * - Line breaks (<br>) and paragraphs (<p>, <div>)
 */

export function htmlTableToMarkdown(html: string): string | null {
  if (!html || !/<table\b[^>]*>/i.test(html)) {
    return null;
  }

  const doc = getParsedDocument(html);
  if (!doc) return null;

  const table = doc.querySelector('table');
  if (!table) return null;

  return convertTableElementToMarkdown(table);
}

export function tsvToMarkdownTable(text: string): string | null {
  if (!text || !text.includes('\t')) return null;

  // If already a Markdown table syntax, leave it untouched
  if (/^\s*\|.*\|\s*$/m.test(text) && /^\s*\|?\s*:?---+:?\s*\|/m.test(text)) {
    return null;
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return null;

  const rows = lines.map((line) =>
    line.split('\t').map((c) =>
      c
        .replace(/\r?\n+/g, ' ')
        .replace(/\|/g, '\\|')
        .trim()
    )
  );

  const colCounts = rows.map((r) => r.length);
  const maxCols = Math.max(...colCounts);
  if (maxCols < 2) return null;

  // Verify that the majority of lines contain tabular columns
  const multiColRows = colCounts.filter((c) => c > 1).length;
  if (multiColRows / rows.length < 0.6) return null;

  for (const r of rows) {
    while (r.length < maxCols) {
      r.push('');
    }
  }

  const header = rows[0];
  const separator = new Array(maxCols).fill('---');
  const dataRows = rows.slice(1);
  const formatRow = (r: string[]) => `| ${r.join(' | ')} |`;

  return [formatRow(header), formatRow(separator), ...dataRows.map(formatRow)].join('\n');
}

/**
 * Converts rich HTML content into clean GitHub-flavored Markdown.
 * Returns null if the HTML has no rich semantic formatting (allowing default plain-text paste).
 */
export function htmlToMarkdown(html: string): string | null {
  if (!html || typeof html !== 'string') return null;

  // Ignore VS Code internal copy containing syntax highlighting spans
  if (
    html.includes('data-vscode') ||
    html.includes('name="generator" content="vscode"') ||
    html.includes('class="vscode-')
  ) {
    return null;
  }

  // Check if HTML has any semantic formatting
  const hasFormatting =
    /<(?:b|strong|i|em|code|pre|blockquote|h[1-6]|a|ul|ol|table|s|del|strike|hr)\b|font-weight:\s*(?:bold|[6-9]00)|font-style:\s*italic/i.test(
      html
    );
  if (!hasFormatting) {
    return null;
  }

  const doc = getParsedDocument(html);
  if (!doc) return null;

  // Remove non-content elements
  const removable = doc.body.querySelectorAll('script, style, meta, link, noscript');
  removable.forEach((el: any) => el.remove());

  function processNode(node: any, listContext: { isOrdered: boolean; index: number; depth: number } | null = null): string {
    if (node.nodeType === 3) {
      // Text node
      return node.textContent || '';
    }

    if (node.nodeType !== 1) {
      return '';
    }

    const el = node;
    const tag = el.tagName.toLowerCase();

    // Check style attribute for bold / italic
    const style = (el.getAttribute('style') || '').toLowerCase();
    const isBoldStyle = /font-weight:\s*(?:bold|[6-9]00)/.test(style);
    const isItalicStyle = /font-style:\s*italic/.test(style);

    // 1. Code blocks (<pre>)
    if (tag === 'pre') {
      const codeEl = el.querySelector('code');
      let lang = '';
      if (codeEl) {
        const cls = codeEl.getAttribute('class') || '';
        const match = cls.match(/(?:language|lang)-(\w+)/i);
        if (match) lang = match[1];
      }
      const text = el.textContent || '';
      const cleanText = text.replace(/^\n+|\n+$/g, '');
      return `\n\n\`\`\`${lang}\n${cleanText}\n\`\`\`\n\n`;
    }

    // 2. Inline Code (<code>, <kbd>, <tt>)
    if (tag === 'code' || tag === 'kbd' || tag === 'tt') {
      const text = el.textContent || '';
      return `\`${text.trim()}\``;
    }

    // 3. Headings (<h1> to <h6>)
    if (/^h[1-6]$/.test(tag)) {
      const level = parseInt(tag[1], 10);
      const prefix = '#'.repeat(level);
      const childrenText = processChildren(el).trim();
      return `\n\n${prefix} ${childrenText}\n\n`;
    }

    // 4. Blockquotes (<blockquote>)
    if (tag === 'blockquote') {
      const inner = processChildren(el).trim();
      const quoted = inner
        .replace(/\n{3,}/g, '\n\n')
        .split('\n')
        .map((line) => (line.trim() ? `> ${line}` : '>'))
        .join('\n');
      return `\n\n${quoted}\n\n`;
    }

    // 5. Tables (<table>)
    if (tag === 'table') {
      return `\n\n${convertTableElementToMarkdown(el)}\n\n`;
    }

    // 6. Lists (<ul>, <ol>)
    if (tag === 'ul' || tag === 'ol') {
      const isOrdered = tag === 'ol';
      const depth = listContext ? listContext.depth + 1 : 0;
      const start = parseInt(el.getAttribute('start') || '1', 10);
      let index = isNaN(start) ? 1 : start;

      const items = Array.from(el.children).filter(
        (c: any) => c.tagName.toLowerCase() === 'li'
      );

      const res = items
        .map((li: any) => processListItem(li, { isOrdered, index: index++, depth }))
        .join('\n');

      return depth === 0 ? `\n\n${res}\n\n` : `\n${res}`;
    }

    // 7. Links (<a>)
    if (tag === 'a') {
      const href = el.getAttribute('href') || '';
      const text = processChildren(el).trim();
      if (!href || href === '#' || href.startsWith('javascript:')) {
        return text;
      }
      return text ? `[${text}](${href})` : href;
    }

    // 8. Strikethrough (<s>, <del>, <strike>)
    if (tag === 's' || tag === 'del' || tag === 'strike') {
      const text = processChildren(el).trim();
      return text ? `~~${text}~~` : '';
    }

    // 9. Horizontal Rule (<hr>)
    if (tag === 'hr') {
      return '\n\n---\n\n';
    }

    // 10. Images (<img>)
    if (tag === 'img') {
      const src = el.getAttribute('src') || '';
      const alt = el.getAttribute('alt') || '';
      if (src) {
        return `![${alt}](${src})`;
      }
      return '';
    }

    // 11. Line breaks & Paragraphs
    if (tag === 'br') {
      return '\n';
    }

    if (tag === 'p') {
      const text = processChildren(el).trim();
      return text ? `\n\n${text}\n\n` : '';
    }

    if (tag === 'div') {
      const text = processChildren(el);
      return `\n${text}\n`;
    }

    // Children
    let content = processChildren(el);

    // Apply Bold / Italic
    const isBold = tag === 'b' || tag === 'strong' || isBoldStyle;
    const isItalic = tag === 'i' || tag === 'em' || isItalicStyle;

    if (isBold && isItalic) {
      content = wrapFormatting(content, '***');
    } else if (isBold) {
      content = wrapFormatting(content, '**');
    } else if (isItalic) {
      content = wrapFormatting(content, '*');
    }

    return content;
  }

  function processChildren(el: any): string {
    let out = '';
    for (const child of Array.from(el.childNodes)) {
      out += processNode(child);
    }
    return out;
  }

  function processListItem(li: any, ctx: { isOrdered: boolean; index: number; depth: number }): string {
    const indent = '  '.repeat(ctx.depth);
    const bullet = ctx.isOrdered ? `${ctx.index}. ` : '- ';

    // Extract nested sublists
    const sublists = Array.from(li.children).filter((c: any) =>
      ['ul', 'ol'].includes(c.tagName.toLowerCase())
    );

    let inlineContent = '';
    for (const child of Array.from(li.childNodes)) {
      if (
        (child as any).nodeType === 1 &&
        ['ul', 'ol'].includes(((child as any).tagName || '').toLowerCase())
      ) {
        continue;
      }
      inlineContent += processNode(child);
    }
    inlineContent = inlineContent.trim();

    let sublistContent = '';
    for (const sub of sublists) {
      sublistContent += processNode(sub, { isOrdered: false, index: 1, depth: ctx.depth + 1 });
    }

    return `${indent}${bullet}${inlineContent}${sublistContent}`;
  }

  const rawMd = processNode(doc.body);

  // Clean up excessive blank lines
  const cleaned = rawMd
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned || null;
}

export function wrapFormatting(text: string, marker: string): string {
  if (!text || !text.trim()) return text;
  const leadingSpaces = (text.match(/^\s*/) || [''])[0];
  const trailingSpaces = (text.match(/\s*$/) || [''])[0];
  const trimmed = text.slice(leadingSpaces.length, text.length - trailingSpaces.length);
  return `${leadingSpaces}${marker}${trimmed}${marker}${trailingSpaces}`;
}

export function convertTableCellToMarkdown(cell: any): string {
  function processInline(node: any): string {
    if (node.nodeType === 3) {
      // Text node
      const text = node.textContent || '';
      return text.replace(/\r?\n+/g, ' ').replace(/\|/g, '\\|');
    }

    if (node.nodeType !== 1) {
      return '';
    }

    const el = node;
    const tag = el.tagName.toLowerCase();
    const style = (el.getAttribute('style') || '').toLowerCase();
    const isBoldStyle = /font-weight:\s*(?:bold|[6-9]00)/.test(style);
    const isItalicStyle = /font-style:\s*italic/.test(style);

    // Code
    if (tag === 'code' || tag === 'kbd' || tag === 'tt') {
      const codeText = (el.textContent || '').replace(/\r?\n+/g, ' ').replace(/\|/g, '\\|').trim();
      return codeText ? `\`${codeText}\`` : '';
    }

    // Link
    if (tag === 'a') {
      const href = el.getAttribute('href') || '';
      const text = processChildren(el).trim();
      if (!href || href === '#' || href.startsWith('javascript:')) {
        return text;
      }
      return text ? `[${text}](${href})` : href;
    }

    // Strikethrough
    if (tag === 's' || tag === 'del' || tag === 'strike') {
      const text = processChildren(el).trim();
      return text ? `~~${text}~~` : '';
    }

    // Image
    if (tag === 'img') {
      const src = el.getAttribute('src') || '';
      const alt = el.getAttribute('alt') || '';
      return src ? `![${alt}](${src})` : '';
    }

    // Line break
    if (tag === 'br') {
      return '<br>';
    }

    let content = processChildren(el);

    if (tag === 'p' || tag === 'div') {
      content = content.trim();
    }

    const isBold = tag === 'b' || tag === 'strong' || isBoldStyle;
    const isItalic = tag === 'i' || tag === 'em' || isItalicStyle;

    if (isBold && isItalic) {
      content = wrapFormatting(content, '***');
    } else if (isBold) {
      content = wrapFormatting(content, '**');
    } else if (isItalic) {
      content = wrapFormatting(content, '*');
    }

    return content;
  }

  function processChildren(el: any): string {
    if (!el || !el.childNodes) return '';
    let out = '';
    const children = Array.from(el.childNodes);
    for (let i = 0; i < children.length; i++) {
      const child: any = children[i];
      const res = processInline(child);
      if (child.nodeType === 1 && (child.tagName.toLowerCase() === 'p' || child.tagName.toLowerCase() === 'div')) {
        if (out && !out.endsWith('<br>')) out += '<br>';
        out += res;
      } else {
        out += res;
      }
    }
    return out;
  }

  let text = processChildren(cell).trim();
  text = text.replace(/\r?\n+/g, ' ');
  return text;
}

export function convertTableElementToMarkdown(table: any): string {
  const trElements = Array.from(table.querySelectorAll('tr'));
  if (trElements.length === 0) return '';

  const rows: string[][] = [];
  let maxCols = 0;

  for (const tr of trElements as any[]) {
    const cellElements = Array.from(tr.querySelectorAll('th, td'));
    if (cellElements.length === 0) continue;

    const row = cellElements.map((cell: any) => convertTableCellToMarkdown(cell));

    if (row.length > maxCols) maxCols = row.length;
    rows.push(row);
  }

  if (rows.length === 0 || maxCols === 0) return '';

  for (const r of rows) {
    while (r.length < maxCols) r.push('');
  }

  const header = rows[0];
  const sep = new Array(maxCols).fill('---');
  const data = rows.slice(1);
  const fmt = (r: string[]) => `| ${r.join(' | ')} |`;

  return [fmt(header), fmt(sep), ...data.map(fmt)].join('\n');
}

function getParsedDocument(html: string): any {
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }

  // Fallback for tests running in Node environment
  try {
    const req = (globalThis as any).require;
    if (typeof req === 'function') {
      const { Window } = req('happy-dom');
      const win = new Window();
      const doc = win.document;
      doc.body.innerHTML = html;
      return doc;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Inspects a paste event's DataTransfer for rich text or table content.
 * Returns the converted Markdown and a flag indicating whether a table was detected,
 * or null if standard plain-text paste should occur.
 */
export function tryParseClipboardRichText(clipboardData: DataTransfer): {
  markdown: string;
  isTable: boolean;
} | null {
  const html = clipboardData.getData('text/html');
  if (html) {
    const hasTable = /<table\b[^>]*>/i.test(html);
    const md = htmlToMarkdown(html);
    if (md) {
      return {
        markdown: md,
        isTable: hasTable,
      };
    }
  }

  const plain = clipboardData.getData('text/plain');
  if (plain) {
    const fromTsv = tsvToMarkdownTable(plain);
    if (fromTsv) {
      return {
        markdown: fromTsv,
        isTable: true,
      };
    }
  }

  return null;
}

/**
 * Backwards-compatibility wrapper for table-only parsing.
 */
export function tryParseClipboardTable(clipboardData: DataTransfer): string | null {
  const parsed = tryParseClipboardRichText(clipboardData);
  if (parsed && parsed.isTable) {
    return parsed.markdown;
  }
  return null;
}
