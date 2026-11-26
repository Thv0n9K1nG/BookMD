import React, { useState, useEffect, useCallback } from 'react';
import {
  CloseIcon,
  ImagesStackIcon,
  FileIcon,
  RefreshIcon,
} from '../common/Icons';
import {
  ConsolidateScanResult,
  ConsolidateExecuteResult,
} from '../../types';
import {
  scanConsolidateImages,
  executeConsolidateImages,
  selectFolderDialog,
} from '../../services/ipc';
import { useTranslation } from '../../i18n';

interface ConsolidateImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdownFile: string | null; // relativePath of active markdown document
  content: string; // current content in editor
  imageDir: string; // settings.imageDir
  imageNamingBaseDir?: string; // settings.imageNamingBaseDir
  onSuccess: (updatedContent: string, result: ConsolidateExecuteResult) => void;
  addToast: (text: string, type?: 'info' | 'success' | 'error') => void;
}

export const ConsolidateImagesModal: React.FC<ConsolidateImagesModalProps> = ({
  isOpen,
  onClose,
  markdownFile,
  content,
  imageDir,
  imageNamingBaseDir,
  onSuccess,
  addToast,
}) => {
  const { t } = useTranslation();
  const [folderMode, setFolderMode] = useState<'default' | 'custom'>('default');
  const [customFolder, setCustomFolder] = useState<string>('');
  const [operation, setOperation] = useState<'copy' | 'move'>('move');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ConsolidateScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Trigger scan when modal opens or settings/custom folder change
  const runScan = useCallback(async () => {
    if (!markdownFile) return;
    setIsScanning(true);
    setErrorMsg(null);

    try {
      const res = await scanConsolidateImages({
        markdownFile,
        content,
        imageDir,
        namingBaseDir: imageNamingBaseDir,
        customTargetDir: folderMode === 'custom' && customFolder.trim() ? customFolder.trim() : undefined,
      });
      setScanResult(res);
    } catch (err: any) {
      console.error('Failed to scan document images:', err);
      setErrorMsg(typeof err === 'string' ? err : err?.message || t('consolidate.errorScan'));
    } finally {
      setIsScanning(false);
    }
  }, [markdownFile, content, imageDir, imageNamingBaseDir, folderMode, customFolder, t]);

  useEffect(() => {
    if (isOpen && markdownFile) {
      runScan();
    } else {
      setScanResult(null);
      setErrorMsg(null);
    }
  }, [isOpen, markdownFile, runScan]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isExecuting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExecuting, onClose]);

  if (!isOpen) return null;

  // Browse custom folder
  const handleBrowseCustomFolder = async () => {
    const folder = await selectFolderDialog(t('consolidate.selectFolderPrompt'));
    if (folder) {
      setCustomFolder(folder);
      setFolderMode('custom');
    }
  };

  // Execute consolidation
  const handleExecute = async () => {
    if (!markdownFile || !scanResult) return;
    if (scanResult.validCount === 0) {
      addToast(t('consolidate.noValidImagesToast'), 'info');
      return;
    }

    setIsExecuting(true);
    setErrorMsg(null);

    try {
      const result = await executeConsolidateImages({
        markdownFile,
        content,
        imageDir,
        namingBaseDir: imageNamingBaseDir,
        customTargetDir: folderMode === 'custom' && customFolder.trim() ? customFolder.trim() : undefined,
        operation,
      });

      addToast(
        t('consolidate.successToast', { count: result.processedCount, dest: scanResult.targetDirDisplay }),
        'success'
      );
      onSuccess(result.updatedContent, result);
      onClose();
    } catch (err: any) {
      console.error('Failed to execute image consolidation:', err);
      const msg = typeof err === 'string' ? err : err?.message || t('consolidate.errorScan');
      setErrorMsg(msg);
      addToast(t('consolidate.errorToast', { error: msg }), 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  const docName = markdownFile
    ? markdownFile.split(/[\/\\]/).pop() || markdownFile
    : t('consolidate.docFallbackName');

  const localizedNamingBaseDisplay = (() => {
    const trimmed = (imageNamingBaseDir || '').trim();
    if (!trimmed) return t('consolidate.namingBaseDefault');
    if (trimmed === '/' || trimmed === '.') return t('consolidate.namingBaseRoot');
    return t('consolidate.namingBaseFolder', { dir: trimmed });
  })();

  return (
    <div
      className="prompt-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExecuting) onClose();
      }}
      style={{ zIndex: 10000 }}
    >
      <div
        className="prompt-modal-dialog"
        style={{
          maxWidth: '680px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div
          className="prompt-modal-header"
          style={{ borderBottom: '1px solid var(--border-primary)', padding: '16px 20px' }}
        >
          <div className="prompt-modal-title-group">
            <div
              className="prompt-modal-icon-badge"
              style={{
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#3b82f6',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              <ImagesStackIcon size={20} />
            </div>
            <div>
              <h3 className="prompt-modal-title" style={{ fontSize: '15px' }}>
                {t('consolidate.title')}
              </h3>
              <div className="prompt-modal-subtitle" style={{ fontSize: '12px' }}>
                {t('consolidate.subtitle')}
              </div>
            </div>
          </div>
          <button
            className="btn btn-icon prompt-close-btn"
            onClick={onClose}
            disabled={isExecuting}
            title={`${t('common.close')} (Esc)`}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="prompt-modal-body"
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {errorMsg && (
            <div
              style={{
                padding: '9px 12px',
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

          {/* Section: Active Document & Naming Base Info */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '12.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>{t('consolidate.activeDoc')}</span>
              <span
                style={{
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <FileIcon size={14} style={{ color: 'var(--accent)' }} />
                <span>{docName}</span>
              </span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                ({markdownFile})
              </span>
            </div>

            {/* Read-only Naming Base Display */}
            <div
              style={{
                paddingTop: '6px',
                borderTop: '1px solid var(--border-primary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>{t('consolidate.namingRuleLabel')}</span>
                <span
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-secondary)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: 'var(--accent)',
                  }}
                >
                  {scanResult?.namePrefix ? `${scanResult.namePrefix}_N.<ext>` : 'note_N.png'}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                  ({localizedNamingBaseDisplay})
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                {t('consolidate.namingRuleHint')}
              </div>
            </div>
          </div>

          {/* Section: Target Folder Selection (2 Options) */}
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
              {t('consolidate.selectTargetFolderLabel')}
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Option 1: Default Folder */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1.5px solid ${
                    folderMode === 'default' ? 'var(--accent)' : 'var(--border-primary)'
                  }`,
                  backgroundColor:
                    folderMode === 'default' ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="folderMode"
                  checked={folderMode === 'default'}
                  onChange={() => setFolderMode('default')}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                    {t('consolidate.defaultModeTitle')}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {t('consolidate.defaultModeDescPrefix')} <code>{imageDir || 'images'}</code> {t('consolidate.defaultModeDescSuffix')}
                  </div>
                </div>
              </label>

              {/* Option 2: Custom Folder */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1.5px solid ${
                    folderMode === 'custom' ? 'var(--accent)' : 'var(--border-primary)'
                  }`,
                  backgroundColor:
                    folderMode === 'custom' ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="folderMode"
                  checked={folderMode === 'custom'}
                  onChange={() => setFolderMode('custom')}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                    {t('consolidate.customModeTitle')}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={customFolder}
                      onChange={(e) => {
                        setCustomFolder(e.target.value);
                        setFolderMode('custom');
                      }}
                      placeholder={t('consolidate.customModePlaceholder')}
                      onClick={() => setFolderMode('custom')}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '4px',
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
                      onClick={handleBrowseCustomFolder}
                      style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                    >
                      {t('common.browse')}
                    </button>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Section: Operation Option (Move vs Copy) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12.5px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>{t('consolidate.operationLabel')}</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="operation"
                checked={operation === 'move'}
                onChange={() => setOperation('move')}
              />
              <span>{t('consolidate.opMoveTitle')} — <span style={{ color: '#10b981' }}>{t('consolidate.opMoveDefault')}</span></span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="operation"
                checked={operation === 'copy'}
                onChange={() => setOperation('copy')}
              />
              <span>{t('consolidate.opCopyTitle')}</span>
            </label>
          </div>

          {/* Section: Image Preview Table */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-heading)' }}>
                {t('consolidate.foundImagesLabel', { count: scanResult?.items.length || 0 })}
              </label>
              <button
                type="button"
                className="btn btn-icon"
                onClick={runScan}
                disabled={isScanning}
                title={t('consolidate.rescanTitle')}
                style={{ padding: '3px' }}
              >
                <RefreshIcon size={13} />
              </button>
            </div>

            {isScanning ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--text-tertiary)',
                  fontSize: '12.5px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px',
                }}
              >
                {t('consolidate.scanningBanner')}
              </div>
            ) : !scanResult || scanResult.items.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--text-tertiary)',
                  fontSize: '12.5px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  border: '1px dashed var(--border-primary)',
                }}
              >
                {t('consolidate.emptyBanner')}
              </div>
            ) : (
              <div
                style={{
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  background: 'var(--bg-secondary)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                  <thead>
                    <tr
                      style={{
                        background: 'var(--bg-tertiary)',
                        borderBottom: '1px solid var(--border-primary)',
                        textAlign: 'left',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                      }}
                    >
                      <th style={{ padding: '6px 10px', width: '32px' }}>{t('consolidate.colIndex')}</th>
                      <th style={{ padding: '6px 10px' }}>{t('consolidate.colOriginal')}</th>
                      <th style={{ padding: '6px 10px' }}>{t('consolidate.colTarget')}</th>
                      <th style={{ padding: '6px 10px', width: '140px', textAlign: 'center' }}>{t('consolidate.colStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResult.items.map((item, idx) => {
                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid var(--border-secondary)',
                            background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                          }}
                        >
                          <td style={{ padding: '8px 10px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '8px 10px', wordBreak: 'break-all' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                color: item.exists ? 'var(--text-primary)' : 'var(--text-tertiary)',
                              }}
                            >
                              {item.rawSrc}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', wordBreak: 'break-all' }}>
                            {item.exists && !item.isRemote ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                                  {item.newFilename}
                                </span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
                                  ({item.newRelativePath})
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                {t('consolidate.skipCell')}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            {item.isRemote ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '10.5px',
                                  fontWeight: 500,
                                  backgroundColor: 'rgba(168, 85, 247, 0.12)',
                                  color: '#a855f7',
                                  border: '1px solid rgba(168, 85, 247, 0.25)',
                                }}
                              >
                                {t('consolidate.badgeOnline')}
                              </span>
                            ) : !item.exists ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '10.5px',
                                  fontWeight: 500,
                                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                }}
                              >
                                {t('consolidate.badgeMissing')}
                              </span>
                            ) : item.isAlreadyInPlace ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '10.5px',
                                  fontWeight: 500,
                                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                  color: '#f59e0b',
                                  border: '1px solid rgba(245, 158, 11, 0.25)',
                                }}
                              >
                                {t('consolidate.badgeInPlace')}
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '10.5px',
                                  fontWeight: 500,
                                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                  color: '#10b981',
                                  border: '1px solid rgba(16, 185, 129, 0.25)',
                                }}
                              >
                                {t('consolidate.badgeReady')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="prompt-modal-footer"
          style={{
            borderTop: '1px solid var(--border-primary)',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            {scanResult ? (
              <span>
                {t('consolidate.summaryPrefix')}{' '}
                <strong style={{ color: scanResult.validCount > 0 ? '#10b981' : 'var(--text-primary)' }}>
                  {scanResult.validCount}
                </strong>{' '}
                {t('consolidate.summarySuffix')}
              </span>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isExecuting}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleExecute}
              disabled={isExecuting || !scanResult || scanResult.validCount === 0}
              style={{
                backgroundColor: 'var(--accent)',
                color: '#fff',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                opacity: isExecuting || !scanResult || scanResult.validCount === 0 ? 0.6 : 1,
              }}
            >
              <ImagesStackIcon size={15} />
              <span>{isExecuting ? t('consolidate.executing') : t('consolidate.startBtn', { count: scanResult?.validCount || 0 })}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
