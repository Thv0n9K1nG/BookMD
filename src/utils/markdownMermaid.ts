import mermaid from 'mermaid';

/**
 * Markdown-it plugin for Mermaid diagram blocks (```mermaid ... ```).
 * Renders a container with data-mermaid-code that will be smoothly rendered
 * to SVG and preserved across keystrokes by morphdom.
 */
export function markdownMermaidPlugin(md: any): void {
  const defaultFence =
    md.renderer.rules.fence ||
    function (tokens: any[], idx: number, options: any, _env: any, self: any) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.fence = (tokens: any[], idx: number, options: any, env: any, self: any) => {
    const token = tokens[idx];
    const info = token.info ? token.info.trim() : '';

    if (info === 'mermaid') {
      const code = token.content;
      const encoded = encodeURIComponent(code);
      const lineAttr = token.map
        ? ` data-source-line="${token.map[0] + 1}" data-source-end-line="${token.map[1]}"`
        : '';

      return `<div class="mermaid-diagram"${lineAttr} data-mermaid-code="${encoded}"><div class="mermaid-target"><div class="mermaid-loading">Đang dựng biểu đồ Mermaid...</div></div></div>`;
    }

    return defaultFence(tokens, idx, options, env, self);
  };
}

/**
 * Renders a single Mermaid code snippet to an SVG string.
 */
export async function renderMermaidSvg(
  id: string,
  code: string,
  isDark = false
): Promise<string> {
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  });

  const { svg } = await mermaid.render(id, code.trim());
  return svg;
}
