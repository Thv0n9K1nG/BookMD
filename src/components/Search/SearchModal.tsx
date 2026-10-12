import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SearchResult } from '../../types';
import { searchWorkspace } from '../../services/ipc';
import { SearchIcon, CloseIcon } from '../common/Icons';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (file: string, line: number) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await searchWorkspace(query, {
          caseSensitive,
          wholeWord,
          isRegex,
        });
        setResults(res || []);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, caseSensitive, wholeWord, isRegex]);

  // Group results by file
  const grouped = useMemo(() => {
    return results.reduce<Record<string, SearchResult[]>>((acc, item) => {
      if (!acc[item.file]) acc[item.file] = [];
      acc[item.file].push(item);
      return acc;
    }, {});
  }, [results]);

  const totalFiles = Object.keys(grouped).length;

  // Helper to highlight pattern occurrences in the target line
  const highlightLine = (text?: string) => {
    if (!text) return '';
    if (!query.trim()) return text;

    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const pattern = isRegex
        ? `(${query})`
        : `(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`;
      const re = new RegExp(pattern, flags);
      const parts = text.split(re);
      if (parts.length <= 1) return text;

      return parts.map((part, i) => {
        const isMatch = isRegex
          ? new RegExp(`^${query}$`, flags).test(part)
          : caseSensitive
          ? part === query
          : part.toLowerCase() === query.toLowerCase();

        if (isMatch) {
          return (
            <mark key={i} className="search-keyword-highlight">
              {part}
            </mark>
          );
        }
        return part;
      });
    } catch {
      return text;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="search-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="search-modal-dialog">
        {/* Search Input Bar */}
        <div className="search-input-header">
          <SearchIcon size={18} className="search-input-icon" />
          <input
            ref={inputRef}
            className="search-text-input"
            placeholder="Tìm kiếm nội dung trong toàn bộ workspace... (Ctrl+Shift+F)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
          />
          <div className="search-options-group">
            <button
              className={`search-option-btn ${caseSensitive ? 'active' : ''}`}
              onClick={() => setCaseSensitive(!caseSensitive)}
              title="Khớp hoa thường (Case sensitive)"
            >
              Aa
            </button>
            <button
              className={`search-option-btn ${wholeWord ? 'active' : ''}`}
              onClick={() => setWholeWord(!wholeWord)}
              title="Khớp toàn bộ từ (Whole word)"
            >
              \b
            </button>
            <button
              className={`search-option-btn ${isRegex ? 'active' : ''}`}
              onClick={() => setIsRegex(!isRegex)}
              title="Biểu thức chính quy (Regex)"
            >
              .*
            </button>
          </div>
          <button className="btn btn-icon search-close-btn" onClick={onClose} title="Đóng (Esc)">
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Results Count Banner */}
        {query.trim() && (
          <div className="search-summary-bar">
            {isLoading ? (
              <span className="search-status-text">Đang quét toàn bộ tài liệu workspace...</span>
            ) : results.length > 0 ? (
              <span className="search-status-success">
                Tìm thấy <strong>{results.length}</strong> kết quả trong <strong>{totalFiles}</strong> tệp
              </span>
            ) : (
              <span className="search-status-empty">
                Không tìm thấy kết quả nào khớp với "<em>{query}</em>"
              </span>
            )}
          </div>
        )}

        {/* Search Results List */}
        <div className="search-results-scrollable">
          {!isLoading && !query.trim() && (
            <div className="search-empty-prompt">
              <SearchIcon size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div>Nhập từ khóa hoặc biểu thức Regex để tìm kiếm trong workspace</div>
              <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>
                Hỗ trợ ngữ cảnh 3 dòng, khớp từ ngữ và nhảy trực tiếp tới vị trí file
              </div>
            </div>
          )}

          {Object.entries(grouped).map(([file, items]) => (
            <div key={file} className="search-file-card">
              {/* File Title Bar */}
              <div
                className="search-file-header"
                onClick={() => {
                  if (items.length > 0) {
                    onNavigate(file, items[0].line);
                    onClose();
                  }
                }}
                title="Mở tệp này"
              >
                <div className="search-file-info">
                  <span className="search-file-icon">📄</span>
                  <span className="search-file-path">{file}</span>
                </div>
                <span className="search-file-badge">
                  {items.length} {items.length === 1 ? 'kết quả' : 'kết quả'}
                </span>
              </div>

              {/* Matches within this file */}
              <div className="search-file-matches">
                {items.map((item, idx) => {
                  const prevItem = idx > 0 ? items[idx - 1] : null;
                  const isGap = prevItem ? item.line > prevItem.line + 2 : false;

                  return (
                    <React.Fragment key={`${file}-${item.line}-${idx}`}>
                      {/* Gap separator if matches are separated */}
                      {(idx > 0 && isGap) && (
                        <div className="search-match-gap">
                          <span>•••••</span>
                        </div>
                      )}

                      {/* 3-line Context Match Snippet */}
                      <div
                        className="search-snippet-block"
                        onClick={() => {
                          onNavigate(item.file, item.line);
                          onClose();
                        }}
                        title={`Nhảy tới dòng ${item.line} trong ${file}`}
                      >
                        {/* 1. Context Line Above (dòng p - 1) */}
                        {item.lineBefore !== null && item.lineBefore !== undefined && (
                          <div className="search-snippet-line context-line">
                            <span className="snippet-line-num">L{item.line - 1}</span>
                            <span className="snippet-line-code">{item.lineBefore || ' '}</span>
                          </div>
                        )}

                        {/* 2. Target Match Line (dòng chứa pattern - highlighted) */}
                        <div className="search-snippet-line target-line">
                          <span className="snippet-line-num target-badge">L{item.line}</span>
                          <span className="snippet-line-code target-code">
                            {highlightLine(item.lineContent || item.context)}
                          </span>
                        </div>

                        {/* 3. Context Line Below (dòng p + 1) */}
                        {item.lineAfter !== null && item.lineAfter !== undefined && (
                          <div className="search-snippet-line context-line">
                            <span className="snippet-line-num">L{item.line + 1}</span>
                            <span className="snippet-line-code">{item.lineAfter || ' '}</span>
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
