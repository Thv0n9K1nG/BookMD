import React, { useState, useEffect, useRef } from 'react';
import { PdfExportConfig } from '../../types';
import { CloseIcon, PdfIcon, RotateCcwIcon } from '../common/Icons';
import {
  DEFAULT_PDF_EXPORT_CONFIG,
  formatPdfTemplatePreview,
} from '../../utils/exportPdf';
import { useTranslation } from '../../i18n';

interface ExportPdfModalProps {
  isOpen: boolean;
  docName: string;
  workspaceName?: string;
  config: PdfExportConfig;
  isExporting?: boolean;
  onClose: () => void;
  onExport: (config: PdfExportConfig) => Promise<void> | void;
  onChangeConfig?: (config: PdfExportConfig) => void;
}

type TemplateFieldKey =
  | 'headerLeft'
  | 'headerCenter'
  | 'headerRight'
  | 'footerLeft'
  | 'footerCenter'
  | 'footerRight';

const COLOR_SWATCHES = ['#64748b', '#334155', '#0f172a', '#4f46e5', '#0284c7'];

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  isOpen,
  docName,
  workspaceName,
  config,
  isExporting = false,
  onClose,
  onExport,
  onChangeConfig,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<PdfExportConfig>(config);
  const lastFocusedFieldRef = useRef<TemplateFieldKey>('headerLeft');
  const inputRefs = useRef<Partial<Record<TemplateFieldKey, HTMLInputElement | null>>>({});

  useEffect(() => {
    if (isOpen) {
      setDraft({ ...DEFAULT_PDF_EXPORT_CONFIG, ...config });
    }
  }, [isOpen, config]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isExporting, onClose]);

  if (!isOpen) return null;

  const updateDraft = (patch: Partial<PdfExportConfig>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      onChangeConfig?.(next);
      return next;
    });
  };

  const handleInsertVariable = (token: string) => {
    const field = lastFocusedFieldRef.current;
    const input = inputRefs.current[field];
    const currentValue = draft[field] || '';

    if (input && typeof input.selectionStart === 'number' && typeof input.selectionEnd === 'number') {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const updated = currentValue.slice(0, start) + token + currentValue.slice(end);
      updateDraft({ [field]: updated } as Partial<PdfExportConfig>);
      requestAnimationFrame(() => {
        input.focus();
        const caret = start + token.length;
        input.setSelectionRange(caret, caret);
      });
    } else {
      updateDraft({ [field]: currentValue + token } as Partial<PdfExportConfig>);
      input?.focus();
    }
  };

  const handleReset = () => {
    const fresh = { ...DEFAULT_PDF_EXPORT_CONFIG };
    setDraft(fresh);
    onChangeConfig?.(fresh);
  };

  const previewVars = {
    title: docName || 'Document.md',
    date: new Date().toLocaleDateString(),
    workspace: workspaceName || 'BookMD',
    page: '1',
    pages: '5',
  };

  const renderSlotInputs = (
    enabled: boolean,
    fields: { key: TemplateFieldKey; label: string; placeholder: string }[]
  ) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '8px',
        marginTop: '8px',
        opacity: enabled ? 1 : 0.45,
        pointerEvents: enabled ? 'auto' : 'none',
      }}
    >
      {fields.map(({ key, label, placeholder }) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
            {label}
          </span>
          <input
            ref={(el) => {
              inputRefs.current[key] = el;
            }}
            type="text"
            className="settings-input"
            style={{ fontSize: '12px', padding: '5px 8px' }}
            value={draft[key]}
            placeholder={placeholder}
            onFocus={() => {
              lastFocusedFieldRef.current = key;
            }}
            onChange={(e) => updateDraft({ [key]: e.target.value } as Partial<PdfExportConfig>)}
          />
        </div>
      ))}
    </div>
  );

  const previewHeaderLeft = draft.enableHeader ? formatPdfTemplatePreview(draft.headerLeft, previewVars) : '';
  const previewHeaderCenter = draft.enableHeader ? formatPdfTemplatePreview(draft.headerCenter, previewVars) : '';
  const previewHeaderRight = draft.enableHeader ? formatPdfTemplatePreview(draft.headerRight, previewVars) : '';
  const hasAnyPreviewHeader = Boolean(previewHeaderLeft || previewHeaderCenter || previewHeaderRight);

  const previewFooterLeft = draft.enableFooter ? formatPdfTemplatePreview(draft.footerLeft, previewVars) : '';
  const previewFooterCenter = draft.enableFooter ? formatPdfTemplatePreview(draft.footerCenter, previewVars) : '';
  const previewFooterRight = draft.enableFooter ? formatPdfTemplatePreview(draft.footerRight, previewVars) : '';
  const hasAnyPreviewFooter = Boolean(previewFooterLeft || previewFooterCenter || previewFooterRight);

  const placeholders = [
    { token: '{title}', label: t('pdfExport.varTitle') },
    { token: '{date}', label: t('pdfExport.varDate') },
    { token: '{workspace}', label: t('pdfExport.varWorkspace') },
    { token: '{page}', label: t('pdfExport.varPage') },
    { token: '{pages}', label: t('pdfExport.varPages') },
  ];

  return (
    <div
      className="prompt-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting) onClose();
      }}
      style={{ zIndex: 10020 }}
    >
      <div
        className="prompt-modal-dialog"
        style={{
          maxWidth: '680px',
          width: '94%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          className="prompt-modal-header"
          style={{ borderBottom: '1px solid var(--border-primary)', padding: '14px 20px' }}
        >
          <div className="prompt-modal-title-group">
            <div
              className="prompt-modal-icon-badge"
              style={{
                background: 'rgba(99, 102, 241, 0.14)',
                color: 'var(--accent)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              <PdfIcon size={20} />
            </div>
            <div>
              <h3 className="prompt-modal-title" style={{ fontSize: '15px' }}>
                {t('pdfExport.title')}
              </h3>
              <div className="prompt-modal-subtitle" style={{ fontSize: '12px' }}>
                {t('pdfExport.subtitle')}
              </div>
            </div>
          </div>
          <button
            className="btn btn-icon prompt-close-btn"
            onClick={onClose}
            disabled={isExporting}
            title={`${t('common.close')} (Esc)`}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Body */}
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
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>{t('pdfExport.activeFileLabel')} </span>
            <strong style={{ color: 'var(--text-primary)' }}>{docName}</strong>
          </div>

          {/* Placeholder quick-insert bar */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
              {t('pdfExport.placeholdersLabel')}
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {placeholders.map((p) => (
                <button
                  key={p.token}
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px' }}
                  onMouseDown={(e) => {
                    // Keep focus in the active text input instead of moving focus to the chip button
                    e.preventDefault();
                    handleInsertVariable(p.token);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Header Config Card */}
          <div
            style={{
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              padding: '10px 12px',
              background: 'var(--bg-secondary)',
            }}
          >
            <label className="settings-toggle" style={{ fontWeight: 600, fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={draft.enableHeader}
                onChange={(e) => updateDraft({ enableHeader: e.target.checked })}
              />
              <span>{t('pdfExport.enableHeader')}</span>
            </label>
            {renderSlotInputs(draft.enableHeader, [
              { key: 'headerLeft', label: t('pdfExport.leftLabel'), placeholder: t('pdfExport.leftPlaceholder') },
              { key: 'headerCenter', label: t('pdfExport.centerLabel'), placeholder: t('pdfExport.centerPlaceholder') },
              { key: 'headerRight', label: t('pdfExport.rightLabel'), placeholder: t('pdfExport.rightPlaceholder') },
            ])}
          </div>

          {/* Footer Config Card */}
          <div
            style={{
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              padding: '10px 12px',
              background: 'var(--bg-secondary)',
            }}
          >
            <label className="settings-toggle" style={{ fontWeight: 600, fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={draft.enableFooter}
                onChange={(e) => updateDraft({ enableFooter: e.target.checked })}
              />
              <span>{t('pdfExport.enableFooter')}</span>
            </label>
            {renderSlotInputs(draft.enableFooter, [
              { key: 'footerLeft', label: t('pdfExport.leftLabel'), placeholder: t('pdfExport.leftPlaceholder') },
              { key: 'footerCenter', label: t('pdfExport.centerLabel'), placeholder: t('pdfExport.centerPlaceholder') },
              { key: 'footerRight', label: t('pdfExport.rightLabel'), placeholder: t('pdfExport.rightPlaceholder') },
            ])}
          </div>

          {/* Styling & Page Behavior Options */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '10px 12px',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              background: 'var(--bg-secondary)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)' }}>
              {t('pdfExport.optionsLabel')}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12.5px' }}>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={draft.showDivider}
                  onChange={(e) => updateDraft({ showDivider: e.target.checked })}
                />
                <span>{t('pdfExport.showDivider')}</span>
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={draft.hideOnFirstPage}
                  onChange={(e) => updateDraft({ hideOnFirstPage: e.target.checked })}
                />
                <span>{t('pdfExport.hideOnFirstPage')}</span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', marginTop: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('pdfExport.fontSizeLabel')}</span>
                <select
                  className="settings-input"
                  style={{ width: 'auto', padding: '3px 8px', fontSize: '12px' }}
                  value={draft.fontSizePt}
                  onChange={(e) => updateDraft({ fontSizePt: Number(e.target.value) })}
                >
                  <option value={8}>8pt</option>
                  <option value={9}>9pt</option>
                  <option value={10}>10pt</option>
                  <option value={11}>11pt</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('pdfExport.textColorLabel')}</span>
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => updateDraft({ textColor: swatch })}
                    title={swatch}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: swatch,
                      border:
                        draft.textColor.toLowerCase() === swatch
                          ? '2px solid var(--accent)'
                          : '1px solid var(--border-primary)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={draft.textColor || '#64748b'}
                  onChange={(e) => updateDraft({ textColor: e.target.value })}
                  style={{
                    width: '24px',
                    height: '20px',
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Live A4 Layout Preview */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '6px' }}>
              {t('pdfExport.previewLabel')}
            </div>
            <div
              style={{
                background: '#ffffff',
                color: '#1e293b',
                border: '1px solid var(--border-primary)',
                borderRadius: '6px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '112px',
                boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.04)',
              }}
            >
              {/* Simulated Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  fontSize: `${Math.max(10, draft.fontSizePt + 1)}px`,
                  color: draft.textColor,
                  borderBottom: hasAnyPreviewHeader && draft.showDivider ? '1px solid #cbd5e1' : 'none',
                  paddingBottom: hasAnyPreviewHeader ? '5px' : 0,
                  minHeight: '16px',
                }}
              >
                <span style={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {previewHeaderLeft}
                </span>
                <span style={{ textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {previewHeaderCenter}
                </span>
                <span style={{ textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {previewHeaderRight}
                </span>
              </div>

              {/* Sample body indicator */}
              <div style={{ padding: '10px 0', opacity: 0.72 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', marginBottom: '3px' }}>
                  {t('pdfExport.previewSampleTitle')}
                </div>
                <div style={{ fontSize: '11px', color: '#475569' }}>
                  {t('pdfExport.previewSampleBody')}
                </div>
              </div>

              {/* Simulated Footer */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  fontSize: `${Math.max(10, draft.fontSizePt + 1)}px`,
                  color: draft.textColor,
                  borderTop: hasAnyPreviewFooter && draft.showDivider ? '1px solid #cbd5e1' : 'none',
                  paddingTop: hasAnyPreviewFooter ? '5px' : 0,
                  minHeight: '16px',
                }}
              >
                <span style={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {previewFooterLeft}
                </span>
                <span style={{ textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {previewFooterCenter}
                </span>
                <span style={{ textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {previewFooterRight}
                </span>
              </div>
            </div>
          </div>

          {/* Browser print dialog tip */}
          <div
            style={{
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              padding: '8px 12px',
              borderRadius: '6px',
              lineHeight: 1.45,
            }}
          >
            {t('pdfExport.browserHint')}
          </div>
        </div>

        {/* Footer */}
        <div
          className="prompt-modal-footer"
          style={{
            borderTop: '1px solid var(--border-primary)',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={isExporting}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          >
            <RotateCcwIcon size={13} />
            <span>{t('pdfExport.resetBtn')}</span>
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isExporting}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onExport(draft)}
              disabled={isExporting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PdfIcon size={15} />
              <span>{isExporting ? t('pdfExport.exportingBtn') : t('pdfExport.exportBtn')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
