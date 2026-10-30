import React, { useState, useEffect, useMemo } from 'react';
import { Settings, FileEntry, KeybindingAction } from '../../types';
import {
  CloseIcon,
  FolderIcon,
  ImageIcon,
  SettingsIcon,
  KeyboardIcon,
  RotateCcwIcon,
  SearchIcon,
} from '../common/Icons';
import { ImageFolderPickerModal } from './ImageFolderPickerModal';
import {
  KEYBINDING_DEFINITIONS,
  DEFAULT_KEYBINDINGS_MAP,
  formatKeyEvent,
  getKeybinding,
} from '../../utils/keybindings';

interface SettingsModalProps {
  isOpen: boolean;
  settings: Settings;
  initialTab?: 'general' | 'image' | 'keybindings';
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
  const [activeTab, setActiveTab] = useState<'general' | 'image' | 'keybindings'>(initialTab);
  const [pickerTarget, setPickerTarget] = useState<'imageDir' | 'namingBaseDir' | null>(null);

  // Keybindings Tab State
  const [kbSearch, setKbSearch] = useState('');
  const [recordingAction, setRecordingAction] = useState<KeybindingAction | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setRecordingAction(null);
      setKbSearch('');
    }
  }, [isOpen, initialTab]);

  // Global key listener during shortcut recording
  useEffect(() => {
    if (!recordingAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingAction(null);
        return;
      }

      const combo = formatKeyEvent(e);
      if (combo) {
        onUpdateSettings({
          keybindings: {
            ...DEFAULT_KEYBINDINGS_MAP,
            ...(settings.keybindings || {}),
            [recordingAction]: combo,
          },
        });
        setRecordingAction(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [recordingAction, settings.keybindings, onUpdateSettings]);

  // Filtered Keybindings
  const filteredFormatting = useMemo(() => {
    const q = kbSearch.trim().toLowerCase();
    return KEYBINDING_DEFINITIONS.filter(
      (def) =>
        def.category === 'formatting' &&
        (!q ||
          def.name.toLowerCase().includes(q) ||
          def.description.toLowerCase().includes(q) ||
          getKeybinding(def.id, settings.keybindings).toLowerCase().includes(q))
    );
  }, [kbSearch, settings.keybindings]);

  const filteredApplication = useMemo(() => {
    const q = kbSearch.trim().toLowerCase();
    return KEYBINDING_DEFINITIONS.filter(
      (def) =>
        def.category === 'application' &&
        (!q ||
          def.name.toLowerCase().includes(q) ||
          def.description.toLowerCase().includes(q) ||
          getKeybinding(def.id, settings.keybindings).toLowerCase().includes(q))
    );
  }, [kbSearch, settings.keybindings]);

  const handleResetSingleKeybinding = (action: KeybindingAction) => {
    const defaultKey = DEFAULT_KEYBINDINGS_MAP[action];
    onUpdateSettings({
      keybindings: {
        ...DEFAULT_KEYBINDINGS_MAP,
        ...(settings.keybindings || {}),
        [action]: defaultKey,
      },
    });
  };

  const handleResetAllKeybindings = () => {
    onUpdateSettings({
      keybindings: { ...DEFAULT_KEYBINDINGS_MAP },
    });
  };

  if (!isOpen) return null;

  const renderKeybindingRow = (def: (typeof KEYBINDING_DEFINITIONS)[0]) => {
    const currentKey = getKeybinding(def.id, settings.keybindings);
    const isRecording = recordingAction === def.id;
    const isCustom = currentKey !== def.defaultKey;
    const keyParts = currentKey ? currentKey.split('+') : [];

    return (
      <div key={def.id} className={`keybinding-row ${isRecording ? 'recording' : ''}`}>
        <div className="keybinding-info">
          <div className="keybinding-name">{def.name}</div>
          <div className="keybinding-desc">{def.description}</div>
        </div>

        <div className="keybinding-action-group">
          {isRecording ? (
            <button
              type="button"
              className="keybinding-badge recording-pulse"
              onClick={() => setRecordingAction(null)}
              title="Bấm để hủy ghi nhận"
            >
              <span>Nhấn tổ hợp phím mới... (Esc để hủy)</span>
            </button>
          ) : (
            <button
              type="button"
              className="keybinding-badge"
              onClick={() => setRecordingAction(def.id)}
              title="Bấm để thay đổi phím tắt này"
            >
              {keyParts.map((k, i) => (
                <React.Fragment key={i}>
                  <kbd className="keybinding-kbd">{k}</kbd>
                  {i < keyParts.length - 1 && <span className="keybinding-plus">+</span>}
                </React.Fragment>
              ))}
            </button>
          )}

          {isCustom && !isRecording && (
            <button
              type="button"
              className="btn btn-icon"
              onClick={() => handleResetSingleKeybinding(def.id)}
              title={`Khôi phục mặc định: ${def.defaultKey}`}
              style={{ padding: '4px', opacity: 0.8 }}
            >
              <RotateCcwIcon size={12} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className="settings-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="settings-panel" style={{ maxWidth: '640px', width: '92%' }}>
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
              flexWrap: 'wrap',
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
              onClick={() => {
                setActiveTab('image');
                setRecordingAction(null);
              }}
            >
              <ImageIcon size={14} />
              <span>Xử lý hình ảnh</span>
            </button>

            <button
              type="button"
              className={`btn ${activeTab === 'keybindings' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
              }}
              onClick={() => {
                setActiveTab('keybindings');
                setRecordingAction(null);
              }}
            >
              <KeyboardIcon size={14} />
              <span>Phím tắt (Keybindings)</span>
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
              onClick={() => {
                setActiveTab('general');
                setRecordingAction(null);
              }}
            >
              <SettingsIcon size={14} />
              <span>Cài đặt chung</span>
            </button>
          </div>

          {/* TAB 1: IMAGE HANDLING */}
          {activeTab === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {/* Option 1: Image Directory */}
              <div className="settings-group">
                <label className="settings-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>1. Thư mục lưu hình ảnh tự động (Image Directory)</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    className="settings-input"
                    value={settings.imageDir}
                    placeholder="images/ (Mặc định: images/ cạnh file .md đang mở)"
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => setPickerTarget('imageDir')}
                    onChange={(e) => onUpdateSettings({ imageDir: e.target.value })}
                    title="Bấm để mở cửa sổ chọn thư mục lưu ảnh"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setPickerTarget('imageDir')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    <FolderIcon size={14} />
                    <span>Duyệt cây thư mục...</span>
                  </button>
                </div>
                <span className="settings-hint">
                  Mặc định: Tự động tạo và lưu ảnh vào thư mục <code>images/</code> đặt ngay trong thư mục chứa file Markdown đang viết (thay vì lưu cố định ở gốc workspace).<br />
                  Bạn có thể duyệt hoặc nhập thư mục khác cho phiên làm việc hiện tại.<br />
                  <em>* Lưu ý: Cài đặt này chỉ áp dụng trong phiên hiện tại và sẽ tự động đặt lại về mặc định khi mở thư mục/workspace khác hoặc khởi động lại ứng dụng.</em>
                </span>
              </div>

              {/* Option 2: Naming Base Directory */}
              <div className="settings-group">
                <label className="settings-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>2. Thư mục mốc bắt đầu đặt tên ảnh (Naming Base Directory)</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    className="settings-input"
                    value={settings.imageNamingBaseDir || ''}
                    placeholder="Theo file Markdown đang viết (Mặc định: <tên_file>_1.png)"
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => setPickerTarget('namingBaseDir')}
                    onChange={(e) => onUpdateSettings({ imageNamingBaseDir: e.target.value })}
                    title="Bấm để chọn thư mục mốc tính tên ảnh"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setPickerTarget('namingBaseDir')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    <FolderIcon size={14} />
                    <span>Duyệt cây thư mục...</span>
                  </button>
                </div>
                <span className="settings-hint">
                  Mặc định: Tên ảnh được đặt trực tiếp theo tên file Markdown đang viết (<code>&lt;tên_file&gt;_&lt;số&gt;.png</code>), không kèm tiền tố thư mục từ workspace.<br />
                  Nếu bạn nhập <code>/</code> hoặc chọn Thư mục gốc Workspace, tên ảnh sẽ được ghép từ toàn bộ cấu trúc thư mục: <code>&lt;folder con&gt;-...-&lt;tên file md&gt;_&lt;số&gt;</code>.<br />
                  Nếu chọn một thư mục con mốc, tên ảnh sẽ được ghép từ các thư mục con bên dưới mốc đó.<br />
                  <em>* Lưu ý: Cài đặt này chỉ áp dụng trong phiên hiện tại và sẽ tự động đặt lại về mặc định khi mở thư mục/workspace khác hoặc khởi động lại ứng dụng.</em>
                </span>
              </div>

              {/* Option 3: Image Reference Syntax (Relative vs Absolute) */}
              <div className="settings-group">
                <label className="settings-label" style={{ fontWeight: 600 }}>
                  3. Định dạng trích xuất đường dẫn ảnh vào tài liệu (Reference Syntax)
                </label>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="imageReferenceType"
                      value="relative"
                      checked={settings.imageReferenceType !== 'absolute'}
                      onChange={() => onUpdateSettings({ imageReferenceType: 'relative' })}
                    />
                    <span><strong>Đường dẫn tương đối (Relative)</strong> — <em>Khuyên dùng</em></span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="imageReferenceType"
                      value="absolute"
                      checked={settings.imageReferenceType === 'absolute'}
                      onChange={() => onUpdateSettings({ imageReferenceType: 'absolute' })}
                    />
                    <span><strong>Đường dẫn tuyệt đối (Absolute)</strong></span>
                  </label>
                </div>
                <span className="settings-hint">
                  {settings.imageReferenceType === 'absolute' ? (
                    <>Đường dẫn ảnh sẽ được chèn dạng tuyệt đối từ ổ đĩa (VD: <code>C:/PROJECT/BookMD/notes/images/Docker-note_1.png</code>).</>
                  ) : (
                    <>Đường dẫn ảnh được tính tương đối từ vị trí file Markdown đang mở (VD: <code>images/Docker-note_1.png</code>). Giúp bạn dễ dàng copy, chia sẻ hoặc push Git mà không bị hỏng ảnh.</>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: KEYBINDINGS */}
          {activeTab === 'keybindings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Header with Search and Reset All */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                  <SearchIcon
                    size={14}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
                  />
                  <input
                    type="text"
                    className="settings-input"
                    style={{ paddingLeft: '32px', fontSize: '12px' }}
                    placeholder="Tìm kiếm phím tắt (VD: bold, in đậm, ctrl+b, save)..."
                    value={kbSearch}
                    onChange={(e) => setKbSearch(e.target.value)}
                  />
                  {kbSearch && (
                    <button
                      className="btn btn-icon"
                      style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', padding: '2px' }}
                      onClick={() => setKbSearch('')}
                      title="Xóa tìm kiếm"
                    >
                      <CloseIcon size={12} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', padding: '6px 10px' }}
                  onClick={handleResetAllKeybindings}
                  title="Khôi phục toàn bộ phím tắt về mặc định ban đầu"
                >
                  <RotateCcwIcon size={12} />
                  <span>Khôi phục mặc định</span>
                </button>
              </div>

              {/* Scrollable Keybindings List */}
              <div
                className="keybindings-scroll-container"
                style={{
                  maxHeight: '380px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.1rem',
                  paddingRight: '6px',
                }}
              >
                {/* Section: Formatting */}
                {filteredFormatting.length > 0 && (
                  <div className="keybinding-section">
                    <div className="keybinding-section-title">
                      <span>✍️ Định dạng Markdown (Markdown Formatting)</span>
                      <span className="keybinding-count">({filteredFormatting.length})</span>
                    </div>
                    <div className="keybinding-list">
                      {filteredFormatting.map(renderKeybindingRow)}
                    </div>
                  </div>
                )}

                {/* Section: Application */}
                {filteredApplication.length > 0 && (
                  <div className="keybinding-section">
                    <div className="keybinding-section-title">
                      <span>⚙️ Hệ thống & Điều hướng (App & Navigation)</span>
                      <span className="keybinding-count">({filteredApplication.length})</span>
                    </div>
                    <div className="keybinding-list">
                      {filteredApplication.map(renderKeybindingRow)}
                    </div>
                  </div>
                )}

                {filteredFormatting.length === 0 && filteredApplication.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                    Không tìm thấy phím tắt nào khớp với "{kbSearch}".
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: GENERAL SETTINGS */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              <div className="settings-group">
                <label className="settings-label">Giao diện (Theme)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`btn ${settings.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => onUpdateSettings({ theme: 'dark' })}
                  >
                    🌙 Tối (Dark)
                  </button>
                  <button
                    className={`btn ${settings.theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => onUpdateSettings({ theme: 'light' })}
                  >
                    ☀️ Sáng (Light)
                  </button>
                </div>
              </div>

              <div className="settings-group">
                <label className="settings-label">Cỡ chữ Editor ({settings.fontSize}px)</label>
                <input
                  type="range"
                  min={11}
                  max={24}
                  value={settings.fontSize}
                  onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>

              <div className="settings-group">
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={settings.lineNumbers}
                    onChange={(e) => onUpdateSettings({ lineNumbers: e.target.checked })}
                  />
                  <span>Hiện số dòng (Line Numbers)</span>
                </label>
              </div>

              <div className="settings-group">
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={settings.wordWrap}
                    onChange={(e) => onUpdateSettings({ wordWrap: e.target.checked })}
                  />
                  <span>Tự động xuống dòng (Word Wrap)</span>
                </label>
              </div>

              <div className="settings-group">
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={settings.autoSave}
                    onChange={(e) => onUpdateSettings({ autoSave: e.target.checked })}
                  />
                  <span>Tự động lưu (Auto Save)</span>
                </label>
                {settings.autoSave && (
                  <div style={{ marginTop: '8px', paddingLeft: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Thời gian chờ lưu:</span>
                    <select
                      className="settings-input"
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
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

      {/* Tree Folder Picker for Image Directory */}
      <ImageFolderPickerModal
        isOpen={pickerTarget === 'imageDir'}
        currentImageDir={settings.imageDir}
        fileTree={fileTree}
        workspaceName={workspaceName}
        title="Chọn thư mục lưu hình ảnh tự động"
        subtitle="Chọn một thư mục trong cây thư mục để tự động lưu ảnh paste từ clipboard"
        defaultSearchQuery="img"
        allowRootSelect={false}
        onClose={() => setPickerTarget(null)}
        onSelectFolder={(folder) => onUpdateSettings({ imageDir: folder })}
        onCreateFolder={onCreateFolder}
      />

      {/* Tree Folder Picker for Naming Base Directory */}
      <ImageFolderPickerModal
        isOpen={pickerTarget === 'namingBaseDir'}
        currentImageDir={settings.imageNamingBaseDir || ''}
        fileTree={fileTree}
        workspaceName={workspaceName}
        title="Chọn thư mục mốc bắt đầu đặt tên ảnh"
        subtitle="Chọn thư mục mốc (tên ảnh sẽ được ghép từ các thư mục con bên dưới thư mục này)"
        defaultSearchQuery=""
        allowRootSelect={true}
        onClose={() => setPickerTarget(null)}
        onSelectFolder={(folder) => onUpdateSettings({ imageNamingBaseDir: folder })}
        onCreateFolder={onCreateFolder}
      />
    </>
  );
};
