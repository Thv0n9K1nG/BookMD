import React, { useState, useMemo, useEffect } from 'react';
import { FileEntry } from '../../types';
import {
  FolderIcon,
  FolderOpenIcon,
  ChevronRightIcon,
  SearchIcon,
  CloseIcon,
  CheckIcon,
  PlusIcon,
  ImageIcon,
} from '../common/Icons';

export interface DirectoryNode {
  name: string;
  relativePath: string;
  children: DirectoryNode[];
}

export function buildDirectoryTree(entries: FileEntry[]): DirectoryNode[] {
  const dirs: DirectoryNode[] = [];
  for (const item of entries) {
    if (item.kind === 'directory') {
      dirs.push({
        name: item.name,
        relativePath: item.relativePath.replace(/\\/g, '/'),
        children: item.children ? buildDirectoryTree(item.children) : [],
      });
    }
  }
  return dirs;
}

function getAllDirectoryPaths(nodes: DirectoryNode[]): string[] {
  const paths: string[] = [];
  function traverse(list: DirectoryNode[]) {
    for (const node of list) {
      paths.push(node.relativePath);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  traverse(nodes);
  return paths;
}

function getAncestorPaths(relativePath: string): string[] {
  const parts = relativePath.replace(/\\/g, '/').split('/');
  const ancestors: string[] = [];
  let current = '';
  for (let i = 0; i < parts.length - 1; i++) {
    current = current ? `${current}/${parts[i]}` : parts[i];
    ancestors.push(current);
  }
  return ancestors;
}

function filterDirectoryTree(
  nodes: DirectoryNode[],
  query: string
): { filtered: DirectoryNode[]; matchedAncestors: Set<string> } {
  const matchedAncestors = new Set<string>();
  const q = query.trim().toLowerCase();

  if (!q) {
    return { filtered: nodes, matchedAncestors };
  }

  function filterNodes(list: DirectoryNode[]): DirectoryNode[] {
    const result: DirectoryNode[] = [];
    for (const node of list) {
      const isSelfMatch =
        node.name.toLowerCase().includes(q) ||
        node.relativePath.toLowerCase().includes(q);
      const childResults = filterNodes(node.children);

      if (isSelfMatch || childResults.length > 0) {
        getAncestorPaths(node.relativePath).forEach((p) => matchedAncestors.add(p));
        matchedAncestors.add(node.relativePath);
        result.push({
          ...node,
          children: childResults,
        });
      }
    }
    return result;
  }

  return { filtered: filterNodes(nodes), matchedAncestors };
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const q = query.trim().toLowerCase();
  const index = text.toLowerCase().indexOf(q);
  if (index === -1) return text;
  return (
    <>
      {text.substring(0, index)}
      <span style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'underline' }}>
        {text.substring(index, index + q.length)}
      </span>
      {text.substring(index + q.length)}
    </>
  );
}

interface ImageFolderPickerModalProps {
  isOpen: boolean;
  currentImageDir: string;
  fileTree: FileEntry[];
  workspaceName?: string;
  title?: string;
  subtitle?: string;
  defaultSearchQuery?: string;
  allowRootSelect?: boolean;
  onClose: () => void;
  onSelectFolder: (folderPath: string) => void;
  onCreateFolder?: (folderPath: string) => Promise<void>;
}

