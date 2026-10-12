import React, { useMemo, useRef, useEffect } from 'react';
import MarkdownIt from 'markdown-it';
import { resolveImageSource } from '../../utils/imagePath';
import { readImageData } from '../../services/ipc';

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
  const containerRef = useRef<HTMLDivElement>(null);

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

    // Intercept markdown image tokens: resolve path and attach data-original-src for fallback
    instance.renderer.rules.image = function (tokens, idx, options, env, self) {
      const token = tokens[idx];
      const srcIndex = token.attrIndex('src');
      if (srcIndex >= 0 && token.attrs) {
        const rawSrc = String(token.attrs[srcIndex][1]);
        const resolved = resolveImageSource(rawSrc, relativePath, workspacePath);
        token.attrs[srcIndex][1] = resolved;
        token.attrSet('data-original-src', rawSrc);
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
        return `<img${before}${resolved}${after} data-original-src="${srcVal}">`;
      });
      return html;
    } catch (err: any) {
      return `<div style="color: var(--error);">Lỗi render markdown: ${err?.message || err}</div>`;
    }
  }, [content, md, relativePath, workspacePath]);

  // Robust fallback: if webview blocks asset protocol (403, CSP, drive letter), load image bytes via IPC
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleError = (e: Event) => {
      const target = e.target as HTMLImageElement;
      if (target && target.tagName === 'IMG') {
        const originalSrc = target.getAttribute('data-original-src') || target.getAttribute('src');
        if (originalSrc && !target.getAttribute('data-fallback-attempted')) {
          target.setAttribute('data-fallback-attempted', 'true');
          readImageData(originalSrc, relativePath)
            .then((dataUrl) => {
              if (dataUrl) {
                target.src = dataUrl;
              }
            })
            .catch((err) => {
              console.warn('IPC image load fallback failed:', err);
            });
        }
      }
    };

    // Capture phase so we intercept image error events before they are dropped
    container.addEventListener('error', handleError, true);
    return () => {
      container.removeEventListener('error', handleError, true);
    };
  }, [relativePath]);

  return (
    <div
      className="preview-pane"
      id="bookmd-preview"
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
