import React from 'react';
import { useTranslation } from '../../i18n';

export const APP_VERSION = 'v0.2.1';

interface StatusBarProps {
  activeFile?: string;
  isDirty?: boolean;
  cursorLine: number;
  cursorCol: number;
  wordCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  activeFile,
  isDirty,
  cursorLine,
  cursorCol,
  wordCount,
}) => {
  const { t } = useTranslation();

  return (
    <footer className="statusbar">
      <div className="statusbar-left">
        {activeFile ? (
          <>
            <span style={{ color: 'var(--text-secondary)' }}>📄 {activeFile}</span>
            <span style={{ color: isDirty ? 'var(--warning)' : 'var(--success)' }}>
              {isDirty ? t('statusbar.unsaved') : t('statusbar.saved')}
            </span>
          </>
        ) : (
          <span>{t('statusbar.ready')}</span>
        )}
      </div>

      <div className="statusbar-right">
        {activeFile && (
          <>
            <span>{t('statusbar.words', { count: wordCount })}</span>
            <span>
              {t('statusbar.lineCol', { line: cursorLine, col: cursorCol })}
            </span>
            <span>Markdown</span>
            <span>UTF-8</span>
          </>
        )}
        <span
          className="statusbar-version"
          title={t('statusbar.versionTitle')}
          style={{
            opacity: 0.85,
            fontWeight: 500,
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            padding: '1px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-primary)',
            marginLeft: '4px',
          }}
        >
          {APP_VERSION}
        </span>
      </div>
    </footer>
  );
};
