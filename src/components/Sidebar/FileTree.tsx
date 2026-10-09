import React, { useState } from 'react';
import { FileEntry, SidebarTab } from '../../types';
import {
  FolderIcon,
  FolderOpenIcon,
  FileIcon,
  ChevronRightIcon,
  PlusIcon,
  RefreshIcon,
  SidebarToggleIcon,
  TocIcon,
  FilesIcon,
} from '../common/Icons';
import { TableOfContents } from './TableOfContents';

interface FileTreeProps {
  tree: FileEntry[];
  activeFile?: string;
  activeContent?: string;
  isCollapsed: boolean;
  width: number;
  sidebarTab?: SidebarTab;
  onSelectSidebarTab?: (tab: SidebarTab) => void;
  onSelectFile: (file: FileEntry) => void;
  onRefresh: () => void;
  onToggleCollapse: () => void;
  onNavigateToLine?: (line: number) => void;
  onContextMenu: (e: React.MouseEvent, entry?: FileEntry, folderPath?: string) => void;
  onCreateNew: (folderPath: string, kind: 'file' | 'directory') => void;
}

interface TreeItemProps {
  entry: FileEntry;
  depth: number;
  activeFile?: string;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  onSelectFile: (file: FileEntry) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
}

const TreeItem: React.FC<TreeItemProps> = ({
  entry,
  depth,
  activeFile,
  expandedFolders,
  toggleFolder,
  onSelectFile,
  onContextMenu,
}) => {
  const isDir = entry.kind === 'directory';
  const isExpanded = isDir && expandedFolders.has(entry.relativePath);
  const isActive = entry.relativePath === activeFile;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDir) {
      toggleFolder(entry.relativePath);
    } else {
      onSelectFile(entry);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, entry);
  };

  return (
    <div>
      <div
        className={`tree-item ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        title={entry.relativePath}
      >
        {isDir ? (
          <span className={`tree-item-chevron ${isExpanded ? 'open' : ''}`}>
            <ChevronRightIcon size={12} />
          </span>
        ) : (
          <span style={{ width: 12, flexShrink: 0 }} />
        )}

        <span className="tree-item-icon">
          {isDir ? (
            isExpanded ? (
              <FolderOpenIcon size={15} style={{ color: '#f59e0b' }} />
            ) : (
              <FolderIcon size={15} style={{ color: '#f59e0b' }} />
            )
          ) : entry.name.endsWith('.md') ? (
            <FileIcon size={15} style={{ color: 'var(--text-accent)' }} />
          ) : (
            <FileIcon size={15} style={{ color: 'var(--text-tertiary)' }} />
          )}
        </span>

        <span className="tree-item-label">{entry.name}</span>
      </div>

      {isDir && isExpanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <TreeItem
              key={child.relativePath}
              entry={child}
              depth={depth + 1}
              activeFile={activeFile}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onSelectFile={onSelectFile}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({
  tree,
  activeFile,
  activeContent,
  isCollapsed,
  width,
  sidebarTab,
  onSelectSidebarTab,
  onSelectFile,
  onRefresh,
  onToggleCollapse,
  onNavigateToLine,
  onContextMenu,
  onCreateNew,
}) => {
  const [internalTab, setInternalTab] = useState<SidebarTab>('files');
  const currentTab = sidebarTab !== undefined ? sidebarTab : internalTab;

  const handleTabChange = (tab: SidebarTab) => {
    setInternalTab(tab);
    onSelectSidebarTab?.(tab);
  };

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['TryHackMe', 'assets'])
  );

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  if (isCollapsed) {
    return (
      <div className="sidebar collapsed">
        <button
          className="btn btn-icon sidebar-expand-btn"
          onClick={onToggleCollapse}
          title="Mở thanh Sidebar (Ctrl+B)"
        >
          <SidebarToggleIcon size={16} />
        </button>

        <button
          className={`btn btn-icon sidebar-expand-btn ${currentTab === 'files' ? 'active' : ''}`}
          onClick={() => {
            handleTabChange('files');
            onToggleCollapse();
          }}
          title="Mở Thư mục Workspace"
          style={{ marginTop: '6px' }}
        >
          <FilesIcon size={15} />
        </button>

        <button
          className={`btn btn-icon sidebar-expand-btn ${currentTab === 'toc' ? 'active' : ''}`}
          onClick={() => {
            handleTabChange('toc');
            onToggleCollapse();
          }}
          title="Mở Mục lục (Table of Contents)"
          style={{ marginTop: '4px' }}
        >
          <TocIcon size={15} />
        </button>
      </div>
    );
  }

  return (
    <aside className="sidebar" style={{ width: `${width}px` }}>
      <div className="sidebar-header">
        <div className="sidebar-tab-switcher">
          <button
            type="button"
            className={`sidebar-tab-btn ${currentTab === 'files' ? 'active' : ''}`}
            onClick={() => handleTabChange('files')}
            title="Duyệt cây thư mục Workspace"
          >
            <FilesIcon size={13} />
            <span>Thư mục</span>
          </button>
          <button
            type="button"
            className={`sidebar-tab-btn ${currentTab === 'toc' ? 'active' : ''}`}
            onClick={() => handleTabChange('toc')}
            title="Mục lục tiêu đề tài liệu Markdown hiện tại"
          >
            <TocIcon size={13} />
            <span>Mục lục</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          {currentTab === 'files' && (
            <>
              <button
                className="btn btn-icon"
                onClick={() => onCreateNew('', 'file')}
                title="Tạo file mới"
              >
                <PlusIcon size={14} />
              </button>
              <button
                className="btn btn-icon"
                onClick={onRefresh}
                title="Làm mới thư mục"
              >
                <RefreshIcon size={14} />
              </button>
            </>
          )}
          <button
            className="btn btn-icon"
            onClick={onToggleCollapse}
            title="Thu gọn Sidebar"
          >
            <SidebarToggleIcon size={14} />
          </button>
        </div>
      </div>

      <div
        className="sidebar-content"
        onContextMenu={(e) => {
          if (currentTab === 'files') {
            e.preventDefault();
            onContextMenu(e, undefined, '');
          }
        }}
      >
        {currentTab === 'files' ? (
          tree.length === 0 ? (
            <div style={{ padding: '16px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
              Không có file trong workspace
            </div>
          ) : (
            tree.map((entry) => (
              <TreeItem
                key={entry.relativePath}
                entry={entry}
                depth={0}
                activeFile={activeFile}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                onSelectFile={onSelectFile}
                onContextMenu={(e, itm) => onContextMenu(e, itm, itm.relativePath)}
              />
            ))
          )
        ) : (
          <TableOfContents
            content={activeContent}
            activePath={activeFile}
            onNavigateToLine={onNavigateToLine || (() => {})}
          />
        )}
      </div>
    </aside>
  );
};

