import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, FileIcon, FolderIcon } from './Icons';
import { useTranslation } from '../../i18n';

export interface PromptModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  icon?: 'file' | 'directory' | 'rename';
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  onClose: () => void;
  onSubmit: (value: string) => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  title,
  subtitle,
  icon = 'file',
  defaultValue = '',
  placeholder = '',
  confirmLabel,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const effectiveConfirmLabel = confirmLabel || t('common.confirm');
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setError(null);
      // Auto-focus and select filename without extension
      setTimeout(() => {
        const input = inputRef.current;
        if (input) {
          input.focus();
          const dotIdx = defaultValue.lastIndexOf('.');
          if (dotIdx > 0 && icon === 'file') {
            input.setSelectionRange(0, dotIdx);
          } else {
            input.select();
          }
        }
      }, 50);
    }
  }, [isOpen, defaultValue, icon]);

  if (!isOpen) return null;

  const validateAndSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(t('prompt.errorEmpty'));
      return;
    }

    // Check invalid filesystem characters on Windows: < > : " | ? *
    if (/[<>:"|?*]/.test(trimmed)) {
      setError(t('prompt.errorSpecialChars'));
      return;
    }

    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      validateAndSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="prompt-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="prompt-modal-dialog">
        <div className="prompt-modal-header">
          <div className="prompt-modal-title-group">
            <div className={`prompt-modal-icon-badge ${icon}`}>
              {icon === 'directory' ? (
                <FolderIcon size={18} style={{ color: '#f59e0b' }} />
              ) : icon === 'rename' ? (
                <span style={{ fontSize: '16px' }}>✏️</span>
              ) : (
                <FileIcon size={18} style={{ color: 'var(--accent)' }} />
              )}
            </div>
            <div>
              <h3 className="prompt-modal-title">{title}</h3>
              {subtitle && <div className="prompt-modal-subtitle">{subtitle}</div>}
            </div>
          </div>
          <button className="btn btn-icon prompt-close-btn" onClick={onClose} title="Đóng (Esc)">
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="prompt-modal-body">
          <div className="prompt-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className={`prompt-text-input ${error ? 'has-error' : ''}`}
              value={value}
              placeholder={placeholder}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
          {error && <div className="prompt-error-message">{error}</div>}
        </div>

        <div className="prompt-modal-footer">
          <button type="button" className="btn btn-secondary prompt-btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary prompt-btn" onClick={validateAndSubmit}>
            {effectiveConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
