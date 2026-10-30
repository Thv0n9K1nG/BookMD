import React, { useMemo, useRef, useEffect, useState } from 'react';
import MarkdownIt from 'markdown-it';
import morphdom from 'morphdom';
import 'katex/dist/katex.min.css';
import { openUrl } from '@tauri-apps/plugin-opener';
import { resolveImageSource } from '../../utils/imagePath';
import { readImageData, isTauri } from '../../services/ipc';
import { ViewMode } from '../../types';
import { CopyIcon } from '../common/Icons';
import { generateHeadingSlug, findHeadingElement } from '../../utils/slug';
import { markdownMathPlugin } from '../../utils/markdownMath';
import footnote from 'markdown-it-footnote';

interface PreviewProps {
  content: string;
  relativePath: string;
  workspacePath?: string;
  activeLine?: number;
  viewMode?: ViewMode;
  onNavigateToFile?: (relPath: string) => void;
  onToast?: (message: string, type?: 'info' | 'success' | 'error') => void;
}

export const Preview: React.FC<PreviewProps> = ({
  content,
  relativePath,
  workspacePath,
  activeLine,
  viewMode,
  onNavigateToFile,
  onToast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeFocusElRef = useRef<HTMLElement | null>(null);
  const scrollTimeoutRef = useRef<any>(null);
  const prevDocPathRef = useRef<string>(relativePath);
  const [copyMenu, setCopyMenu] = useState<{
    x: number;
    y: number;
    text: string;
    label: string;
  } | null>(null);

  const md = useMemo(() => {
    const instance = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true,
    });

    // Support LaTeX math expressions ($...$ and $...$)
    instance.use(markdownMathPlugin);

    // Support Markdown Footnotes ([^1] and [^1]: ...)
    instance.use(footnote);

    // 1. Map source lines to block tokens for split-view scroll sync and focus zooming
    instance.core.ruler.push('source_lines', (state) => {
      state.tokens.forEach((token) => {
        if (token.map && token.nesting >= 0) {
          token.attrSet('data-source-line', String(token.map[0] + 1));
          token.attrSet('data-source-end-line', String(token.map[1]));
        }
      });
    });

    // 2. Automatically generate unique IDs for headings for internal anchor jumps (Vietnamese/Unicode supported)
    instance.core.ruler.push('heading_ids', (state) => {
      const seenSlugs = new Map<string, number>();
      state.tokens.forEach((token, idx) => {
        if (token.type === 'heading_open') {
          const nextToken = state.tokens[idx + 1];
          if (nextToken && nextToken.type === 'inline' && nextToken.content) {
            let slug = generateHeadingSlug(nextToken.content);
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

  // Robust DOM reconciliation using morphdom to eliminate image flickering on typing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Full reset if switching to a different file or first render
    if (prevDocPathRef.current !== relativePath || !container.hasChildNodes()) {
      prevDocPathRef.current = relativePath;
      container.innerHTML = renderedHtml;
      return;
    }

    // Morph the DOM tree smoothly, preserving existing image elements and focus
    const temp = document.createElement('div');
    temp.className = 'preview-pane';
    temp.id = 'bookmd-preview';
    temp.innerHTML = renderedHtml;

    morphdom(container, temp, {
      childrenOnly: true,
      onBeforeElUpdated(fromEl, toEl) {
        // Preserve code copy buttons inside <pre>
        if (fromEl.classList && fromEl.classList.contains('code-copy-btn')) {
          return false;
        }

        // Image stability: If image source hasn't changed, retain the existing DOM node completely!
        if (fromEl.tagName === 'IMG') {
          const fromSrc = fromEl.getAttribute('data-original-src') || fromEl.getAttribute('src');
          const toSrc = toEl.getAttribute('data-original-src') || toEl.getAttribute('src');
          if (fromSrc && fromSrc === toSrc) {
            // Update attributes if needed, but do not replace or reload the image DOM element
            if (toEl.hasAttribute('alt')) fromEl.setAttribute('alt', toEl.getAttribute('alt')!);
            if (toEl.hasAttribute('title')) fromEl.setAttribute('title', toEl.getAttribute('title')!);
            if (toEl.hasAttribute('width')) fromEl.setAttribute('width', toEl.getAttribute('width')!);
            return false;
          }
        }

        // Preserve current active focus indicator
        if (fromEl.classList && fromEl.classList.contains('preview-active-focus')) {
          toEl.classList.add('preview-active-focus');
        }

        return true;
      },
    });
  }, [renderedHtml, relativePath]);

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
  // - Anchors scroll smoothly within preview (Vietnamese/Unicode support)
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

      // In-page anchor link (e.g. #1-môi-trường-phân-tích--quy-trình-tái-lập-độc-lập)
      if (href.startsWith('#')) {
        const target = findHeadingElement(container, href);
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

  // Synchronized zoom/focus in Split and Preview modes:
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if ((viewMode !== 'split' && viewMode !== 'preview') || typeof activeLine !== 'number') {
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

  // 1. Add copy buttons to code blocks in the rendered markdown
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preElements = container.querySelectorAll<HTMLPreElement>('pre');
    preElements.forEach((pre) => {
      if (pre.querySelector('.code-copy-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'code-copy-btn';
      btn.type = 'button';
      btn.title = 'Sao chép mã nguồn';
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg><span>Sao chép</span>`;
      btn.onclick = (e) => {
        e.stopPropagation();
        const code = pre.querySelector('code');
        const codeText = code ? code.innerText : pre.innerText;
        navigator.clipboard.writeText(codeText);
        btn.innerHTML = `<span>Đã chép!</span>`;
        btn.classList.add('copied');
        onToast?.('Đã sao chép mã nguồn', 'success');
        setTimeout(() => {
          btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg><span>Sao chép</span>`;
          btn.classList.remove('copied');
        }, 2000);
      };
      pre.appendChild(btn);
    });
  }, [renderedHtml, onToast]);

  // 2. Right-click context menu for selected text or code blocks in preview pane
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleContextMenu = (e: MouseEvent) => {
      const selection = window.getSelection();
      const selectedText = selection ? selection.toString() : '';
      if (selectedText.trim()) {
        e.preventDefault();
        setCopyMenu({
          x: e.clientX,
          y: e.clientY,
          text: selectedText,
          label: 'Sao chép văn bản đã chọn (Ctrl+C)',
        });
        return;
      }

      const preBlock = (e.target as HTMLElement)?.closest('pre');
      if (preBlock) {
        e.preventDefault();
        const codeEl = preBlock.querySelector('code');
        const text = codeEl ? codeEl.innerText : preBlock.innerText;
        setCopyMenu({
          x: e.clientX,
          y: e.clientY,
          text,
          label: 'Sao chép toàn bộ khối mã',
        });
        return;
      }
    };

    container.addEventListener('contextmenu', handleContextMenu);
    return () => {
      container.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // 3. Dismiss context menu on click outside or contextmenu elsewhere
  useEffect(() => {
    if (!copyMenu) return;
    const handleOutside = () => setCopyMenu(null);
    window.addEventListener('click', handleOutside);
    window.addEventListener('contextmenu', handleOutside);
    return () => {
      window.removeEventListener('click', handleOutside);
      window.removeEventListener('contextmenu', handleOutside);
    };
  }, [copyMenu]);

  return (
    <>
      <div
        className="preview-pane"
        id="bookmd-preview"
        ref={containerRef}
      />

      {copyMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: `${Math.min(copyMenu.x, window.innerWidth - 250)}px`,
            top: `${Math.min(copyMenu.y, window.innerHeight - 80)}px`,
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="context-menu-item"
            onClick={() => {
              navigator.clipboard.writeText(copyMenu.text);
              onToast?.('Đã sao chép vào bộ nhớ tạm', 'success');
              setCopyMenu(null);
            }}
          >
            <CopyIcon size={14} style={{ marginRight: '8px' }} />
            <span>{copyMenu.label}</span>
          </div>
        </div>
      )}
    </>
  );
};
