import MarkdownIt from 'markdown-it';
import { resolveImageSource } from './imagePath';
import { readImageData } from '../services/ipc';
import { markdownMathPlugin } from './markdownMath';
import { markdownMermaidPlugin } from './markdownMermaid';
import { PdfExportConfig } from '../types';
import footnote from 'markdown-it-footnote';
import mermaid from 'mermaid';

export const DEFAULT_PDF_EXPORT_CONFIG: PdfExportConfig = {
  enableHeader: false,
  headerLeft: '{title}',
  headerCenter: '',
  headerRight: '{date}',
  enableFooter: false,
  footerLeft: '{workspace}',
  footerCenter: '',
  footerRight: '{page} / {pages}',
  showDivider: true,
  hideOnFirstPage: false,
  fontSizePt: 9,
  textColor: '#64748b',
};

export interface PdfTemplateVars {
  title: string;
  date: string;
  workspace: string;
}

function escapeCssStringLiteral(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, ' ');
}

function escapeHtmlText(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeCssColor(color: string | undefined): string {
  if (!color) return '#64748b';
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)$/i.test(trimmed)) return trimmed;
  return '#64748b';
}

/**
 * Formats a header/footer template string for preview display (substituting {page} and {pages} placeholders too).
 */
export function formatPdfTemplatePreview(
  template: string,
  vars: PdfTemplateVars & { page?: string; pages?: string }
): string {
  if (!template) return '';
  return template
    .replace(/\{title\}/gi, vars.title)
    .replace(/\{date\}/gi, vars.date)
    .replace(/\{workspace\}/gi, vars.workspace)
    .replace(/\{page\}/gi, vars.page ?? '1')
    .replace(/\{pages\}/gi, vars.pages ?? '5');
}

/**
 * Converts a template string containing {title}, {date}, {workspace}, {page}, {pages}
 * into a CSS `content` expression using CSS `counter(page)` and `counter(pages)`.
 */
export function templateToCssContent(template: string, vars: PdfTemplateVars): string {
  if (!template || !template.trim()) return 'none';

  const resolvedStatic = template
    .replace(/\{title\}/gi, vars.title)
    .replace(/\{date\}/gi, vars.date)
    .replace(/\{workspace\}/gi, vars.workspace);

  const tokens = resolvedStatic.split(/(\{page\}|\{pages\})/gi).filter((part) => part.length > 0);
  if (tokens.length === 0) return 'none';

  const cssParts = tokens.map((part) => {
    const lower = part.toLowerCase();
    if (lower === '{page}') return 'counter(page)';
    if (lower === '{pages}') return 'counter(pages)';
    return `"${escapeCssStringLiteral(part)}"`;
  });

  return cssParts.join(' ');
}

/**
 * Generates CSS `@page` rules with custom margin boxes for PDF header & footer.
 */
