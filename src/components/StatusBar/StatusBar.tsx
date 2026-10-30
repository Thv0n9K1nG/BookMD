import React from 'react';

export const APP_VERSION = 'v0.1.8';

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
  return (
    <footer className="statusbar">
      <div className="statusbar-left">
        {activeFile ? (
          <>
            <span style={{ color: 'var(--text-secondary)' }}>📄 {activeFile}</span>
            <span style={{ color: isDirty ? 'var(--warning)' : 'var(--success)' }}>
              {isDirty ? '● Chưa lưu' : '✓ Đã lưu'}
            </span>
          </>
        ) : (
          <span>Sẵn sàng</span>
        )}
      </div>

      <div className="statusbar-right">
        {activeFile && (
          <>
            <span>{wordCount} từ</span>
            <span>
              Ln {cursorLine}, Col {cursorCol}
            </span>
            <span>Markdown</span>
            <span>UTF-8</span>
          </>
        )}
        <span
          className="statusbar-version"
          title="Phiên bản BookMD hiện tại"
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
