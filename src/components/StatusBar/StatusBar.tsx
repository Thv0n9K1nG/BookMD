import React from 'react';

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
      </div>
    </footer>
  );
};
