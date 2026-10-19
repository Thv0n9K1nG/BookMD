import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';
import { normalizePathSegments } from '../src/utils/imagePath';

describe('Preview Markdown Rules & Synchronized Features', () => {
  it('maps data-source-line and data-source-end-line to block tokens for split focus', () => {
    const md = new MarkdownIt();
    md.core.ruler.push('source_lines', (state) => {
      state.tokens.forEach((token) => {
        if (token.map && token.nesting >= 0) {
          token.attrSet('data-source-line', String(token.map[0] + 1));
          token.attrSet('data-source-end-line', String(token.map[1]));
        }
      });
    });

    const markdownText = `# Section Heading

This is a paragraph.

- List item 1
- List item 2`;

    const html = md.render(markdownText);
    expect(html).toContain('data-source-line="1"');
    expect(html).toContain('data-source-line="3"');
    expect(html).toContain('data-source-line="5"');
    expect(html).toContain('data-source-line="6"');
  });

  it('generates unique anchor IDs for headings', () => {
    const md = new MarkdownIt();
    const seenSlugs = new Map<string, number>();
    md.core.ruler.push('heading_ids', (state) => {
      state.tokens.forEach((token, idx) => {
        if (token.type === 'heading_open') {
          const nextToken = state.tokens[idx + 1];
          if (nextToken && nextToken.type === 'inline' && nextToken.content) {
            let slug = nextToken.content
              .trim()
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-');
            if (slug) {
              const count = seenSlugs.get(slug) || 0;
              seenSlugs.set(slug, count + 1);
              if (count > 0) {
                slug = `${slug}-${count}`;
              }
              if (!token.attrGet('id')) {
                token.attrSet('id', slug);
              }
            }
          }
        }
      });
    });

    const markdownText = `# Architecture Overview\n\n## Sub Section\n\n## Sub Section`;
    const html = md.render(markdownText);

    expect(html).toContain('<h1 id="architecture-overview">Architecture Overview</h1>');
    expect(html).toContain('<h2 id="sub-section">Sub Section</h2>');
    expect(html).toContain('<h2 id="sub-section-1">Sub Section</h2>');
  });

  it('correctly resolves relative markdown links for in-app navigation', () => {
    // Current document: TryHackMe/Docker/image.md
    const currentDoc = 'TryHackMe/Docker/image.md';
    const currentDir = currentDoc.substring(0, currentDoc.lastIndexOf('/'));

    const href1 = 'container.md';
    const resolved1 = normalizePathSegments(`${currentDir}/${href1}`);
    expect(resolved1).toBe('TryHackMe/Docker/container.md');

    const href2 = '../Kubernetes/Pod.md';
    const resolved2 = normalizePathSegments(`${currentDir}/${href2}`);
    expect(resolved2).toBe('TryHackMe/Kubernetes/Pod.md');

    const href3 = '../../README.md';
    const resolved3 = normalizePathSegments(`${currentDir}/${href3}`);
    expect(resolved3).toBe('README.md');
  });

  it('maps source lines correctly for blockquotes and nested paragraphs', () => {
    const md = new MarkdownIt();
    md.core.ruler.push('source_lines', (state) => {
      state.tokens.forEach((token) => {
        if (token.map && token.nesting >= 0) {
          token.attrSet('data-source-line', String(token.map[0] + 1));
          token.attrSet('data-source-end-line', String(token.map[1]));
        }
      });
    });

    const markdownText = `> this is blockquote\n\ntrust antigravity`;
    const html = md.render(markdownText);
    expect(html).toContain('blockquote');
    expect(html).toContain('data-source-line="1"');
    expect(html).toContain('this is blockquote');
  });
});

