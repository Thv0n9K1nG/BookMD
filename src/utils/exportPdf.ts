import MarkdownIt from 'markdown-it';
import { resolveImageSource } from './imagePath';
import { readImageData } from '../services/ipc';
import { markdownMathPlugin } from './markdownMath';

/**
 * Compiles markdown content to a standalone, print-optimized HTML string
 * with embedded/resolved images and typography designed for clean PDF export.
 */
export async function generatePrintHtml(
  title: string,
  markdownContent: string,
  docRelativePath: string,
  workspacePath?: string
): Promise<string> {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: true,
    typographer: true,
  });

  // Enable KaTeX math expressions in export
  md.use(markdownMathPlugin);

  // Render markdown to HTML
  let bodyHtml = md.render(markdownContent);

  // Convert image tags to use base64 data URLs where possible for 100% self-contained print HTML
  const imgMatches = Array.from(bodyHtml.matchAll(/<img\b([^>]*\bsrc=["'])([^"']+)(["'][^>]*)>/gi));
  for (const match of imgMatches) {
    const rawSrc = match[2];
    try {
      const dataUrl = await readImageData(rawSrc, docRelativePath);
      if (dataUrl) {
        bodyHtml = bodyHtml.replace(match[0], `<img${match[1]}${dataUrl}${match[3]}>`);
        continue;
      }
    } catch {
      // If IPC read fails or not in Tauri, fallback to resolveImageSource
    }
    const resolved = resolveImageSource(rawSrc, docRelativePath, workspacePath);
    bodyHtml = bodyHtml.replace(match[0], `<img${match[1]}${resolved}${match[3]}>`);
  }

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css" crossorigin="anonymous">
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.65;
      color: #1e293b;
      background: #ffffff !important;
      margin: 0;
      padding: 0;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #0f172a;
      font-weight: 700;
      page-break-after: avoid;
      break-after: avoid;
    }
    h1 {
      font-size: 22pt;
      margin-top: 0;
      margin-bottom: 12pt;
      padding-bottom: 6pt;
      border-bottom: 2px solid #e2e8f0;
    }
    h2 {
      font-size: 16pt;
      margin-top: 18pt;
      margin-bottom: 8pt;
      padding-bottom: 4pt;
      border-bottom: 1px solid #e2e8f0;
    }
    h3 {
      font-size: 13pt;
      margin-top: 14pt;
      margin-bottom: 6pt;
    }
    p {
      margin-top: 0;
      margin-bottom: 10pt;
    }
    a {
      color: #4f46e5;
      text-decoration: underline;
    }
    code {
      font-family: 'JetBrains Mono', 'Consolas', 'Courier New', monospace;
      font-size: 0.9em;
      background: #f1f5f9;
      color: #4338ca;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    pre {
      background: #0f172a !important;
      color: #f8fafc !important;
      padding: 12pt 14pt;
      border-radius: 6px;
      overflow-x: auto;
      page-break-inside: avoid;
      break-inside: avoid;
      margin: 12pt 0;
    }
    pre code {
      background: none !important;
      color: inherit !important;
      border: none !important;
      padding: 0 !important;
      font-size: 9.5pt;
      line-height: 1.5;
    }
    blockquote {
      border-left: 4px solid #6366f1;
      margin: 12pt 0;
      padding: 6pt 14pt;
      background: #f8fafc;
      color: #475569;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    blockquote > p {
      margin: 0;
      line-height: 1.5;
    }
    blockquote > p + p {
      margin-top: 6pt;
    }
    blockquote > :first-child {
      margin-top: 0;
    }
    blockquote > :last-child {
      margin-bottom: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6pt 10pt;
      text-align: left;
      font-size: 10pt;
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
      color: #0f172a;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      margin: 10pt 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    ul, ol {
      margin-top: 0;
      margin-bottom: 10pt;
      padding-left: 20pt;
    }
    li {
      margin-bottom: 4pt;
    }
    hr {
      border: none;
      border-top: 1px solid #cbd5e1;
      margin: 16pt 0;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

/**
 * Loads the HTML content into an isolated invisible iframe and triggers native print.
 * This ensures ONLY the document content is printed (zero BookMD UI elements).
 */
export function printHtmlViaIframe(fullHtml: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Remove any leftover print iframes first
    const existing = document.querySelectorAll('.bookmd-print-iframe');
    existing.forEach((node) => node.remove());

    const iframe = document.createElement('iframe');
    iframe.className = 'bookmd-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    let printed = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let onloadTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      if (onloadTimer) {
        clearTimeout(onloadTimer);
        onloadTimer = null;
      }
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    };

    const doPrint = () => {
      if (printed) return;
      printed = true;

      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      if (onloadTimer) {
        clearTimeout(onloadTimer);
        onloadTimer = null;
      }

      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve(true);
      } catch (err) {
        console.error('Print dialog error:', err);
        resolve(false);
      } finally {
        cleanup();
      }
    };

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      cleanup();
      resolve(false);
      return;
    }

    doc.open();
    doc.write(fullHtml);
    doc.close();

    if (iframe.contentWindow) {
      iframe.contentWindow.onload = () => {
        onloadTimer = setTimeout(doPrint, 150);
      };
      // Fallback timer in case onload already passed or didn't fire
      fallbackTimer = setTimeout(doPrint, 600);
    } else {
      doPrint();
    }
  });
}

