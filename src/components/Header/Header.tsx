import React from 'react';
import { Theme } from '../../types';
import {
  BookIcon,
  SearchIcon,
  SunIcon,
  MoonIcon,
  PdfIcon,
  SettingsIcon,
  SidebarToggleIcon,
  FileIcon,
  ImageIcon,
} from '../common/Icons';

interface HeaderProps {
  workspaceName?: string;
  theme: Theme;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenFile?: () => void;
  onOpenWorkspace: () => void;
  onToggleSearch: () => void;
  onToggleCommandPalette: () => void;
  onExportPdf: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenImageSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  workspaceName,
  theme,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenFile,
  onOpenWorkspace,
  onToggleSearch,
  onToggleCommandPalette,
  onExportPdf,
  onToggleTheme,
  onOpenSettings,
  onOpenImageSettings,
}) => {
  return (
    <header className="titlebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {onToggleSidebar && (
          <button
            className={`btn btn-icon ${isSidebarCollapsed ? 'active' : ''}`}
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? "Mở thanh thư mục / Sidebar (Ctrl+B)" : "Thu gọn thanh thư mục / Sidebar (Ctrl+B)"}
            style={{ marginRight: '2px' }}
          >
            <SidebarToggleIcon size={16} />
          </button>
        )}

        <div className="titlebar-brand" onClick={onOpenWorkspace} style={{ cursor: 'pointer' }} title="Mở Workspace khác...">
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

        {onOpenFile && (
          <button
            className="btn btn-icon"
            onClick={onOpenFile}
            title="Mở file Markdown... (Ctrl+O)"
            style={{ marginLeft: '2px' }}
          >
            <FileIcon size={15} />
          </button>
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
          onClick={onOpenImageSettings}
          title="Cài đặt xử lý hình ảnh (Image Handling)"
        >
          <ImageIcon size={15} />
        </button>

        <button
          className="btn btn-icon"
          onClick={onOpenSettings}
          title="Cài đặt chung"
        >
          <SettingsIcon size={15} />
        </button>
      </div>
    </header>
  );
};
