import React, { useMemo } from 'react';
import MarkdownIt from 'markdown-it';

interface PreviewProps {
  content: string;
  relativePath: string;
  workspacePath?: string;
}

export const Preview: React.FC<PreviewProps> = ({ content }) => {
  const md = useMemo(() => {
    return new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true,
    });
  }, []);

  const renderedHtml = useMemo(() => {
    if (!content) {
      return '<div style="color: var(--text-tertiary); font-style: italic; margin-top: 2rem;">Chưa có nội dung để xem trước...</div>';
    }
    try {
      return md.render(content);
    } catch (err: any) {
      return `<div style="color: var(--error);">Lỗi render markdown: ${err?.message || err}</div>`;
    }
  }, [content, md]);

  return (
    <div
      className="preview-pane"
      id="bookmd-preview"
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
