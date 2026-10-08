import React, { useEffect, useRef } from 'react';
import { ContextMenuState } from '../../types';

interface ContextMenuProps {
  state: ContextMenuState | null;
  onClose: () => void;
  onNewFile: (parentPath: string) => void;
  onNewFolder: (parentPath: string) => void;
  onRename: (path: string, currentName: string) => void;
  onDelete: (path: string, name: string) => void;
  onCopyRelativePath: (path: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  state,
  onClose,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onCopyRelativePath,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('contextmenu', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('contextmenu', handleOutsideClick);
    };
  }, [onClose]);

  if (!state) return null;

  const entry = state.entry;
  const isFile = entry?.kind === 'file';
  const targetFolder = isFile
    ? entry.relativePath.split(/[\/\\]/).slice(0, -1).join('/')
    : entry?.relativePath || '';

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        left: `${Math.min(state.x, window.innerWidth - 200)}px`,
        top: `${Math.min(state.y, window.innerHeight - 240)}px`,
      }}
    >
      <div
        className="context-menu-item"
        onClick={() => {
          onNewFile(targetFolder);
          onClose();
        }}
      >
        <span>📄 Tạo file mới</span>
      </div>
      <div
        className="context-menu-item"
        onClick={() => {
          onNewFolder(targetFolder);
          onClose();
        }}
      >
        <span>📁 Tạo thư mục mới</span>
      </div>

      {entry && (
        <>
          <div className="context-menu-separator" />
          <div
            className="context-menu-item"
            onClick={() => {
              onRename(entry.relativePath, entry.name);
              onClose();
            }}
          >
            <span>✏️ Đổi tên</span>
          </div>
          <div
            className="context-menu-item"
            style={{ color: 'var(--error)' }}
            onClick={() => {
              onDelete(entry.relativePath, entry.name);
              onClose();
            }}
          >
            <span>🗑️ Xóa</span>
          </div>
          <div className="context-menu-separator" />
          <div
            className="context-menu-item"
            onClick={() => {
              onCopyRelativePath(entry.relativePath);
              onClose();
            }}
          >
            <span>📋 Sao chép đường dẫn</span>
          </div>
        </>
      )}
    </div>
  );
};