export function buildPagedHeaderFooterCss(
  config: PdfExportConfig | undefined,
  vars: PdfTemplateVars
): string {
  const cfg = config || DEFAULT_PDF_EXPORT_CONFIG;

  const hasHeader =
    cfg.enableHeader &&
    [cfg.headerLeft, cfg.headerCenter, cfg.headerRight].some((s) => Boolean(s && s.trim()));
  const hasFooter =
    cfg.enableFooter &&
    [cfg.footerLeft, cfg.footerCenter, cfg.footerRight].some((s) => Boolean(s && s.trim()));

  const topMargin = hasHeader ? '22mm' : '18mm';
  const bottomMargin = hasFooter ? '22mm' : '18mm';

  if (!hasHeader && !hasFooter) {
    return `@page {\n      size: A4;\n      margin: ${topMargin} 16mm ${bottomMargin} 16mm;\n    }`;
  }

  const fontSizePt = Math.min(14, Math.max(7, Number(cfg.fontSizePt) || 9));
  const textColor = sanitizeCssColor(cfg.textColor);
  const sharedBoxStyle = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: ${fontSizePt}pt; color: ${textColor}; white-space: nowrap;`;

  const headerDividerStyle = cfg.showDivider
    ? 'border-bottom: 0.5pt solid #cbd5e1; padding-bottom: 4pt; margin-bottom: 4pt;'
    : '';
  const footerDividerStyle = cfg.showDivider
    ? 'border-top: 0.5pt solid #cbd5e1; padding-top: 4pt; margin-top: 4pt;'
    : '';

  const buildSlotRule = (slot: string, text: string, isRowActive: boolean, extraStyle: string) => {
    if (!isRowActive) return '';
    const contentExpr = text && text.trim() ? templateToCssContent(text, vars) : cfg.showDivider ? '""' : 'none';
    if (contentExpr === 'none') return '';
    return `\n      ${slot} {\n        content: ${contentExpr};\n        ${sharedBoxStyle}\n        ${extraStyle}\n      }`;
  };

  const headerCss =
    buildSlotRule('@top-left', cfg.headerLeft, hasHeader, `${headerDividerStyle} vertical-align: bottom; text-align: left;`) +
    buildSlotRule('@top-center', cfg.headerCenter, hasHeader, `${headerDividerStyle} vertical-align: bottom; text-align: center;`) +
    buildSlotRule('@top-right', cfg.headerRight, hasHeader, `${headerDividerStyle} vertical-align: bottom; text-align: right;`);

  const footerCss =
    buildSlotRule('@bottom-left', cfg.footerLeft, hasFooter, `${footerDividerStyle} vertical-align: top; text-align: left;`) +
    buildSlotRule('@bottom-center', cfg.footerCenter, hasFooter, `${footerDividerStyle} vertical-align: top; text-align: center;`) +
    buildSlotRule('@bottom-right', cfg.footerRight, hasFooter, `${footerDividerStyle} vertical-align: top; text-align: right;`);

  const firstPageRule = cfg.hideOnFirstPage
    ? `\n    @page :first {\n      margin-top: 18mm;\n      margin-bottom: 18mm;\n      @top-left { content: none; border: none; }\n      @top-center { content: none; border: none; }\n      @top-right { content: none; border: none; }\n      @bottom-left { content: none; border: none; }\n      @bottom-center { content: none; border: none; }\n      @bottom-right { content: none; border: none; }\n    }`
    : '';

  return `@page {
      size: A4;
      margin: ${topMargin} 16mm ${bottomMargin} 16mm;${headerCss}${footerCss}
    }${firstPageRule}`;
}

/**
 * Compiles markdown content to a standalone, print-optimized HTML string
 * with embedded/resolved images and typography designed for clean PDF export.
 */
export async function generatePrintHtml(
  title: string,
  markdownContent: string,
  docRelativePath: string,
  workspacePath?: string,
  pdfConfig?: PdfExportConfig
): Promise<string> {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: true,
    typographer: true,
  });

  // Enable KaTeX math expressions in export
  md.use(markdownMathPlugin);

  // Enable Markdown Footnotes in export
  md.use(footnote);

  // Enable Mermaid diagram blocks in export
  md.use(markdownMermaidPlugin);

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

  // Render Mermaid diagrams into clean vector SVGs for PDF export
  const mermaidRegex = /<div class="mermaid-diagram"[^>]*data-mermaid-code="([^"]+)"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g;
  const mermaidMatches = Array.from(bodyHtml.matchAll(mermaidRegex));
  if (mermaidMatches.length > 0 && typeof document !== 'undefined') {
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      });

      for (let i = 0; i < mermaidMatches.length; i++) {
        const match = mermaidMatches[i];
        const rawCode = decodeURIComponent(match[1]).trim();
        const id = `mermaid-pdf-${Date.now()}-${i}`;
        try {
          const { svg } = await mermaid.render(id, rawCode);
          bodyHtml = bodyHtml.replace(
            match[0],
            `<div class="mermaid-print-diagram" style="margin: 14pt 0; text-align: center; page-break-inside: avoid;">${svg}</div>`
          );
        } catch (renderErr) {
          console.warn('Failed to render mermaid diagram for PDF export:', renderErr);
        }
      }
    } catch (initErr) {
      console.warn('Failed to initialize mermaid for PDF export:', initErr);
    }
  }

  const cleanWorkspaceName = workspacePath
    ? workspacePath.replace(/\\/g, '/').replace(/\/+$/, '').split('/').pop() || ''
    : '';
  const todayStr = new Date().toLocaleDateString();
  const pageRuleCss = buildPagedHeaderFooterCss(pdfConfig, {
    title: title || docRelativePath,
    date: todayStr,
    workspace: cleanWorkspaceName,
  });

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>${escapeHtmlText(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css" crossorigin="anonymous">
  <style>
    ${pageRuleCss}
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
      overflow: visible !important;
      overflow-x: visible !important;
      white-space: pre-wrap !important;
      word-break: break-all !important;
      overflow-wrap: break-word !important;
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
      white-space: pre-wrap !important;
      word-break: break-all !important;
      overflow-wrap: break-word !important;
    }
    .code-block-wrapper {
      margin: 12pt 0;
      page-break-inside: avoid;
      break-inside: avoid;
      overflow: visible !important;
    }
    .code-block-wrapper pre {
      margin: 0;
    }
    .code-copy-btn, .mermaid-copy-btn {
      display: none !important;
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
    /* Footnotes in Print / PDF */
    .footnote-ref {
      font-size: 0.75em;
      line-height: 0;
      vertical-align: super;
      padding-left: 1px;
    }
    .footnote-ref a {
      color: #4f46e5;
      text-decoration: none;
      font-weight: 600;
    }
    .footnotes-sep {
      margin: 24pt 0 12pt 0;
      border: 0;
      border-top: 1px solid #cbd5e1;
    }
    .footnotes {
      font-size: 9pt;
      color: #64748b;
      line-height: 1.5;
    }
    .footnotes-list {
      padding-left: 16pt;
      margin: 0;
    }
    .footnote-item {
      margin-bottom: 4pt;
    }
    .footnote-item p {
      display: inline;
      margin: 0;
    }
    .footnote-backref {
      color: #4f46e5;
      text-decoration: none;
      margin-left: 3pt;
    }
    /* Mermaid Diagrams in Print / PDF */
    .mermaid-print-diagram {
      margin: 16pt 0;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .mermaid-print-diagram svg {
      max-width: 100% !important;
      height: auto !important;
      display: inline-block;
      margin: 0 auto;
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

