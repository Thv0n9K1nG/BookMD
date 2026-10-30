import { describe, it, expect } from 'vitest';
import {
  htmlTableToMarkdown,
  tsvToMarkdownTable,
  tryParseClipboardTable,
} from '../src/utils/tablePaste';

describe('tablePaste utility', () => {
  it('converts standard HTML tables to GitHub-flavored Markdown tables and discards bold/italic inside cells', () => {
    const html = `
      <table>
        <thead>
          <tr><th>Name</th><th><b>Age</b></th><th>Role</th></tr>
        </thead>
        <tbody>
          <tr><td>Alice</td><td><i>25</i></td><td>Engineer</td></tr>
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
    // Ensure <b> and <i> tags are stripped, not converted to ** or *
    expect(md).not.toContain('<b>');
    expect(md).not.toContain('<i>');
    expect(md).not.toContain('**');
    expect(md).not.toContain('*25*');
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

  it('returns null for regular non-table HTML content', () => {
    const regularHtml = `<p>This is a <b>bold</b> paragraph with <i>italic</i> text.</p>`;
    expect(htmlTableToMarkdown(regularHtml)).toBeNull();
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

  it('does not re-convert an already formatted Markdown table', () => {
    const markdownTable = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    expect(tsvToMarkdownTable(markdownTable)).toBeNull();
  });

  it('works with tryParseClipboardTable mock DataTransfer', () => {
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
