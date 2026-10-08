import React from 'react';
import { OpenTab, ViewMode } from '../../types';
import { CloseIcon, FileIcon } from '../common/Icons';

interface TabBarProps {
  tabs: OpenTab[];
  activePath: string | null;
  viewMode: ViewMode;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onChangeViewMode: (mode: ViewMode) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activePath,
  viewMode,
  onSelectTab,
  onCloseTab,
  onChangeViewMode,
}) => {
  return (
    <div className="tabs-bar">
      <div style={{ display: 'flex', flex: 1, overflowX: 'auto' }}>
        {tabs.map((tab) => {
          const isActive = tab.relativePath === activePath;
          return (
            <div
              key={tab.relativePath}
              className={`tab ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(tab.relativePath)}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  // Middle click close
                  e.preventDefault();
                  onCloseTab(tab.relativePath);
                }
              }}
              title={tab.relativePath}
            >
              <FileIcon size={14} style={{ color: 'var(--text-accent)' }} />
              <span className="tab-label">{tab.name}</span>
              {tab.isDirty && <span className="tab-unsaved" title="Chưa lưu" />}
              <span
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.relativePath);
                }}
                title="Đóng tab"
              >
                <CloseIcon size={12} />
              </span>
            </div>
          );
        })}
      </div>

      {activePath && (
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
          <div className="view-mode-btns">
            <button
              className={`view-mode-btn ${viewMode === 'editor' ? 'active' : ''}`}
              onClick={() => onChangeViewMode('editor')}
              title="Chế độ Editor"
            >
              Editor
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => onChangeViewMode('split')}
              title="Chế độ Split (Editor + Preview)"
            >
              Split
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'preview' ? 'active' : ''}`}
              onClick={() => onChangeViewMode('preview')}
              title="Chế độ Preview"
            >
              Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
