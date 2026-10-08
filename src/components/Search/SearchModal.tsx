import React, { useState, useEffect, useRef } from 'react';
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
        const res = await searchWorkspace(query, { caseSensitive, isRegex });
        setResults(res || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, caseSensitive, isRegex]);

  if (!isOpen) return null;

  // Group results by file
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, item) => {
    if (!acc[item.file]) acc[item.file] = [];
    acc[item.file].push(item);
    return acc;
  }, {});

  return (
    <div
      className="command-palette-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="command-palette" style={{ width: '650px', maxHeight: '500px' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border-primary)' }}>
          <SearchIcon size={16} style={{ color: 'var(--text-tertiary)', marginRight: '10px' }} />
          <input
            ref={inputRef}
            className="command-palette-input"
            style={{ borderBottom: 'none', padding: '0', flex: 1 }}
            placeholder="Tìm kiếm nội dung trong toàn bộ workspace... (ripgrep)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
          />
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginRight: '8px' }}>
            <button
              className={`btn ${caseSensitive ? 'btn-primary' : ''}`}
              style={{ fontSize: '11px', padding: '2px 6px', height: '22px' }}
              onClick={() => setCaseSensitive(!caseSensitive)}
              title="Khớp hoa thường (Case sensitive)"
            >
              Aa
            </button>
            <button
              className={`btn ${isRegex ? 'btn-primary' : ''}`}
              style={{ fontSize: '11px', padding: '2px 6px', height: '22px' }}
              onClick={() => setIsRegex(!isRegex)}
              title="Biểu thức chính quy (Regex)"
            >
              .*
            </button>
          </div>
          <button className="btn btn-icon" onClick={onClose}>
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="search-results">
          {isLoading && (
            <div style={{ padding: '16px', color: 'var(--text-tertiary)', fontSize: '12px', textAlign: 'center' }}>
              Đang tìm kiếm...
            </div>
          )}

          {!isLoading && query && results.length === 0 && (
            <div style={{ padding: '20px', color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center' }}>
              Không tìm thấy kết quả nào cho "{query}"
            </div>
          )}

          {Object.entries(grouped).map(([file, items]) => (
            <div key={file} style={{ marginBottom: '8px' }}>
              <div className="search-result-file">
                📄 {file} <span style={{ opacity: 0.6 }}>({items.length})</span>
              </div>
              {items.map((item, idx) => (
                <div
                  key={`${item.file}-${item.line}-${idx}`}
                  className="search-result-item"
                  onClick={() => {
                    onNavigate(item.file, item.line);
                    onClose();
                  }}
                >
                  <span className="search-result-line">L{item.line}</span>
                  <span className="search-result-text">{item.context}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
