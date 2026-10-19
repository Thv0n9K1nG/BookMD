import React, { useMemo, useRef, useEffect } from 'react';
import MarkdownIt from 'markdown-it';
import { openUrl } from '@tauri-apps/plugin-opener';
import { resolveImageSource } from '../../utils/imagePath';
import { readImageData, isTauri } from '../../services/ipc';
import { ViewMode } from '../../types';

interface PreviewProps {
  content: string;
  relativePath: string;
  workspacePath?: string;
  activeLine?: number;
  viewMode?: ViewMode;
  onNavigateToFile?: (relPath: string) => void;
}

export const Preview: React.FC<PreviewProps> = ({
  content,
  relativePath,
  workspacePath,
  activeLine,
  viewMode,
  onNavigateToFile,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeFocusElRef = useRef<HTMLElement | null>(null);
  const scrollTimeoutRef = useRef<any>(null);

  const md = useMemo(() => {
    const instance = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true,
    });

    // 1. Map source lines to block tokens for split-view scroll sync and focus zooming
    instance.core.ruler.push('source_lines', (state) => {
      state.tokens.forEach((token) => {
        if (token.map && token.nesting >= 0) {
          token.attrSet('data-source-line', String(token.map[0] + 1));
          token.attrSet('data-source-end-line', String(token.map[1]));
        }
      });
    });

    // 2. Automatically generate unique IDs for headings for internal anchor jumps
    instance.core.ruler.push('heading_ids', (state) => {
      const seenSlugs = new Map<string, number>();
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

    // 3. Mark external links with target="_blank" and noopener
    const defaultLinkRule =
      instance.renderer.rules.link_open ||
      function (tokens, idx, options, _env, self) {
        return self.renderToken(tokens, idx, options);
      };

    instance.renderer.rules.link_open = function (tokens, idx, options, env, self) {
      const token = tokens[idx];
      const hrefIndex = token.attrIndex('href');
      if (hrefIndex >= 0 && token.attrs) {
        const href = String(token.attrs[hrefIndex][1]);
        if (/^(https?:\/\/|mailto:|tel:)/i.test(href)) {
          token.attrSet('target', '_blank');
          token.attrSet('rel', 'noopener noreferrer');
        }
      }
      return defaultLinkRule(tokens, idx, options, env, self);
    };

    // 4. Intercept markdown image tokens: resolve path and attach data-original-src for fallback
    const defaultImageRule =
      instance.renderer.rules.image ||
      function (tokens, idx, options, _env, self) {
        return self.renderToken(tokens, idx, options);
      };

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
      html = html.replace(/<img\b([^>]*\bsrc=["'])([^"']+)(["'])([^>]*?)(\/?)>/gi, (match, before, srcVal, quote, rest, selfClose) => {
        if (match.includes('data-original-src=')) {
          return match;
        }
        const resolved = resolveImageSource(srcVal, relativePath, workspacePath);
        return `<img${before}${resolved}${quote}${rest} data-original-src="${srcVal}"${selfClose ? ' /' : ''}>`;
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

    container.addEventListener('error', handleError, true);
    return () => {
      container.removeEventListener('error', handleError, true);
    };
  }, [relativePath]);

  // Intercept all link clicks in preview:
  // - NEVER navigate the current webview (prevents app from becoming a web browser)
  // - External URLs open in system browser via @tauri-apps/plugin-opener
  // - Anchors scroll smoothly within preview
  // - Relative markdown links open inside BookMD tabs
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleLinkClick = async (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Crucial: prevent webview navigation
      e.preventDefault();
      e.stopPropagation();

      // In-page anchor link (e.g. #section or #heading-title)
      if (href.startsWith('#')) {
        const rawId = href.slice(1);
        const decodedId = decodeURIComponent(rawId).toLowerCase();
        const target =
          container.querySelector(`[id="${CSS.escape(rawId)}"]`) ||
          container.querySelector(`[name="${CSS.escape(rawId)}"]`) ||
          Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).find((h) => {
            const headingText = (h.textContent || '').trim().toLowerCase();
            const headingSlug = headingText.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            return headingSlug === decodedId || headingText === decodedId || h.id === rawId;
          });

        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      // External web / mailto links: open in system default browser
      if (/^(https?:\/\/|mailto:|tel:)/i.test(href)) {
        try {
          if (isTauri) {
            await openUrl(href);
          } else {
            window.open(href, '_blank', 'noopener,noreferrer');
          }
        } catch (err) {
          console.error('Failed to open external URL:', err);
          window.open(href, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      // Relative markdown files (e.g. guide.md or ./docs/setup.md)
      if (href.endsWith('.md') || href.includes('.md#')) {
        onNavigateToFile?.(href);
        return;
      }
    };

    container.addEventListener('click', handleLinkClick);
    return () => {
      container.removeEventListener('click', handleLinkClick);
    };
  }, [onNavigateToFile]);

  // Synchronized zoom/focus in Split mode:
  // As the user writes or moves cursor in the editor, focus & center the preview pane on the exact section
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (viewMode !== 'split' || typeof activeLine !== 'number') {
      if (activeFocusElRef.current) {
        activeFocusElRef.current.classList.remove('preview-active-focus');
        activeFocusElRef.current = null;
      }
      return;
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const candidates = Array.from(
        container.querySelectorAll<HTMLElement>('[data-source-line]')
      );
      if (candidates.length === 0) return;

      let bestEl: HTMLElement | null = null;
      let minSpan = Infinity;
      let bestStartLine = -1;

      for (const el of candidates) {
        const start = parseInt(el.getAttribute('data-source-line') || '0', 10);
        const end = parseInt(el.getAttribute('data-source-end-line') || String(start), 10);

        if (start <= activeLine && activeLine <= end) {
          const span = end - start;
          // Prefer more specific element (e.g. li over parent ul/ol)
          if (span < minSpan) {
            minSpan = span;
            bestEl = el;
          }
        } else if (minSpan === Infinity && start <= activeLine && start > bestStartLine) {
          bestStartLine = start;
          bestEl = el;
        }
      }

      if (!bestEl && activeLine <= 1) {
        bestEl = candidates[0];
      }

      if (!bestEl) return;

      // If code inside pre, target the pre container
      let targetEl =
        bestEl.tagName === 'CODE' && bestEl.parentElement?.tagName === 'PRE'
          ? (bestEl.parentElement as HTMLElement)
          : bestEl;

      // If inside blockquote, target the blockquote element
      if (targetEl.parentElement?.tagName === 'BLOCKQUOTE') {
        targetEl = targetEl.parentElement as HTMLElement;
      } else if (targetEl.closest('blockquote')) {
        targetEl = targetEl.closest('blockquote') as HTMLElement;
      }

      if (activeFocusElRef.current !== targetEl) {
        if (activeFocusElRef.current) {
          activeFocusElRef.current.classList.remove('preview-active-focus');
        }
        targetEl.classList.add('preview-active-focus');
        activeFocusElRef.current = targetEl;

        // Smoothly center the element in preview pane if not already comfortably visible
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const isComfortablyVisible =
          targetRect.top >= containerRect.top + 40 &&
          targetRect.bottom <= containerRect.bottom - 40;

        if (!isComfortablyVisible) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        // Keep focus class attached even if DOM re-rendered from typing
        if (!targetEl.classList.contains('preview-active-focus')) {
          targetEl.classList.add('preview-active-focus');
        }
      }
    }, 60);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [activeLine, viewMode, renderedHtml]);

  return (
    <div
      className="preview-pane"
      id="bookmd-preview"
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
