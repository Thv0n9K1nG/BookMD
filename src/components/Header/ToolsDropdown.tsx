import React, { useState, useRef, useEffect } from 'react';
import { ToolsIcon, PdfIcon, BackupIcon } from '../common/Icons';

export interface ToolItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string;
}

interface ToolsDropdownProps {
  onExportPdf: () => void;
  onOpenBackup: () => void;
}

export const ToolsDropdown: React.FC<ToolsDropdownProps> = ({
  onExportPdf,
  onOpenBackup,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener('click', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const tools: ToolItem[] = [
    {
      id: 'export-pdf',
      label: 'Xuất PDF',
      description: 'Xuất tài liệu Markdown hiện tại sang file PDF chuẩn in ấn',
      icon: <PdfIcon size={16} style={{ color: 'var(--accent)' }} />,
      onClick: () => {
        setIsOpen(false);
        onExportPdf();
      },
    },
    {
      id: 'backup',
      label: 'Sao lưu Dữ liệu (Backup)',
      description: 'Sao chép an toàn Workspace, thư mục hoặc file sang nơi lưu trữ khác',
      icon: <BackupIcon size={16} style={{ color: '#10b981' }} />,
      onClick: () => {
        setIsOpen(false);
        onOpenBackup();
      },
      badge: 'Mới',
    },
  ];

  return (
    <div className="tools-dropdown-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        className={`btn btn-icon ${isOpen ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        title="Bộ công cụ BookMD (Xuất PDF, Sao lưu dữ liệu...)"
        style={{
          color: isOpen ? 'var(--accent)' : undefined,
          background: isOpen ? 'var(--bg-tertiary)' : undefined,
        }}
      >
        <ToolsIcon size={15} />
      </button>

      {isOpen && (
        <div
          className="tools-dropdown-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '280px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-secondary)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <div
            style={{
              padding: '6px 8px 4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Bộ công cụ (Tools)</span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>BookMD</span>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--border-primary)', margin: '2px 0 4px 0' }} />

          {tools.map((tool) => (
            <div
              key={tool.id}
              onClick={tool.onClick}
              className="tools-dropdown-item"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ marginTop: '2px', flexShrink: 0 }}>{tool.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{tool.label}</span>
                  {tool.badge && (
                    <span
                      style={{
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        fontWeight: 600,
                      }}
                    >
                      {tool.badge}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-tertiary)',
                    marginTop: '2px',
                    lineHeight: 1.35,
                  }}
                >
                  {tool.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
