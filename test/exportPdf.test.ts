import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PDF_EXPORT_CONFIG,
  formatPdfTemplatePreview,
  templateToCssContent,
  buildPagedHeaderFooterCss,
  generatePrintHtml,
} from '../src/utils/exportPdf';

describe('PDF Export Header & Footer Utilities', () => {
  it('converts template strings with placeholders and counters to valid CSS content expressions', () => {
    const vars = {
      title: 'Note "A"',
      date: '26/11/2026',
      workspace: 'SecNotes',
    };

    expect(templateToCssContent('', vars)).toBe('none');
    expect(templateToCssContent('{title}', vars)).toBe('"Note \\"A\\""');
    expect(templateToCssContent('Trang {page} / {pages}', vars)).toBe(
      '"Trang " counter(page) " / " counter(pages)'
    );
    expect(templateToCssContent('{workspace} - {date} ({page})', vars)).toBe(
      '"SecNotes - 26/11/2026 (" counter(page) ")"'
    );
  });

  it('formats live template preview with page defaults', () => {
    const formatted = formatPdfTemplatePreview('{title} | Trang {page}/{pages}', {
      title: 'Docker.md',
      date: '26/11/2026',
      workspace: 'DevOps',
      page: '2',
      pages: '8',
    });
    expect(formatted).toBe('Docker.md | Trang 2/8');
  });

  it('builds clean default @page rule when header and footer are disabled', () => {
    const css = buildPagedHeaderFooterCss(DEFAULT_PDF_EXPORT_CONFIG, {
      title: 'README.md',
      date: '26/11/2026',
      workspace: 'BookMD',
    });

    expect(css).toContain('size: A4;');
    expect(css).toContain('margin: 18mm 16mm 18mm 16mm;');
    expect(css).not.toContain('@top-left');
    expect(css).not.toContain('@bottom-right');
  });

  it('generates @page margin boxes, divider borders, and @page :first suppression when configured', () => {
    const css = buildPagedHeaderFooterCss(
      {
        ...DEFAULT_PDF_EXPORT_CONFIG,
        enableHeader: true,
        headerLeft: '{title}',
        headerCenter: '',
        headerRight: '{date}',
        enableFooter: true,
        footerLeft: '{workspace}',
        footerCenter: '',
        footerRight: '{page} / {pages}',
        showDivider: true,
        hideOnFirstPage: true,
        fontSizePt: 10,
        textColor: '#334155',
      },
      {
        title: 'Pentest.md',
        date: '26/11/2026',
        workspace: 'TryHackMe',
      }
    );

    expect(css).toContain('margin: 22mm 16mm 22mm 16mm;');
    expect(css).toContain('@top-left');
    expect(css).toContain('content: "Pentest.md";');
    expect(css).toContain('@top-center');
    expect(css).toContain('content: "";');
    expect(css).toContain('@top-right');
    expect(css).toContain('@bottom-right');
    expect(css).toContain('counter(page) " / " counter(pages)');
    expect(css).toContain('font-size: 10pt;');
    expect(css).toContain('color: #334155;');
    expect(css).toContain('border-bottom: 0.5pt solid #cbd5e1;');
    expect(css).toContain('@page :first');
  });

  it('embeds generated @page rules cleanly inside generatePrintHtml output', async () => {
    const html = await generatePrintHtml(
      'Guide <v1>',
      '# Hello World\n\nSome content.',
      'docs/guide.md',
      'C:/Projects/BookMD',
      {
        ...DEFAULT_PDF_EXPORT_CONFIG,
        enableHeader: true,
        headerLeft: '{title}',
        enableFooter: true,
        footerRight: 'Page {page} of {pages}',
      }
    );

    expect(html).toContain('<title>Guide &lt;v1&gt;</title>');
    expect(html).toContain('@top-left');
    expect(html).toContain('"Guide <v1>"');
    expect(html).toContain('@bottom-right');
    expect(html).toContain('"Page " counter(page) " of " counter(pages)');
    expect(html).toContain('Hello World');
  });
});
