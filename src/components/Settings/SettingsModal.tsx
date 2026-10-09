import React, { useState } from 'react';
import { Settings, Theme, FileEntry } from '../../types';
import { CloseIcon, FolderIcon } from '../common/Icons';
import { ImageFolderPickerModal } from './ImageFolderPickerModal';

interface SettingsModalProps {
  isOpen: boolean;
  settings: Settings;
  fileTree?: FileEntry[];
  workspaceName?: string;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<Settings>) => void;
  onCreateFolder?: (folderPath: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  fileTree = [],
  workspaceName,
  onClose,
  onUpdateSettings,
  onCreateFolder,
}) => {
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="settings-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="settings-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 className="settings-title" style={{ margin: 0 }}>Cài đặt BookMD</h2>
            <button className="btn btn-icon" onClick={onClose}>
              <CloseIcon size={16} />
            </button>
          </div>

          <div className="settings-group">
            <label className="settings-label">Giao diện (Theme)</label>
            <select
              className="settings-select"
              value={settings.theme}
              onChange={(e) => onUpdateSettings({ theme: e.target.value as Theme })}
            >
              <option value="dark">Tối (Dark Theme)</option>
              <option value="light">Sáng (Light Theme)</option>
            </select>
          </div>

          <div className="settings-group">
            <label className="settings-label">Thư mục lưu hình ảnh tự động (Image Directory)</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                className="settings-input"
                value={settings.imageDir}
                placeholder="assets/images"
                style={{ flex: 1, cursor: 'pointer' }}
                onClick={() => setIsFolderPickerOpen(true)}
                onChange={(e) => onUpdateSettings({ imageDir: e.target.value })}
                title="Bấm để mở cửa sổ chọn thư mục trong Workspace"
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  fontSize: '12px',
                }}
                onClick={() => setIsFolderPickerOpen(true)}
                title="Mở cửa sổ chọn thư mục từ Workspace (mặc định tìm 'img')"
              >
                <FolderIcon size={14} />
                <span>Chọn thư mục...</span>
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              Mặc định là <code>assets/images</code>. Bấm <b>Chọn thư mục...</b> để mở cửa sổ lọc thư mục trong Workspace (mặc định tìm "img").
            </div>
          </div>

        <div className="settings-group">
          <label className="settings-label">Cỡ chữ Editor (Font size: {settings.fontSize}px)</label>
          <input
            type="range"
            min="12"
            max="22"
            value={settings.fontSize}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
            onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
          />
        </div>

        <div className="settings-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={settings.lineNumbers}
              onChange={(e) => onUpdateSettings({ lineNumbers: e.target.checked })}
            />
            Hiển thị số dòng (Line Numbers)
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={settings.wordWrap}
              onChange={(e) => onUpdateSettings({ wordWrap: e.target.checked })}
            />
            Tự động xuống dòng (Word Wrap)
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={settings.autoSave}
              onChange={(e) => onUpdateSettings({ autoSave: e.target.checked })}
            />
            Tự động lưu khi chỉnh sửa (Auto Save)
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Hoàn tất
          </button>
        </div>
      </div>
    </div>

    <ImageFolderPickerModal
      isOpen={isFolderPickerOpen}
      currentImageDir={settings.imageDir}
      fileTree={fileTree}
      workspaceName={workspaceName}
      onClose={() => setIsFolderPickerOpen(false)}
      onSelectFolder={(folder) => onUpdateSettings({ imageDir: folder })}
      onCreateFolder={onCreateFolder}
    />
  </>
  );
};

