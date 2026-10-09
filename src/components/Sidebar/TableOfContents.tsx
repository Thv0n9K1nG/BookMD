import React, { useState, useMemo } from 'react';
import { TocItem } from '../../types';
import { TocIcon, SearchIcon, CloseIcon } from '../common/Icons';

interface TableOfContentsProps {
  content?: string;
  activePath?: string | null;
  onNavigateToLine: (line: number) => void;
}

export function parseHeadings(markdown: string): TocItem[] {
  if (!markdown) return [];
  const lines = markdown.split(/\r?\n/);
  const items: TocItem[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Toggle fenced code block
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) continue;

    // Check ATX headings: # to ######
    const match = rawLine.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      // Clean basic formatting like **bold**, *italic*, `code`
      const text = match[2].trim().replace(/[*_`~[\]]/g, '');
      items.push({
        id: `h-${i + 1}-${text}`,
        level,
        text,
        line: i + 1, // 1-indexed for CodeMirror
      });
      continue;
    }

    // Setext headings (--- or ===)
    if (i > 0 && lines[i - 1].trim().length > 0) {
      if (/^={2,}\s*$/.test(trimmed)) {
        const text = lines[i - 1].trim().replace(/[*_`~[\]]/g, '');
        items.push({
          id: `h-${i}-${text}`,
          level: 1,
          text,
          line: i,
        });
      } else if (/^-{2,}\s*$/.test(trimmed)) {
        const text = lines[i - 1].trim().replace(/[*_`~[\]]/g, '');
        items.push({
          id: `h-${i}-${text}`,
          level: 2,
          text,
          line: i,
        });
      }
    }
  }

  return items;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  content = '',
  activePath,
  onNavigateToLine,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [activeLine, setActiveLine] = useState<number | null>(null);

  // Parse headings from markdown
  const allHeadings = useMemo(() => {
    return parseHeadings(content);
  }, [content]);

  // Filter headings by user query
  const filteredHeadings = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return allHeadings;
    return allHeadings.filter((h) => h.text.toLowerCase().includes(q));
  }, [allHeadings, filterQuery]);

  const handleItemClick = (line: number) => {
    setActiveLine(line);
    onNavigateToLine(line);
  };

  if (!activePath) {
    return (
      <div className="toc-empty-state">
        <TocIcon size={24} style={{ opacity: 0.4, marginBottom: '8px' }} />
        <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Chưa mở tài liệu</div>
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', maxWidth: '200px' }}>
          Chọn một file Markdown trong danh sách thư mục để xem mục lục.
        </p>
      </div>
    );
  }

  if (allHeadings.length === 0) {
    return (
      <div className="toc-empty-state">
        <TocIcon size={24} style={{ opacity: 0.4, marginBottom: '8px' }} />
        <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Không có tiêu đề</div>
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', maxWidth: '220px' }}>
          Tài liệu này chưa có mục lục. Thêm các thẻ <code># Tiêu đề 1</code> hoặc <code>## Tiêu đề 2</code> vào file Markdown.
        </p>
      </div>
    );
  }

  return (
    <div className="toc-container">
      {/* Search / Filter in TOC */}
      {allHeadings.length > 5 && (
        <div className="toc-filter-box">
          <SearchIcon size={13} style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="toc-filter-input"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Lọc tiêu đề..."
          />
          {filterQuery && (
            <button
              className="btn btn-icon"
              onClick={() => setFilterQuery('')}
              style={{ padding: '2px' }}
              title="Xóa lọc"
            >
              <CloseIcon size={12} />
            </button>
          )}
        </div>
      )}

      {/* Headings List */}
      <div className="toc-list">
        {filteredHeadings.length > 0 ? (
          filteredHeadings.map((item) => {
            const isItemActive = activeLine === item.line;
            return (
              <div
                key={item.id}
                className={`toc-item level-${item.level} ${isItemActive ? 'active' : ''}`}
                style={{ paddingLeft: `${(item.level - 1) * 14 + 10}px` }}
                onClick={() => handleItemClick(item.line)}
                title={`Nhảy tới dòng ${item.line}: ${item.text}`}
              >
                <span className={`toc-badge badge-h${item.level}`}>
                  H{item.level}
                </span>
                <span className="toc-text">{item.text}</span>
                <span className="toc-line">L{item.line}</span>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Không tìm thấy tiêu đề nào khớp với "{filterQuery}".
          </div>
        )}
      </div>
    </div>
  );
};
