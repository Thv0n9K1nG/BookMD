import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';
import { generateHeadingSlug, stripVietnameseDiacritics } from '../src/utils/slug';
import { markdownMathPlugin } from '../src/utils/markdownMath';

describe('slug and Vietnamese heading anchors', () => {
  it('generates exact GitHub-style slug for Vietnamese headings with punctuation', () => {
    const heading = '1. Môi trường Phân tích & Quy trình Tái lập Độc lập';
    const slug = generateHeadingSlug(heading);
    expect(slug).toBe('1-môi-trường-phân-tích--quy-trình-tái-lập-độc-lập');
  });

  it('handles diacritics stripping correctly', () => {
    const text = 'môi-trường-phân-tích--quy-trình-tái-lập-độc-lập';
    const stripped = stripVietnameseDiacritics(text);
    expect(stripped).toBe('moi-truong-phan-tich--quy-trinh-tai-lap-doc-lap');
  });
});

describe('markdownMathPlugin', () => {
  const md = new MarkdownIt();
  md.use(markdownMathPlugin);

  it('renders inline math expressions with KaTeX', () => {
    const input = 'Công thức năng lượng là $E = mc^2$ của Einstein.';
    const html = md.render(input);
    expect(html).toContain('class="katex-inline"');
    expect(html).toContain('class="katex"');
  });

  it('renders multi-line block math expressions with KaTeX', () => {
    const input = '$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$';
    const html = md.render(input);
    expect(html).toContain('class="katex-block"');
    expect(html).toContain('class="katex-display"');
  });

  it('renders single-line block math expressions with KaTeX', () => {
    const input = '$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$';
    const html = md.render(input);
    expect(html).toContain('class="katex-block"');
  });

  it('does not falsely parse currency symbols as math', () => {
    const input = 'Giá từ $10 đến $20 mỗi món.';
    const html = md.render(input);
    expect(html).not.toContain('class="katex"');
    expect(html).toContain('$10');
    expect(html).toContain('$20');
  });
});
