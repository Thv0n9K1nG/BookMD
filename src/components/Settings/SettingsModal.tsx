import React, { useState, useEffect } from 'react';
import { Settings, Theme, FileEntry, ImageReferenceType } from '../../types';
import { CloseIcon, FolderIcon, ImageIcon, SettingsIcon } from '../common/Icons';
import { ImageFolderPickerModal } from './ImageFolderPickerModal';

interface SettingsModalProps {
  isOpen: boolean;
  settings: Settings;
  initialTab?: 'general' | 'image';
  fileTree?: FileEntry[];
  workspaceName?: string;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<Settings>) => void;
  onCreateFolder?: (folderPath: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  initialTab = 'general',
  fileTree = [],
  workspaceName,
  onClose,
  onUpdateSettings,
  onCreateFolder,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'image'>(initialTab);
  const [pickerTarget, setPickerTarget] = useState<'imageDir' | 'namingBaseDir' | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="settings-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="settings-panel" style={{ maxWidth: '580px', width: '92%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 className="settings-title" style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Cài đặt BookMD</span>
            </h2>
            <button className="btn btn-icon" onClick={onClose} title="Đóng">
              <CloseIcon size={16} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              borderBottom: '1px solid var(--border-primary)',
              marginBottom: '1.25rem',
              paddingBottom: '8px',
            }}
          >
            <button
              type="button"
              className={`btn ${activeTab === 'image' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
              }}
              onClick={() => setActiveTab('image')}
            >
              <ImageIcon size={14} />
              <span>Xử lý hình ảnh (Image Handling)</span>
            </button>

            <button
              type="button"
              className={`btn ${activeTab === 'general' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
              }}
              onClick={() => setActiveTab('general')}
            >
              <SettingsIcon size={14} />
              <span>Cài đặt chung (General)</span>
            </button>
          </div>

          {/* TAB 1: IMAGE HANDLING */}
          {activeTab === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Option 1: Image Directory */}
              <div className="settings-group">
                <label className="settings-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>1. Thư mục lưu hình ảnh tự động (Image Directory)</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    className="settings-input"
                    value={settings.imageDir}
                    placeholder="assets/images"
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => setPickerTarget('imageDir')}
                    onChange={(e) => onUpdateSettings({ imageDir: e.target.value })}
                    title="Bấm để mở cửa sổ chọn thư mục lưu ảnh"
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
                    onClick={() => setPickerTarget('imageDir')}
                    title="Mở cửa sổ chọn thư mục lưu ảnh từ Workspace"
                  >
                    <FolderIcon size={14} />
                    <span>Chọn thư mục...</span>
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', lineHeight: 1.4 }}>
                  Nơi tự động lưu các file hình ảnh khi bạn dán (paste) ảnh từ clipboard vào tài liệu. Mặc định là <code>assets/images</code>.
                </div>
              </div>

              {/* Option 2: Naming Base Directory */}
              <div className="settings-group">
                <label className="settings-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>2. Thư mục bắt đầu đặt tên ảnh (Image Naming Base Folder)</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    className="settings-input"
                    value={settings.imageNamingBaseDir || ''}
                    placeholder="Thư mục gốc Workspace (Mặc định)"
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => setPickerTarget('namingBaseDir')}
                    onChange={(e) => onUpdateSettings({ imageNamingBaseDir: e.target.value })}
                    title="Bấm để chọn thư mục làm mốc bắt đầu đặt tên"
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
                    onClick={() => setPickerTarget('namingBaseDir')}
                    title="Chọn thư mục mốc bắt đầu đặt tên ảnh"
                  >
                    <FolderIcon size={14} />
                    <span>Chọn...</span>
                  </button>
                  {settings.imageNamingBaseDir && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '7px 10px' }}
                      onClick={() => onUpdateSettings({ imageNamingBaseDir: '' })}
                      title="Đặt lại về mặc định (Thư mục gốc Workspace)"
                    >
                      Mặc định
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5, background: 'var(--bg-tertiary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  <div><b>Quy tắc đặt tên:</b> <code>&lt;folder-cha&gt;-...-&lt;tên-file-md&gt;_&lt;số-thứ-tự&gt;.png</code></div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                    Tên ảnh sẽ ghép từ các thư mục con nằm dưới thư mục mốc này. Nếu file Markdown nằm ngay tại thư mục mốc thì tên ảnh sẽ là <code>&lt;tên-file-md&gt;_&lt;thứ-tự&gt;.png</code>.
                  </div>
                </div>
              </div>

              {/* Option 3: Image Reference Syntax */}
              <div className="settings-group">
                <label className="settings-label" style={{ fontWeight: 600 }}>
                  3. Cơ chế trích dẫn đường dẫn ảnh (Image Reference Syntax)
                </label>
                <select
                  className="settings-select"
                  value={settings.imageReferenceType || 'relative'}
                  onChange={(e) => onUpdateSettings({ imageReferenceType: e.target.value as ImageReferenceType })}
                  style={{ width: '100%', padding: '8px 10px' }}
                >
                  <option value="relative">Đường dẫn tương đối (Relative Path) - Mặc định (Khuyên dùng)</option>
                  <option value="absolute">Đường dẫn tuyệt đối hệ thống (Absolute Path)</option>
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', lineHeight: 1.4 }}>
                  {settings.imageReferenceType === 'absolute'
                    ? 'Ảnh sẽ được trích dẫn theo đường dẫn tuyệt đối đầy đủ trên ổ đĩa máy tính (ví dụ: C:/.../assets/images/image.png).'
                    : 'Ảnh sẽ được trích dẫn theo đường dẫn tương đối từ file Markdown hiện tại (ví dụ: ../../assets/images/image.png), giúp tài liệu linh hoạt khi chia sẻ hoặc đồng bộ Git.'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GENERAL SETTINGS */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

                {settings.autoSave && (
                  <div
                    style={{
                      marginLeft: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-primary)',
                    }}
                  >
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      Thời gian chờ tự động lưu:
                    </label>
                    <select
                      className="settings-select"
                      style={{
                        width: 'auto',
                        padding: '4px 10px',
                        fontSize: '12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-editor)',
                      }}
                      value={settings.autoSaveDelay ?? 2}
                      onChange={(e) => onUpdateSettings({ autoSaveDelay: Number(e.target.value) })}
                    >
                      <option value={1}>1 giây</option>
                      <option value={2}>2 giây (Mặc định)</option>
                      <option value={3}>3 giây</option>
                      <option value={5}>5 giây</option>
                      <option value={10}>10 giây</option>
                      <option value={30}>30 giây</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border-primary)', paddingTop: '12px' }}>
            <button className="btn btn-primary" onClick={onClose}>
              Hoàn tất
            </button>
          </div>
        </div>
      </div>

      {/* Folder Picker for Image Directory */}
      <ImageFolderPickerModal
        isOpen={pickerTarget === 'imageDir'}
        currentImageDir={settings.imageDir}
        fileTree={fileTree}
        workspaceName={workspaceName}
        title="Chọn thư mục lưu hình ảnh tự động"
        subtitle="Chọn thư mục trong workspace dùng để chứa các file ảnh được dán vào"
        defaultSearchQuery="img"
        allowRootSelect={false}
        onClose={() => setPickerTarget(null)}
        onSelectFolder={(folder) => onUpdateSettings({ imageDir: folder })}
        onCreateFolder={onCreateFolder}
      />

      {/* Folder Picker for Naming Base Directory */}
      <ImageFolderPickerModal
        isOpen={pickerTarget === 'namingBaseDir'}
        currentImageDir={settings.imageNamingBaseDir || ''}
        fileTree={fileTree}
        workspaceName={workspaceName}
        title="Chọn thư mục bắt đầu đặt tên ảnh"
        subtitle="Chọn thư mục mốc (tên ảnh sẽ ghép từ các thư mục con bên dưới thư mục này)"
        defaultSearchQuery=""
        allowRootSelect={true}
        onClose={() => setPickerTarget(null)}
        onSelectFolder={(folder) => onUpdateSettings({ imageNamingBaseDir: folder })}
        onCreateFolder={onCreateFolder}
      />
    </>
  );
};