export const ImageFolderPickerModal: React.FC<ImageFolderPickerModalProps> = ({
  isOpen,
  currentImageDir,
  fileTree,
  workspaceName,
  title,
  subtitle,
  defaultSearchQuery,
  allowRootSelect = false,
  onClose,
  onSelectFolder,
  onCreateFolder,
}) => {
  const initialQuery = defaultSearchQuery !== undefined ? defaultSearchQuery : '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedFolder, setSelectedFolder] = useState<string>(currentImageDir || '');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set<string>());
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Extract pure directory tree
  const dirTree = useMemo(() => buildDirectoryTree(fileTree), [fileTree]);

  // Total directory count in entire workspace
  const totalDirsCount = useMemo(() => {
    return getAllDirectoryPaths(dirTree).length;
  }, [dirTree]);

  // Filtered tree & matching ancestors
  const { filtered: visibleTree, matchedAncestors } = useMemo(() => {
    return filterDirectoryTree(dirTree, searchQuery);
  }, [dirTree, searchQuery]);

  // Keep selectedFolder, search query, and initial tree expansion in sync when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFolder(currentImageDir || '');
      setSearchQuery(defaultSearchQuery !== undefined ? defaultSearchQuery : '');
      setIsCreatingCustom(false);
      setNewFolderName('');

      // Auto expand ancestors of current selection + top-level folders
      const initialExpanded = new Set<string>();
      if (currentImageDir) {
        getAncestorPaths(currentImageDir).forEach((p) => initialExpanded.add(p));
        initialExpanded.add(currentImageDir);
      }
      // Also expand top level folders
      dirTree.forEach((node) => initialExpanded.add(node.relativePath));
      setExpandedPaths(initialExpanded);
    }
  }, [isOpen, currentImageDir, defaultSearchQuery, dirTree]);

  // When search query changes, auto-expand matching ancestor paths
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        matchedAncestors.forEach((p) => next.add(p));
        return next;
      });
    }
  }, [searchQuery, matchedAncestors]);

  if (!isOpen) return null;

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const all = getAllDirectoryPaths(dirTree);
    setExpandedPaths(new Set(all));
  };

  const handleCollapseAll = () => {
    setExpandedPaths(new Set());
  };

  const handleConfirm = () => {
    onSelectFolder(selectedFolder.trim().replace(/\\/g, '/'));
    onClose();
  };

  const handleCreateNew = async () => {
    const path = newFolderName.trim() || searchQuery.trim();
    if (!path) return;
    const cleanPath = path.replace(/\\/g, '/');
    if (onCreateFolder) {
      await onCreateFolder(cleanPath);
    }
    setSelectedFolder(cleanPath);
    // Expand to new path
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      getAncestorPaths(cleanPath).forEach((p) => next.add(p));
      next.add(cleanPath);
      return next;
    });
    setIsCreatingCustom(false);
    setNewFolderName('');
  };

  // Quick preset suggestions
  const presets = ['assets/images', 'images', 'img', 'assets/img', 'static/images'];

  // Render a directory tree node recursively
  const renderTreeNode = (node: DirectoryNode, depth = 0): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedPaths.has(node.relativePath);
    const isSelected = selectedFolder === node.relativePath;

    return (
      <div key={node.relativePath} className="folder-tree-node">
        <div
          className={`folder-picker-item folder-tree-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 18 + 12}px` }}
          onClick={() => setSelectedFolder(node.relativePath)}
          onDoubleClick={() => hasChildren && toggleExpand(node.relativePath)}
          title={node.relativePath}
        >
          {/* Chevron expand/collapse toggle */}
          {hasChildren ? (
            <button
              type="button"
              className={`folder-tree-chevron ${isExpanded ? 'open' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.relativePath);
              }}
              title={isExpanded ? 'Thu gọn thư mục' : 'Mở rộng thư mục'}
            >
              <ChevronRightIcon size={12} />
            </button>
          ) : (
            <span className="folder-tree-spacer" />
          )}

          {/* Folder Icon */}
          <span className="folder-tree-icon">
            {isExpanded ? (
              <FolderOpenIcon size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
            ) : (
              <FolderIcon size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
            )}
          </span>

          {/* Folder Name & Details */}
          <div className="folder-tree-content">
            <span className="folder-item-name">
              {highlightMatch(node.name, searchQuery)}
            </span>
            {hasChildren && (
              <span className="folder-item-count" title={`${node.children.length} thư mục con`}>
                {node.children.length}
              </span>
            )}
            <span className="folder-item-path">{node.relativePath}</span>
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <div className="folder-item-check">
              <CheckIcon size={14} />
            </div>
          )}
        </div>

        {/* Recursive Children */}
        {hasChildren && isExpanded && (
          <div className="folder-tree-children">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
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
              <h3 className="folder-picker-title">{title || 'Chọn thư mục lưu hình ảnh'}</h3>
              <p className="folder-picker-subtitle">
                {subtitle || `${workspaceName ? `Workspace: ${workspaceName}` : 'Workspace'} • Cây thư mục dạng phân cấp`}
              </p>
            </div>
          </div>
          <button className="btn btn-icon" onClick={onClose} title="Đóng">
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className="folder-picker-search-container">
          <div className="folder-picker-search-box">
            <SearchIcon size={15} style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="folder-picker-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm thư mục trong cây thư mục..."
              autoFocus
            />
            {searchQuery && (
              <button
                className="btn btn-icon"
                onClick={() => setSearchQuery('')}
                title="Xóa tìm kiếm"
                style={{ padding: '2px' }}
              >
                <CloseIcon size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Quick presets (only for image folder, not base naming dir) */}
        {!allowRootSelect && (
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
                    setExpandedPaths((prev) => {
                      const next = new Set(prev);
                      getAncestorPaths(preset).forEach((p) => next.add(p));
                      next.add(preset);
                      return next;
                    });
                  }}
                >
                  <FolderIcon size={12} />
                  <span>{preset}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Folder Tree Container */}
        <div className="folder-picker-list-container">
          <div className="folder-picker-list-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>
                Cây thư mục ({totalDirsCount} thư mục)
              </span>
              {searchQuery && (
                <span style={{ color: 'var(--accent)' }}>
                  • Lọc theo: "{searchQuery}"
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-text"
                style={{ fontSize: '11px', padding: '2px 6px', color: 'var(--text-secondary)' }}
                onClick={handleExpandAll}
                title="Mở rộng tất cả thư mục"
              >
                Mở rộng tất cả
              </button>
              <span style={{ opacity: 0.3 }}>|</span>
              <button
                type="button"
                className="btn btn-text"
                style={{ fontSize: '11px', padding: '2px 6px', color: 'var(--text-secondary)' }}
                onClick={handleCollapseAll}
                title="Thu gọn tất cả thư mục"
              >
                Thu gọn
              </button>
            </div>
          </div>

          <div className="folder-picker-list folder-picker-tree">
            {/* Special Options when allowRootSelect is true (Naming Base Dir) */}
            {allowRootSelect && (
              <>
                <div
                  className={`folder-picker-item folder-tree-item ${selectedFolder === '' ? 'selected' : ''}`}
                  style={{ paddingLeft: '12px', marginBottom: '2px' }}
                  onClick={() => setSelectedFolder('')}
                >
                  <span className="folder-tree-spacer" />
                  <span className="folder-tree-icon">
                    <CheckIcon
                      size={15}
                      style={{ color: selectedFolder === '' ? 'var(--accent)' : 'var(--text-tertiary)' }}
                    />
                  </span>
                  <div className="folder-tree-content">
                    <span className="folder-item-name" style={{ fontWeight: 600 }}>
                      Theo file Markdown đang viết (Mặc định)
                    </span>
                    <span className="folder-item-path">
                      Tên ảnh đặt trực tiếp theo file: &lt;tên_file&gt;_&lt;số&gt;.png
                    </span>
                  </div>
                  {selectedFolder === '' && (
                    <div className="folder-item-check">
                      <CheckIcon size={14} />
                    </div>
                  )}
                </div>

                <div
                  className={`folder-picker-item folder-tree-item ${selectedFolder === '/' ? 'selected' : ''}`}
                  style={{ paddingLeft: '12px', marginBottom: '4px' }}
                  onClick={() => setSelectedFolder('/')}
                >
                  <span className="folder-tree-spacer" />
                  <span className="folder-tree-icon">
                    <FolderIcon
                      size={16}
                      style={{ color: selectedFolder === '/' ? 'var(--accent)' : 'var(--text-secondary)' }}
                    />
                  </span>
                  <div className="folder-tree-content">
                    <span className="folder-item-name" style={{ fontWeight: 600 }}>
                      Gốc Workspace (Toàn bộ workspace /)
                    </span>
                    <span className="folder-item-path">
                      Tên ảnh tính từ thư mục gốc: &lt;folder&gt;-...-&lt;tên_file&gt;_&lt;số&gt;.png
                    </span>
                  </div>
                  {selectedFolder === '/' && (
                    <div className="folder-item-check">
                      <CheckIcon size={14} />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Tree nodes */}
            {visibleTree.length > 0 ? (
              visibleTree.map((node) => renderTreeNode(node, 0))
            ) : (
              <div className="folder-picker-empty">
                <p>Không tìm thấy thư mục nào khớp với "{searchQuery}".</p>
                {searchQuery.trim() && (
                  <button
                    className="btn btn-secondary"
                    style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      const newPath = searchQuery.trim();
                      setSelectedFolder(newPath);
                    }}
                  >
                    <PlusIcon size={14} />
                    <span>Dùng "{searchQuery.trim()}" làm đường dẫn mới</span>
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
              <span>Tạo thư mục mới hoặc nhập đường dẫn tùy chỉnh...</span>
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
                Tạo & Chọn
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
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Đang chọn:</span>
            <code className="folder-picker-selected-path">
              {selectedFolder === '' && allowRootSelect ? 'Theo file Markdown đang viết (Mặc định)' : selectedFolder === '/' && allowRootSelect ? '/ (Gốc workspace)' : selectedFolder || '(Chưa chọn)'}
            </code>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={!allowRootSelect && !selectedFolder}
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
