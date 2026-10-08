import React from 'react';
import { Settings, Theme } from '../../types';
import { CloseIcon } from '../common/Icons';

interface SettingsModalProps {
  isOpen: boolean;
  settings: Settings;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<Settings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
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
          <input
            className="settings-input"
            value={settings.imageDir}
            placeholder="assets/images"
            onChange={(e) => onUpdateSettings({ imageDir: e.target.value })}
          />
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Mặc định là <code>assets/images</code>. Ảnh paste sẽ được lưu theo cấu trúc: <code>&lt;context&gt;_&lt;doc&gt;_&lt;index&gt;.png</code>
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
  );
};
