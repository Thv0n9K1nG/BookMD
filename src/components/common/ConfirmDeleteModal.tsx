import React, { useEffect, useRef } from 'react';
import { CloseIcon, TrashIcon, FolderIcon, FileIcon } from './Icons';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  targetPath: string;
  name: string;
  isFolder: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  targetPath,
  name,
  isFolder,
  onClose,
  onConfirm,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Auto-focus Cancel button for safety so Enter does NOT accidentally trigger delete
      setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="prompt-modal-overlay"
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ zIndex: 10000 }}
    >
      <div className="prompt-modal-dialog delete-modal-dialog" style={{ maxWidth: '440px' }}>
        <div className="prompt-modal-header" style={{ borderBottom: '1px solid var(--border-primary)' }}>
          <div className="prompt-modal-title-group">
            <div
              className="prompt-modal-icon-badge"
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--error, #ef4444)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
            >
              <TrashIcon size={18} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <h3 className="prompt-modal-title" style={{ color: 'var(--text-heading)' }}>
                {isFolder ? 'Xác nhận xóa Thư mục' : 'Xác nhận xóa File'}
              </h3>
              <div className="prompt-modal-subtitle" style={{ color: 'var(--text-tertiary)' }}>
                Hành động này cần được bạn xác nhận
              </div>
            </div>
          </div>
          <button className="btn btn-icon prompt-close-btn" onClick={onClose} title="Đóng (Esc)">
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="prompt-modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '6px',
            }}
          >
            {isFolder ? (
              <FolderIcon size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
            ) : (
              <FileIcon size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            )}
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '13.5px',
                  color: 'var(--text-primary)',
                  wordBreak: 'break-all',
                }}
              >
                {name}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-tertiary)',
                  marginTop: '2px',
                  wordBreak: 'break-all',
                }}
              >
                {targetPath}
              </div>
            </div>
          </div>

          {isFolder && (
            <div
              style={{
                fontSize: '12px',
                color: '#d97706',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                padding: '8px 12px',
                borderRadius: '6px',
                lineHeight: 1.5,
              }}
            >
              ⚠️ <strong>Cảnh báo:</strong> Thư mục này và tất cả các file, thư mục con bên trong sẽ bị xóa.
            </div>
          )}

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Mục này sẽ được chuyển vào <strong>Thùng rác (Recycle Bin)</strong> của hệ điều hành và bạn có thể khôi phục lại nếu cần.
          </div>
        </div>

        <div
          className="prompt-modal-footer"
          style={{
            padding: '12px 20px',
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-primary)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            ref={cancelBtnRef}
            type="button"
            className="btn btn-secondary prompt-btn"
            onClick={onClose}
            style={{ minWidth: '90px' }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="btn prompt-btn"
            onClick={onConfirm}
            style={{
              background: '#dc2626',
              color: '#ffffff',
              border: '1px solid #b91c1c',
              minWidth: '110px',
              fontWeight: 600,
            }}
          >
            Xác nhận xóa
          </button>
        </div>
      </div>
    </div>
  );
};
