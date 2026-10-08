import React from 'react';
import { Theme } from '../../types';
import {
  BookIcon,
  SearchIcon,
  SunIcon,
  MoonIcon,
  PdfIcon,
  SettingsIcon,
} from '../common/Icons';

interface HeaderProps {
  workspaceName?: string;
  theme: Theme;
  onOpenWorkspace: () => void;
  onToggleSearch: () => void;
  onToggleCommandPalette: () => void;
  onExportPdf: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  workspaceName,
  theme,
  onOpenWorkspace,
  onToggleSearch,
  onToggleCommandPalette,
  onExportPdf,
  onToggleTheme,
  onOpenSettings,
}) => {
  return (
    <header className="titlebar">
      <div className="titlebar-brand" onClick={onOpenWorkspace} style={{ cursor: 'pointer' }}>
        <BookIcon size={18} />
        <span>BookMD</span>
        {workspaceName && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              marginLeft: '6px',
            }}
          >
            {workspaceName}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="btn"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-tertiary)',
            fontSize: '12px',
            border: '1px solid var(--border-primary)',
          }}
          onClick={onToggleSearch}
          title="Tìm kiếm trong workspace (Ctrl+Shift+F)"
        >
          <SearchIcon size={13} style={{ marginRight: '6px' }} />
          <span>Tìm kiếm...</span>
          <span style={{ marginLeft: '12px', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>Ctrl+Shift+F</span>
        </button>

        <button
          className="btn"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-tertiary)',
            fontSize: '12px',
            border: '1px solid var(--border-primary)',
          }}
          onClick={onToggleCommandPalette}
          title="Command Palette (Ctrl+Shift+P)"
        >
          <span>⌘</span>
          <span style={{ marginLeft: '6px', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>Ctrl+Shift+P</span>
        </button>
      </div>

      <div className="titlebar-actions">
        <button
          className="btn btn-icon"
          onClick={onExportPdf}
          title="Xuất tài liệu sang PDF"
        >
          <PdfIcon size={15} />
        </button>

        <button
          className="btn btn-icon"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
        >
          {theme === 'dark' ? <SunIcon size={15} /> : <MoonIcon size={15} />}
        </button>

        <button
          className="btn btn-icon"
          onClick={onOpenSettings}
          title="Cài đặt"
        >
          <SettingsIcon size={15} />
        </button>
      </div>
    </header>
  );
};
