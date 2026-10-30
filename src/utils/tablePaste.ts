/**
 * Utilities for detecting and converting pasted tables (HTML tables from web/Excel/Word
 * or TSV from spreadsheets) into clean GitHub-flavored Markdown tables.
 *
 * NOTE: Intentionally strips out rich text formatting (bold, italic, font tags, etc.)
 * inside cells to keep the Markdown table clean and strictly scoped to table structure.
 */

export function htmlTableToMarkdown(html: string): string | null {
  if (!html || !/<table\b[^>]*>/i.test(html)) {
    return null;
  }

  try {
    let rows: string[][] = [];
    let maxCols = 0;

    // Use DOMParser if available in browser / WebView environment
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');
      if (!table) return null;

      const trElements = Array.from(table.querySelectorAll('tr'));
      if (trElements.length === 0) return null;

      for (const tr of trElements) {
        const cellElements = Array.from(tr.querySelectorAll('th, td'));
        if (cellElements.length === 0) continue;

        const row = cellElements.map((cell) => {
          // Extract plain text only - intentionally ignore <b>, <i>, <span>, etc.
          const text = cell.textContent || '';
          return text
            .replace(/\r?\n+/g, ' ')
            .replace(/\|/g, '\\|')
            .trim();
        });

        if (row.length > maxCols) maxCols = row.length;
        rows.push(row);
      }
    } else {
      // Regex fallback (e.g. Node.js unit tests without DOMParser)
      const trMatches = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi);
      if (!trMatches || trMatches.length === 0) return null;

      for (const tr of trMatches) {
        const cellMatches = tr.match(/<(th|td)\b[^>]*>([\s\S]*?)<\/(th|td)>/gi);
        if (!cellMatches) continue;

        const row = cellMatches.map((c) =>
          c
            .replace(/<[^>]+>/g, '')
            .replace(/\r?\n+/g, ' ')
            .replace(/\|/g, '\\|')
            .trim()
        );

        if (row.length > maxCols) maxCols = row.length;
        rows.push(row);
      }
    }

    if (rows.length === 0 || maxCols === 0) return null;

    // Pad uneven rows
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
  } catch (err) {
    console.error('Failed to convert HTML table to markdown:', err);
    return null;
  }
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
 * Inspects a paste event's DataTransfer for table content (HTML <table> or TSV data)
 * and returns the converted Markdown table string, or null if the clipboard content is not a table.
 */
export function tryParseClipboardTable(clipboardData: DataTransfer): string | null {
  const html = clipboardData.getData('text/html');
  if (html) {
    const fromHtml = htmlTableToMarkdown(html);
    if (fromHtml) return fromHtml;
  }

  const plain = clipboardData.getData('text/plain');
  if (plain) {
    const fromTsv = tsvToMarkdownTable(plain);
    if (fromTsv) return fromTsv;
  }

  return null;
}
