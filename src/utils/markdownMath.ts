import katex from 'katex';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Markdown-it plugin for KaTeX math expressions:
 * - Inline math: $math$
 * - Block math: $$math$$ or $$\nmath\n$$
 */
export function markdownMathPlugin(md: any): void {
  // 1. Inline math: $...$
  md.inline.ruler.before('escape', 'math_inline', (state: any, silent: boolean) => {
    if (state.src.charCodeAt(state.pos) !== 0x24 /* $ */) {
      return false;
    }

    // Do not match $$ (handled by block math)
    if (state.src.charCodeAt(state.pos + 1) === 0x24) {
      return false;
    }

    // Must not be preceded by backslash
    if (state.pos > 0 && state.src.charCodeAt(state.pos - 1) === 0x5c /* \ */) {
      return false;
    }

    // Must not be followed by whitespace
    const nextChar = state.src.charAt(state.pos + 1);
    if (!nextChar || /\s/.test(nextChar)) {
      return false;
    }

    // Scan for closing $
    let end = -1;
    let pos = state.pos + 1;
    while (pos < state.posMax) {
      const ch = state.src.charCodeAt(pos);
      if (ch === 0x5c /* \ */) {
        pos += 2;
        continue;
      }
      if (ch === 0x24 /* $ */) {
        // Closing $ must not be preceded by whitespace
        const prevChar = state.src.charAt(pos - 1);
        if (!/\s/.test(prevChar)) {
          // Closing $ must not be immediately followed by a digit (avoid currency e.g. $10 to $20)
          const charAfter = state.src.charAt(pos + 1);
          if (!/[0-9]/.test(charAfter)) {
            end = pos;
            break;
          }
        }
      }
      pos++;
    }

    if (end === -1) {
      return false;
    }

    if (!silent) {
      const content = state.src.slice(state.pos + 1, end);
      const token = state.push('math_inline', 'math', 0);
      token.markup = '$';
      token.content = content;
    }

    state.pos = end + 1;
    return true;
  });

  // 2. Block math: $$ ... $$
  md.block.ruler.before(
    'fence',
    'math_block',
    (state: any, startLine: number, endLine: number, silent: boolean) => {
      let pos = state.bMarks[startLine] + state.tShift[startLine];
      const max = state.eMarks[startLine];

      // Indented code block check
      if (state.sCount[startLine] - state.blkIndent >= 4) {
        return false;
      }

      if (pos + 2 > max) return false;
      if (state.src.slice(pos, pos + 2) !== '$$') return false;

      pos += 2;
      const firstLineRest = state.src.slice(pos, max).trim();
      let content = '';
      let nextLine = startLine;

      if (firstLineRest.endsWith('$$') && firstLineRest.length >= 2) {
        // Single line block math: $$ E = mc^2 $$
        content = firstLineRest.slice(0, -2).trim();
      } else {
        // Multi-line block math
        let haveEndMarker = false;
        while (nextLine < endLine) {
          nextLine++;
          if (nextLine >= endLine) break;

          const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
          const lineEnd = state.eMarks[nextLine];
          const lineText = state.src.slice(lineStart, lineEnd).trim();

          if (lineText.startsWith('$$') || lineText.endsWith('$$')) {
            haveEndMarker = true;
            break;
          }
        }

        if (!haveEndMarker) {
          return false;
        }

        const lines: string[] = [];
        if (firstLineRest) {
          lines.push(firstLineRest);
        }
        for (let l = startLine + 1; l < nextLine; l++) {
          lines.push(state.src.slice(state.bMarks[l], state.eMarks[l]));
        }

        const closingLineText = state.src
          .slice(state.bMarks[nextLine] + state.tShift[nextLine], state.eMarks[nextLine])
          .trim();
        if (closingLineText.length > 2 && closingLineText.endsWith('$$')) {
          lines.push(closingLineText.slice(0, -2));
        }

        content = lines.join('\n').trim();
      }

      if (silent) return true;

      state.line = nextLine + 1;
      const token = state.push('math_block', 'math', 0);
      token.block = true;
      token.content = content;
      token.map = [startLine, state.line];
      token.markup = '$$';

      return true;
    },
    { alt: ['paragraph', 'reference', 'blockquote', 'list'] }
  );

  // Renderers
  md.renderer.rules.math_inline = (tokens: any[], idx: number) => {
    const content = tokens[idx].content;
    try {
      return `<span class="katex-inline">${katex.renderToString(content, {
        displayMode: false,
        throwOnError: false,
      })}</span>`;
    } catch {
      return `<span class="katex-error">$${escapeHtml(content)}$</span>`;
    }
  };

  md.renderer.rules.math_block = (tokens: any[], idx: number) => {
    const token = tokens[idx];
    const content = token.content;
    const lineAttr = token.map
      ? ` data-source-line="${token.map[0] + 1}" data-source-end-line="${token.map[1]}"`
      : '';
    try {
      return `<div class="katex-block"${lineAttr}>${katex.renderToString(content, {
        displayMode: true,
        throwOnError: false,
      })}</div>`;
    } catch {
      return `<div class="katex-error"${lineAttr}>$$${escapeHtml(content)}$$</div>`;
    }
  };
}
