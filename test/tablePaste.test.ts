// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  htmlTableToMarkdown,
  tsvToMarkdownTable,
  htmlToMarkdown,
  tryParseClipboardRichText,
  tryParseClipboardTable,
} from '../src/utils/tablePaste';

describe('Rich Text & Table Paste Utilities', () => {
  it('converts standard HTML tables to GitHub-flavored Markdown tables', () => {
    const html = `
      <table>
        <thead>
          <tr><th>Name</th><th>Age</th><th>Role</th></tr>
        </thead>
        <tbody>
          <tr><td>Alice</td><td>25</td><td>Engineer</td></tr>
          <tr><td>Bob</td><td>30</td><td>Designer</td></tr>
        </tbody>
      </table>
    `;

    const md = htmlTableToMarkdown(html);
    expect(md).not.toBeNull();
    expect(md).toContain('| Name | Age | Role |');
    expect(md).toContain('| --- | --- | --- |');
    expect(md).toContain('| Alice | 25 | Engineer |');
    expect(md).toContain('| Bob | 30 | Designer |');
  });

  it('escapes pipe characters and collapses multiline text inside table cells', () => {
    const html = `
      <table>
        <tr><th>Feature</th><th>Syntax | Symbol</th></tr>
        <tr><td>Pipe support</td><td>A | B</td></tr>
        <tr><td>Multiline</td><td>Line 1<br>Line 2</td></tr>
      </table>
    `;

    const md = htmlTableToMarkdown(html);
    expect(md).not.toBeNull();
    expect(md).toContain('Syntax \\| Symbol');
    expect(md).toContain('A \\| B');
  });

  it('preserves bold, italic, code, links, and strikethrough inside table cells', () => {
    const html = `
      <table>
        <thead>
          <tr>
            <th><b>Feature</b></th>
            <th><i>Status</i></th>
            <th><code>Command</code></th>
            <th>Reference</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Fast Search</strong></td>
            <td><em>Active</em></td>
            <td><code>Ctrl + F</code></td>
            <td><a href="https://example.com/search">Docs</a></td>
          </tr>
          <tr>
            <td><span style="font-weight: bold; font-style: italic">VIP Mode</span></td>
            <td><s>Deprecated</s></td>
            <td><code>git checkout -b main</code></td>
            <td>Visit <a href="https://github.com">GitHub</a></td>
          </tr>
          <tr>
            <td>Paragraphs</td>
            <td><p>Part 1</p><p>Part 2</p></td>
            <td><code>echo "a | b"</code></td>
            <td>Normal</td>
          </tr>
        </tbody>
      </table>
    `;

    const md = htmlTableToMarkdown(html);
    expect(md).not.toBeNull();
    // Headers
    expect(md).toContain('| **Feature** | *Status* | `Command` | Reference |');
    // Row 1
    expect(md).toContain('| **Fast Search** | *Active* | `Ctrl + F` | [Docs](https://example.com/search) |');
    // Row 2
    expect(md).toContain('***VIP Mode***');
    expect(md).toContain('~~Deprecated~~');
    expect(md).toContain('`git checkout -b main`');
    expect(md).toContain('Visit [GitHub](https://github.com)');
    // Row 3
    expect(md).toContain('Part 1<br>Part 2');
    expect(md).toContain('`echo "a \\| b"`');
  });

  it('converts tab-separated values (TSV) from spreadsheets into Markdown tables', () => {
    const tsv = "ID\tProduct\tPrice\n1\tLaptop\t$999\n2\tPhone\t$699";
    const md = tsvToMarkdownTable(tsv);
    expect(md).not.toBeNull();
    expect(md).toContain('| ID | Product | Price |');
    expect(md).toContain('| --- | --- | --- |');
    expect(md).toContain('| 1 | Laptop | $999 |');
    expect(md).toContain('| 2 | Phone | $699 |');
  });

  it('converts rich text: bold, italic, and inline code', () => {
    const html = `<p>This is <b>bold</b>, <strong>strong</strong>, <i>italic</i>, <em>emphasis</em>, and <code>const a = 1;</code>.</p>`;
    const md = htmlToMarkdown(html);
    expect(md).not.toBeNull();
    expect(md).toContain('**bold**');
    expect(md).toContain('**strong**');
    expect(md).toContain('*italic*');
    expect(md).toContain('*emphasis*');
    expect(md).toContain('`const a = 1;`');
  });

  it('converts CSS font-weight:bold and font-style:italic spans', () => {
    const html = `<p><span style="font-weight: bold">Bold styled</span> and <span style="font-style: italic">Italic styled</span></p>`;
    const md = htmlToMarkdown(html);
    expect(md).not.toBeNull();
    expect(md).toContain('**Bold styled**');
    expect(md).toContain('*Italic styled*');
  });

  it('converts headings from h1 to h6', () => {
    const html = `<h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3>`;
    const md = htmlToMarkdown(html);
    expect(md).not.toBeNull();
    expect(md).toContain('# Heading 1');
    expect(md).toContain('## Heading 2');
    expect(md).toContain('### Heading 3');
  });

  it('converts blockquotes cleanly with single prefix per line', () => {
    const html = `<blockquote><p>Line 1 of quote</p><p>Line 2 of quote</p></blockquote>`;
    const md = htmlToMarkdown(html);
    expect(md).not.toBeNull();
    expect(md).toContain('> Line 1 of quote');
    expect(md).toContain('> Line 2 of quote');
  });

  it('converts links preserving anchor text and href URL', () => {
    const html = `<p>Visit <a href="https://github.com">GitHub</a> for code.</p>`;
    const md = htmlToMarkdown(html);
    expect(md).not.toBeNull();
    expect(md).toContain('[GitHub](https://github.com)');
  });

  it('converts unordered and ordered lists including nested sublists', () => {
    const html = `
      <ul>
        <li>Item 1</li>
        <li>Item 2
          <ul>
            <li>Subitem A</li>
            <li>Subitem B</li>
          </ul>
        </li>
      </ul>
      <ol>
        <li>First step</li>
        <li>Second step</li>
      </ol>
    `;
    const md = htmlToMarkdown(html);
    expect(md).not.toBeNull();
    expect(md).toContain('- Item 1');
    expect(md).toContain('- Item 2');
    expect(md).toContain('  - Subitem A');
    expect(md).toContain('  - Subitem B');
    expect(md).toContain('1. First step');
    expect(md).toContain('2. Second step');
  });

  it('converts code blocks with language detection', () => {
    const html = `<pre><code class="language-typescript">console.log("hello");</code></pre>`;
    const md = htmlToMarkdown(html);
    expect(md).not.toBeNull();
    expect(md).toContain('```typescript\nconsole.log("hello");\n```');
  });

  it('converts strikethrough tags', () => {
    const html = `<p>Price: <s>$100</s> <del>$80</del> <strong>$50</strong></p>`;
    const md = htmlToMarkdown(html);
    expect(md).not.toBeNull();
    expect(md).toContain('~~$100~~');
    expect(md).toContain('~~$80~~');
    expect(md).toContain('**$50**');
  });

  it('ignores VS Code internal syntax-highlighted copy', () => {
    const vscodeHtml = `<div data-vscode="true" class="vscode-editor"><span>const x = 1;</span></div>`;
    expect(htmlToMarkdown(vscodeHtml)).toBeNull();
  });

  it('returns null for plain text without rich formatting', () => {
    const plainHtml = `<p>Plain text with no special formatting whatsoever.</p>`;
    expect(htmlToMarkdown(plainHtml)).toBeNull();
  });

  it('works with tryParseClipboardRichText mock DataTransfer', () => {
    const mockDataTransfer = {
      getData: (type: string) => {
        if (type === 'text/html') {
          return '<p>Check out <b>BookMD</b> at <a href="https://github.com">repo</a>!</p>';
        }
        return 'Check out BookMD at repo!';
      },
    } as unknown as DataTransfer;

    const res = tryParseClipboardRichText(mockDataTransfer);
    expect(res).not.toBeNull();
    expect(res?.isTable).toBe(false);
    expect(res?.markdown).toContain('**BookMD**');
    expect(res?.markdown).toContain('[repo](https://github.com)');
  });

  it('works with tryParseClipboardTable backwards compatibility', () => {
    const mockDataTransfer = {
      getData: (type: string) => {
        if (type === 'text/html') {
          return '<table><tr><th>Col1</th><th>Col2</th></tr><tr><td>Val1</td><td>Val2</td></tr></table>';
        }
        return 'Col1\tCol2\nVal1\tVal2';
      },
    } as unknown as DataTransfer;

    const res = tryParseClipboardTable(mockDataTransfer);
    expect(res).not.toBeNull();
    expect(res).toContain('| Col1 | Col2 |');
  });
});
