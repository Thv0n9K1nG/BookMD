import React, { useState, useEffect } from 'react';
import {
  CloseIcon,
  ShieldCheckIcon,
  FolderIcon,
  FileIcon,
  FolderOpenIcon,
  CopyIcon,
} from '../common/Icons';
import {
  WorkspaceInfo,
  FileEntry,
  BackupScope,
  BackupConflictStrategy,
  BackupResult,
} from '../../types';
import {
  selectFolderDialog,
  selectFileDialog,
  executeBackupCopy,
} from '../../services/ipc';
import { openPath } from '@tauri-apps/plugin-opener';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: WorkspaceInfo | null;
  activeFile?: string; // relativePath of current active file
  tree?: FileEntry[];
  addToast: (text: string, type?: 'info' | 'success' | 'error') => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  workspace,
  activeFile,
  addToast,
}) => {
  const [scope, setScope] = useState<BackupScope>('workspace');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [destinationFolder, setDestinationFolder] = useState<string>(() => {
    return localStorage.getItem('bookmd_last_backup_dest') || '';
  });
  const [conflictStrategy, setConflictStrategy] = useState<BackupConflictStrategy>('auto_rename');
  const [skipIgnored, setSkipIgnored] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize active file or workspace defaults
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setBackupResult(null);

      // Default active file
      if (activeFile && workspace) {
        setSelectedFile(`${workspace.path}/${activeFile}`.replace(/\\/g, '/'));
      } else if (activeFile) {
        setSelectedFile(activeFile);
      }

      // If no workspace open, switch scope to folder or file
      if (!workspace) {
        setScope('file');
      } else {
        setScope('workspace');
      }
    }
  }, [isOpen, workspace, activeFile]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Browse destination directory
  const handleBrowseDestination = async () => {
    const dest = await selectFolderDialog('Chọn thư mục đích chứa bản sao lưu');
    if (dest) {
      setDestinationFolder(dest);
      localStorage.setItem('bookmd_last_backup_dest', dest);
      setErrorMsg(null);
    }
  };

  // Browse source folder
  const handleBrowseSourceFolder = async () => {
    const folder = await selectFolderDialog('Chọn thư mục cần sao lưu');
    if (folder) {
      setSelectedFolder(folder);
      setErrorMsg(null);
    }
  };

  // Browse source file
  const handleBrowseSourceFile = async () => {
    const file = await selectFileDialog('Chọn file Markdown cần sao lưu', [
      'md',
      'markdown',
      'txt',
    ]);
    if (file) {
      setSelectedFile(file);
      setErrorMsg(null);
    }
  };

  // Determine current source path based on scope
  const getSourcePath = (): string => {
    if (scope === 'workspace') {
      return workspace?.path || '';
    }
    if (scope === 'folder') {
      return selectedFolder;
    }
    return selectedFile;
  };

  const currentSource = getSourcePath();

  // Execute backup
  const handleStartBackup = async () => {
    setErrorMsg(null);
    if (!destinationFolder.trim()) {
      setErrorMsg('Vui lòng chọn thư mục lưu trữ bản sao lưu.');
      return;
    }
    if (!currentSource.trim()) {
      setErrorMsg('Vui lòng chọn đối tượng nguồn cần sao lưu.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await executeBackupCopy({
        sourcePath: currentSource,
        destinationFolder: destinationFolder.trim(),
        conflictStrategy,
        skipIgnored,
      });

      setBackupResult(result);
      localStorage.setItem('bookmd_last_backup_dest', destinationFolder.trim());
      addToast(
        `Sao lưu thành công: Đã sao chép ${result.filesCopied} file vào "${result.destinationName}"`,
        'success'
      );
    } catch (err: any) {
      console.error('Backup error:', err);
      const msg = typeof err === 'string' ? err : err?.message || 'Lỗi sao lưu không xác định';
      setErrorMsg(msg);
      addToast(`Lỗi sao lưu: ${msg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenDestinationFolder = async () => {
    if (destinationFolder) {
      try {
        await openPath(destinationFolder);
      } catch (e) {
        console.warn('Could not open path:', e);
      }
    }
  };

  const handleCopyPath = () => {
    if (backupResult?.destinationPath) {
      navigator.clipboard.writeText(backupResult.destinationPath);
      addToast('Đã sao chép đường dẫn bản sao lưu', 'info');
    }
  };

  return (
    <div
      className="prompt-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
      style={{ zIndex: 10000 }}
    >
      <div
        className="prompt-modal-dialog"
        style={{
          maxWidth: '560px',
          width: '94%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          className="prompt-modal-header"
          style={{ borderBottom: '1px solid var(--border-primary)', padding: '16px 20px' }}
        >
          <div className="prompt-modal-title-group">
            <div
              className="prompt-modal-icon-badge"
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <ShieldCheckIcon size={20} />
            </div>
            <div>
              <h3 className="prompt-modal-title" style={{ fontSize: '15px' }}>
                Sao lưu Dữ liệu (Backup Tool)
              </h3>
              <div className="prompt-modal-subtitle" style={{ fontSize: '12px' }}>
                Sao chép dự phòng dữ liệu sang thư mục an toàn phòng tránh mất mát
              </div>
            </div>
          </div>
          <button
            className="btn btn-icon prompt-close-btn"
            onClick={onClose}
            disabled={isProcessing}
            title="Đóng (Esc)"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="prompt-modal-body"
          style={{
            padding: '18px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {backupResult ? (
            /* Success Screen */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                alignItems: 'center',
                textAlign: 'center',
                padding: '10px 0',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <ShieldCheckIcon size={30} />
              </div>

              <div>
                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-heading)' }}>
                  Sao lưu hoàn tất thành công!
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Dữ liệu của bạn đã được sao chép an toàn đến thư mục đích.
                </p>
              </div>

              <div
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  textAlign: 'left',
                  fontSize: '12.5px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Tên bản sao lưu: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {backupResult.destinationName}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Số lượng file đã chép: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {backupResult.filesCopied} file
                  </span>
                </div>
                <div style={{ wordBreak: 'break-all' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Đường dẫn lưu: </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
                    {backupResult.destinationPath}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={handleOpenDestinationFolder}
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '13px',
                  }}
                >
                  <FolderOpenIcon size={15} />
                  <span>Mở thư mục sao lưu</span>
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleCopyPath}
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '13px',
                  }}
                >
                  <CopyIcon size={14} />
                  <span>Sao chép đường dẫn</span>
                </button>
              </div>
            </div>
          ) : (
            /* Configure Backup Screen */
            <>
              {errorMsg && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    color: 'var(--error, #ef4444)',
                    fontSize: '12.5px',
                  }}
                >
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* 1. Chọn đối tượng sao lưu */}
              <div>
                <label
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: 'var(--text-heading)',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  1. Chọn đối tượng cần sao lưu:
                </label>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    marginBottom: '10px',
                  }}
                >
                  {/* Option: Workspace */}
                  <div
                    onClick={() => workspace && setScope('workspace')}
                    style={{
                      border: `1.5px solid ${
                        scope === 'workspace' ? 'var(--accent)' : 'var(--border-primary)'
                      }`,
                      backgroundColor:
                        scope === 'workspace' ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                      borderRadius: '8px',
                      padding: '10px 8px',
                      cursor: workspace ? 'pointer' : 'not-allowed',
                      opacity: workspace ? 1 : 0.5,
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <FolderOpenIcon
                      size={18}
                      style={{ color: scope === 'workspace' ? 'var(--accent)' : '#f59e0b' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Workspace
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                      {workspace ? workspace.name : '(Chưa mở)'}
                    </span>
                  </div>

                  {/* Option: Folder */}
                  <div
                    onClick={() => setScope('folder')}
                    style={{
                      border: `1.5px solid ${
                        scope === 'folder' ? 'var(--accent)' : 'var(--border-primary)'
                      }`,
                      backgroundColor:
                        scope === 'folder' ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                      borderRadius: '8px',
                      padding: '10px 8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <FolderIcon
                      size={18}
                      style={{ color: scope === 'folder' ? 'var(--accent)' : '#f59e0b' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Thư mục
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                      Chọn một folder
                    </span>
                  </div>

                  {/* Option: File */}
                  <div
                    onClick={() => setScope('file')}
                    style={{
                      border: `1.5px solid ${
                        scope === 'file' ? 'var(--accent)' : 'var(--border-primary)'
                      }`,
                      backgroundColor:
                        scope === 'file' ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                      borderRadius: '8px',
                      padding: '10px 8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <FileIcon
                      size={18}
                      style={{ color: scope === 'file' ? 'var(--accent)' : 'var(--text-tertiary)' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      File
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                      Chọn một file
                    </span>
                  </div>
                </div>

                {/* Scope Details / Selection */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    fontSize: '12px',
                  }}
                >
                  {scope === 'workspace' && (
                    <div>
                      <div style={{ color: 'var(--text-tertiary)', marginBottom: '3px' }}>
                        Đường dẫn thư mục Workspace:
                      </div>
                      <div
                        style={{
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                          wordBreak: 'break-all',
                        }}
                      >
                        {workspace ? workspace.path : 'Không có workspace nào đang mở'}
                      </div>
                    </div>
                  )}

                  {scope === 'folder' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>Thư mục đã chọn:</span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleBrowseSourceFolder}
                          style={{ padding: '3px 10px', fontSize: '11.5px' }}
                        >
                          Duyệt thư mục...
                        </button>
                      </div>
                      <div
                        style={{
                          fontWeight: 500,
                          color: selectedFolder ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                          wordBreak: 'break-all',
                          fontStyle: selectedFolder ? 'normal' : 'italic',
                        }}
                      >
                        {selectedFolder || 'Chưa chọn thư mục (nhấn "Duyệt thư mục..." để chọn)'}
                      </div>
                    </div>
                  )}

                  {scope === 'file' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>File đã chọn:</span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleBrowseSourceFile}
                          style={{ padding: '3px 10px', fontSize: '11.5px' }}
                        >
                          Duyệt file khác...
                        </button>
                      </div>
                      <div
                        style={{
                          fontWeight: 500,
                          color: selectedFile ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                          wordBreak: 'break-all',
                          fontStyle: selectedFile ? 'normal' : 'italic',
                        }}
                      >
                        {selectedFile || 'Chưa chọn file (nhấn "Duyệt file..." để chọn)'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Thư mục đích chứa bản sao lưu */}
              <div>
                <label
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: 'var(--text-heading)',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  2. Chọn thư mục chứa bản sao lưu (Destination Folder):
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={destinationFolder}
                    onChange={(e) => {
                      setDestinationFolder(e.target.value);
                      localStorage.setItem('bookmd_last_backup_dest', e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="vd: D:/Backups/BookMD hoặc C:/Users/..."
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-primary)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleBrowseDestination}
                    style={{ padding: '7px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                  >
                    Duyệt...
                  </button>
                </div>
              </div>

              {/* 3. Xử lý trùng tên */}
              <div>
                <label
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: 'var(--text-heading)',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  3. Xử lý khi trùng tên trong thư mục đích:
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '12px',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    <input
                      type="radio"
                      name="conflictStrategy"
                      checked={conflictStrategy === 'auto_rename'}
                      onChange={() => setConflictStrategy('auto_rename')}
                    />
                    <span>
                      <strong style={{ color: 'var(--text-primary)' }}>Tự động đổi tên</strong> (thêm{' '}
                      <code>(1)</code>, <code>(2)</code>...) —{' '}
                      <span style={{ color: '#10b981' }}>Khuyên dùng, không sợ mất file</span>
                    </span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    <input
                      type="radio"
                      name="conflictStrategy"
                      checked={conflictStrategy === 'timestamp'}
                      onChange={() => setConflictStrategy('timestamp')}
                    />
                    <span>
                      <strong style={{ color: 'var(--text-primary)' }}>Thêm thời gian</strong> (vd:{' '}
                      <code>_20261111_221800</code>)
                    </span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    <input
                      type="radio"
                      name="conflictStrategy"
                      checked={conflictStrategy === 'overwrite'}
                      onChange={() => setConflictStrategy('overwrite')}
                    />
                    <span>
                      <strong style={{ color: 'var(--error, #ef4444)' }}>Ghi đè</strong> lên file/thư
                      mục cũ nếu đã tồn tại
                    </span>
                  </label>
                </div>
              </div>

              {/* 4. Tùy chọn nâng cao (Skip heavy folders) */}
              {(scope === 'workspace' || scope === 'folder') && (
                <div
                  style={{
                    paddingTop: '6px',
                    borderTop: '1px solid var(--border-primary)',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={skipIgnored}
                      onChange={(e) => setSkipIgnored(e.target.checked)}
                    />
                    <span>
                      Bỏ qua các thư mục nặng (<code>node_modules</code>, <code>target</code>,{' '}
                      <code>.git</code>, <code>venv</code>...) để sao lưu nhanh
                    </span>
                  </label>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="prompt-modal-footer"
          style={{
            borderTop: '1px solid var(--border-primary)',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          {backupResult ? (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setBackupResult(null)}
              >
                Sao lưu bản khác
              </button>
              <button
                type="button"
                className="btn"
                onClick={onClose}
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                Hoàn tất & Đóng
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isProcessing}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleStartBackup}
                disabled={isProcessing || !destinationFolder.trim() || !currentSource.trim()}
                style={{
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  opacity:
                    isProcessing || !destinationFolder.trim() || !currentSource.trim() ? 0.6 : 1,
                }}
              >
                <ShieldCheckIcon size={16} />
                <span>{isProcessing ? 'Đang sao lưu...' : 'Bắt đầu sao lưu'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
