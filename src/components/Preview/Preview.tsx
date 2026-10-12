import React, { useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import { resolveImageSource } from '../../utils/imagePath';

interface PreviewProps {
  content: string;
  relativePath: string;
  workspacePath?: string;
}

export const Preview: React.FC<PreviewProps> = ({
  content,
  relativePath,
  workspacePath,
}) => {
  const md = useMemo(() => {
    const instance = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true,
    });

    const defaultImageRule =
      instance.renderer.rules.image ||
      function (tokens, idx, options, _env, self) {
        return self.renderToken(tokens, idx, options);
      };

    // Intercept markdown image token rendering and convert relative image paths to asset:// URLs
    instance.renderer.rules.image = function (tokens, idx, options, env, self) {
      const token = tokens[idx];
      const srcIndex = token.attrIndex('src');
      if (srcIndex >= 0 && token.attrs) {
        const rawSrc = String(token.attrs[srcIndex][1]);
        token.attrs[srcIndex][1] = resolveImageSource(rawSrc, relativePath, workspacePath);
      }
      return defaultImageRule(tokens, idx, options, env, self);
    };

    return instance;
  }, [relativePath, workspacePath]);

  const renderedHtml = useMemo(() => {
    if (!content) {
      return '<div style="color: var(--text-tertiary); font-style: italic; margin-top: 2rem;">Chưa có nội dung để xem trước...</div>';
    }
    try {
      let html = md.render(content);
      // Rewrite any raw HTML <img> tags with relative or local src
      html = html.replace(/<img\b([^>]*\bsrc=["'])([^"']+)(["'][^>]*)>/gi, (_, before, srcVal, after) => {
        const resolved = resolveImageSource(srcVal, relativePath, workspacePath);
        return `<img${before}${resolved}${after}>`;
      });
      return html;
    } catch (err: any) {
      return `<div style="color: var(--error);">Lỗi render markdown: ${err?.message || err}</div>`;
    }
  }, [content, md, relativePath, workspacePath]);

  return (
    <div
      className="preview-pane"
      id="bookmd-preview"
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
