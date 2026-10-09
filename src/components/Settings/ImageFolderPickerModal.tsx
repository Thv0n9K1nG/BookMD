import React, { useState, useMemo } from 'react';
import { FileEntry } from '../../types';
import {
  FolderIcon,
  SearchIcon,
  CloseIcon,
  CheckIcon,
  PlusIcon,
  ImageIcon,
} from '../common/Icons';

interface ImageFolderPickerModalProps {
  isOpen: boolean;
  currentImageDir: string;
  fileTree: FileEntry[];
  workspaceName?: string;
  onClose: () => void;
  onSelectFolder: (folderPath: string) => void;
  onCreateFolder?: (folderPath: string) => Promise<void>;
}

interface FolderOption {
  name: string;
  relativePath: string;
}

// Recursively extract all directory entries from file tree
function extractDirectories(entries: FileEntry[]): FolderOption[] {
  const dirs: FolderOption[] = [];

  function traverse(items: FileEntry[]) {
    for (const item of items) {
      if (item.kind === 'directory') {
        dirs.push({
          name: item.name,
          relativePath: item.relativePath.replace(/\\/g, '/'),
        });
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      }
    }
  }

  traverse(entries);
  return dirs;
}

export const ImageFolderPickerModal: React.FC<ImageFolderPickerModalProps> = ({
  isOpen,
  currentImageDir,
  fileTree,
  workspaceName,
  onClose,
  onSelectFolder,
  onCreateFolder,
}) => {
  // Default search query defaults to 'img' as requested
  const [searchQuery, setSearchQuery] = useState('img');
  const [selectedFolder, setSelectedFolder] = useState<string>(currentImageDir || 'assets/images');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Extract all folders from the workspace tree
  const allFolders = useMemo(() => {
    const list = extractDirectories(fileTree);
    // Ensure standard suggestions appear if they already exist
    return list;
  }, [fileTree]);

  // Filter folders by search query (folders only)
  const filteredFolders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allFolders;
    return allFolders.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.relativePath.toLowerCase().includes(q)
    );
  }, [allFolders, searchQuery]);

  // Quick preset suggestions
  const presets = ['assets/images', 'images', 'img', 'assets/img', 'static/images'];

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedFolder.trim()) {
      onSelectFolder(selectedFolder.trim().replace(/\\/g, '/'));
      onClose();
    }
  };

  const handleCreateNew = async () => {
    const path = newFolderName.trim() || searchQuery.trim();
    if (!path) return;
    const cleanPath = path.replace(/\\/g, '/');
    if (onCreateFolder) {
      await onCreateFolder(cleanPath);
    }
    setSelectedFolder(cleanPath);
    setIsCreatingCustom(false);
    setNewFolderName('');
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="folder-picker-modal">
        {/* Header */}
        <div className="folder-picker-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="folder-picker-icon-badge">
              <ImageIcon size={18} />
            </div>
            <div>
              <h3 className="folder-picker-title">Chọn thư mục lưu hình ảnh</h3>
              <p className="folder-picker-subtitle">
                {workspaceName ? `Workspace: ${workspaceName}` : 'Workspace hiện tại'} • Chỉ hiển thị thư mục
              </p>
            </div>
          </div>
          <button className="btn btn-icon" onClick={onClose} title="Đóng">
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Filter / Search Bar (Defaults to 'img') */}
        <div className="folder-picker-search-container">
          <div className="folder-picker-search-box">
            <SearchIcon size={15} style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="folder-picker-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm thư mục trong workspace (mặc định 'img')..."
              autoFocus
            />
            {searchQuery && (
              <button
                className="btn btn-icon"
                onClick={() => setSearchQuery('')}
                title="Xóa tìm kiếm (xem tất cả thư mục)"
                style={{ padding: '2px' }}
              >
                <CloseIcon size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Quick presets */}
        <div className="folder-picker-presets">
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginRight: '4px' }}>
            Gợi ý nhanh:
          </span>
          {presets.map((preset) => {
            const isCurrent = selectedFolder === preset;
            return (
              <button
                key={preset}
                type="button"
                className={`folder-preset-pill ${isCurrent ? 'active' : ''}`}
                onClick={() => {
                  setSelectedFolder(preset);
                  setSearchQuery(preset.includes('/') ? preset.split('/')[1] : preset);
                }}
              >
                <FolderIcon size={12} />
                <span>{preset}</span>
              </button>
            );
          })}
        </div>

        {/* Folder List (Folders ONLY) */}
        <div className="folder-picker-list-container">
          <div className="folder-picker-list-header">
            <span>Danh sách thư mục ({filteredFolders.length})</span>
            {searchQuery && (
              <span style={{ color: 'var(--accent)' }}>
                Đang lọc theo: "{searchQuery}"
              </span>
            )}
          </div>

          <div className="folder-picker-list">
            {filteredFolders.length > 0 ? (
              filteredFolders.map((folder) => {
                const isSelected = selectedFolder === folder.relativePath;
                return (
                  <div
                    key={folder.relativePath}
                    className={`folder-picker-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedFolder(folder.relativePath)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <FolderIcon
                        size={16}
                        style={{ color: isSelected ? 'var(--accent)' : 'var(--text-secondary)', flexShrink: 0 }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span className="folder-item-name">{folder.name}</span>
                        <span className="folder-item-path">{folder.relativePath}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="folder-item-check">
                        <CheckIcon size={14} />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="folder-picker-empty">
                <p>Không tìm thấy thư mục nào khớp với "{searchQuery}".</p>
                {searchQuery.trim() && (
                  <button
                    className="btn btn-secondary"
                    style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      const newPath = searchQuery.trim();
                      setSelectedFolder(newPath);
                    }}
                  >
                    <PlusIcon size={14} />
                    <span>Dùng "{searchQuery.trim()}" làm thư mục lưu ảnh mới</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Custom Folder Input or New Folder Creator */}
        <div className="folder-picker-custom-section">
          {!isCreatingCustom ? (
            <button
              className="btn btn-text"
              style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)' }}
              onClick={() => setIsCreatingCustom(true)}
            >
              <PlusIcon size={13} />
              <span>Nhập đường dẫn thư mục tùy chỉnh khác...</span>
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
              <input
                type="text"
                className="folder-picker-search-input"
                style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
                placeholder="VD: assets/my-images hoặc docs/img..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNew();
                }}
              />
              <button className="btn btn-primary" onClick={handleCreateNew} style={{ fontSize: '12px' }}>
                Chọn
              </button>
              <button className="btn btn-secondary" onClick={() => setIsCreatingCustom(false)} style={{ fontSize: '12px' }}>
                Hủy
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="folder-picker-footer">
          <div className="folder-picker-selection-info">
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Thư mục đang chọn:</span>
            <code className="folder-picker-selected-path">
              {selectedFolder || '(Chưa chọn)'}
            </code>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={!selectedFolder}
            >
              <CheckIcon size={14} style={{ marginRight: '6px' }} />
              <span>Xác nhận chọn thư mục này</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
