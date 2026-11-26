import React from 'react';
import { OpenTab, ViewMode } from '../../types';
import { CloseIcon, FileIcon } from '../common/Icons';
import { useTranslation } from '../../i18n';

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
  const { t } = useTranslation();

  return (
    <div className="tabs-bar">
      <div style={{ display: 'flex', flex: 1, overflowX: 'auto' }}>
        {tabs.map((tab) => {
          const isActive = tab.relativePath === activePath;
          return (
            <div
              key={`${tab.workspacePath || ''}:${tab.relativePath}`}
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
              {tab.isDirty && <span className="tab-unsaved" title={t('tabs.unsaved')} />}
              <span
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.relativePath);
                }}
                title={t('tabs.closeTab')}
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
              title={t('tabs.viewEditorTitle')}
            >
              {t('tabs.viewEditor')}
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => onChangeViewMode('split')}
              title={t('tabs.viewSplitTitle')}
            >
              {t('tabs.viewSplit')}
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'preview' ? 'active' : ''}`}
              onClick={() => onChangeViewMode('preview')}
              title={t('tabs.viewPreviewTitle')}
            >
              {t('tabs.viewPreview')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
