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
import { useTranslation } from '../../i18n';

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
  const { t } = useTranslation();
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
    const dest = await selectFolderDialog(t('backup.selectDestPrompt'));
    if (dest) {
      setDestinationFolder(dest);
      localStorage.setItem('bookmd_last_backup_dest', dest);
      setErrorMsg(null);
    }
  };

  // Browse source folder
  const handleBrowseSourceFolder = async () => {
    const folder = await selectFolderDialog(t('backup.selectSourceFolderPrompt'));
    if (folder) {
      setSelectedFolder(folder);
      setErrorMsg(null);
    }
  };

  // Browse source file
  const handleBrowseSourceFile = async () => {
    const file = await selectFileDialog(t('backup.selectSourceFilePrompt'), [
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
      setErrorMsg(t('backup.errorNoDest'));
      return;
    }
    if (!currentSource.trim()) {
      setErrorMsg(t('backup.errorNoSource'));
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
        t('backup.successToast', { count: result.filesCopied, dest: result.destinationName }),
        'success'
      );
    } catch (err: any) {
      console.error('Backup error:', err);
      const msg = typeof err === 'string' ? err : err?.message || t('backup.unknownError');
      setErrorMsg(msg);
      addToast(t('backup.errorToast', { error: msg }), 'error');
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
      addToast(t('backup.copiedPathToast'), 'info');
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
                {t('backup.title')}
              </h3>
              <div className="prompt-modal-subtitle" style={{ fontSize: '12px' }}>
                {t('backup.subtitle')}
              </div>
            </div>
          </div>
          <button
            className="btn btn-icon prompt-close-btn"
            onClick={onClose}
            disabled={isProcessing}
            title={`${t('common.close')} (Esc)`}
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
                  {t('backup.successHeading')}
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  {t('backup.successSubheading')}
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
                  <span style={{ color: 'var(--text-tertiary)' }}>{t('backup.backupNameLabel')} </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {backupResult.destinationName}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>{t('backup.filesCopiedLabel')} </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {backupResult.filesCopied} {t('backup.filesUnit')}
                  </span>
                </div>
                <div style={{ wordBreak: 'break-all' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{t('backup.savePathLabel')} </span>
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
                  <span>{t('backup.openBackupFolder')}</span>
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
                  <span>{t('backup.copyPathBtn')}</span>
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

              {/* 1. Select backup target */}
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
                  {t('backup.step1Label')}
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
                      {t('backup.workspaceCardTitle')}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                      {workspace ? workspace.name : t('backup.workspaceCardNotOpen')}
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
                      {t('backup.folderCardTitle')}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                      {t('backup.folderCardDesc')}
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
                      {t('backup.fileCardTitle')}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                      {t('backup.fileCardDesc')}
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
                        {t('backup.wsPathLabel')}
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
                        {workspace ? workspace.path : t('backup.noWsOpen')}
                      </div>
                    </div>
                  )}

                  {scope === 'folder' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>{t('backup.selectedFolderLabel')}</span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleBrowseSourceFolder}
                          style={{ padding: '3px 10px', fontSize: '11.5px' }}
                        >
                          {t('backup.browseFolderBtn')}
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
                        {selectedFolder || t('backup.noFolderSelected')}
                      </div>
                    </div>
                  )}

                  {scope === 'file' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>{t('backup.selectedFileLabel')}</span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleBrowseSourceFile}
                          style={{ padding: '3px 10px', fontSize: '11.5px' }}
                        >
                          {t('backup.browseOtherFileBtn')}
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
                        {selectedFile || t('backup.noFileSelected')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Destination folder */}
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
                  {t('backup.step2Label')}
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
                    placeholder={t('backup.destExamplePlaceholder')}
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
                    {t('common.browse')}
                  </button>
                </div>
              </div>

              {/* 3. Conflict resolution */}
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
                  {t('backup.step3Label')}
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
                      <strong style={{ color: 'var(--text-primary)' }}>{t('backup.autoRenameTitle')}</strong>{' '}
                      {t('backup.autoRenameSuffix')} —{' '}
                      <span style={{ color: '#10b981' }}>{t('backup.autoRenameRec')}</span>
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
                      <strong style={{ color: 'var(--text-primary)' }}>{t('backup.timestampTitle')}</strong>{' '}
                      {t('backup.timestampExample')}
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
                      <strong style={{ color: 'var(--error, #ef4444)' }}>{t('backup.overwriteTitle')}</strong>{' '}
                      {t('backup.overwriteDesc')}
                    </span>
                  </label>
                </div>
              </div>

              {/* 4. Skip heavy folders */}
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
                      {t('backup.skipIgnoredPrefix')}
                      <code>node_modules</code>, <code>target</code>, <code>.git</code>, <code>venv</code>...
                      {t('backup.skipIgnoredSuffix')}
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
                {t('backup.backupAnotherBtn')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={onClose}
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                {t('backup.finishAndCloseBtn')}
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
                {t('common.cancel')}
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
                <span>{isProcessing ? t('backup.processing') : t('backup.startBtn')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
