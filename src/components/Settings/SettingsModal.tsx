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
import { Language, useTranslation } from '../../i18n';

interface SettingsModalProps {
  isOpen: boolean;
  settings: Settings;
  initialTab?: 'general' | 'image' | 'keybindings';
  fileTree?: FileEntry[];
  workspaceName?: string;
  hasUnsavedTabs?: boolean;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<Settings>) => void;
  onCreateFolder?: (folderPath: string) => Promise<void>;
  onSaveAll?: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  initialTab = 'general',
  fileTree = [],
  workspaceName,
  hasUnsavedTabs = false,
  onClose,
  onUpdateSettings,
  onCreateFolder,
  onSaveAll,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'general' | 'image' | 'keybindings'>(initialTab);
  const [pickerTarget, setPickerTarget] = useState<'imageDir' | 'namingBaseDir' | null>(null);
  const [showRestartPrompt, setShowRestartPrompt] = useState(false);

  // Keybindings Tab State
  const [kbSearch, setKbSearch] = useState('');
  const [recordingAction, setRecordingAction] = useState<KeybindingAction | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setRecordingAction(null);
      setKbSearch('');
      setShowRestartPrompt(false);
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

  // Filtered Keybindings (matches both localized text and shortcut combo)
  const filteredFormatting = useMemo(() => {
    const q = kbSearch.trim().toLowerCase();
    return KEYBINDING_DEFINITIONS.filter((def) => {
      if (def.category !== 'formatting') return false;
      if (!q) return true;
      const locName = t(`keybindings.${def.id}.name`).toLowerCase();
      const locDesc = t(`keybindings.${def.id}.description`).toLowerCase();
      return (
        locName.includes(q) ||
        locDesc.includes(q) ||
        def.name.toLowerCase().includes(q) ||
        def.description.toLowerCase().includes(q) ||
        getKeybinding(def.id, settings.keybindings).toLowerCase().includes(q)
      );
    });
  }, [kbSearch, settings.keybindings, t]);

  const filteredApplication = useMemo(() => {
    const q = kbSearch.trim().toLowerCase();
    return KEYBINDING_DEFINITIONS.filter((def) => {
      if (def.category !== 'application') return false;
      if (!q) return true;
      const locName = t(`keybindings.${def.id}.name`).toLowerCase();
      const locDesc = t(`keybindings.${def.id}.description`).toLowerCase();
      return (
        locName.includes(q) ||
        locDesc.includes(q) ||
        def.name.toLowerCase().includes(q) ||
        def.description.toLowerCase().includes(q) ||
        getKeybinding(def.id, settings.keybindings).toLowerCase().includes(q)
      );
    });
  }, [kbSearch, settings.keybindings, t]);

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

  const persistSettingsSynchronously = (nextLang?: Language) => {
    try {
      const { imageDir: _imgDir, imageNamingBaseDir: _namingDir, ...persistent } = settings;
      if (nextLang) {
        persistent.language = nextLang;
      }
      localStorage.setItem('bookmd_settings', JSON.stringify(persistent));
    } catch {
      // ignore storage errors
    }
  };

  const handleSelectLanguage = (lang: Language) => {
    const current = settings.language || 'vi';
    if (lang === current) return;
    persistSettingsSynchronously(lang);
    onUpdateSettings({ language: lang });
    setShowRestartPrompt(true);
  };

  const handleRestartNow = async (saveFirst = false) => {
    if (saveFirst && onSaveAll) {
      await onSaveAll();
    }
    persistSettingsSynchronously();
    window.location.reload();
  };

  if (!isOpen) return null;

  const renderKeybindingRow = (def: (typeof KEYBINDING_DEFINITIONS)[0]) => {
    const currentKey = getKeybinding(def.id, settings.keybindings);
    const isRecording = recordingAction === def.id;
    const isCustom = currentKey !== def.defaultKey;
    const keyParts = currentKey ? currentKey.split('+') : [];
    const locName = t(`keybindings.${def.id}.name`);
    const locDesc = t(`keybindings.${def.id}.description`);

    return (
      <div key={def.id} className={`keybinding-row ${isRecording ? 'recording' : ''}`}>
        <div className="keybinding-info">
          <div className="keybinding-name">{locName}</div>
          <div className="keybinding-desc">{locDesc}</div>
        </div>

        <div className="keybinding-action-group">
          {isRecording ? (
            <button
              type="button"
              className="keybinding-badge recording-pulse"
              onClick={() => setRecordingAction(null)}
              title={t('settings.kbCancelRecordTitle')}
            >
              <span>{t('settings.kbPressNew')}</span>
            </button>
          ) : (
            <button
              type="button"
              className="keybinding-badge"
              onClick={() => setRecordingAction(def.id)}
              title={t('settings.kbChangeTitle')}
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
              title={t('settings.kbResetSingleTitle', { key: def.defaultKey })}
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
          if (e.target === e.currentTarget && !showRestartPrompt) onClose();
        }}
      >
        <div className="settings-panel" style={{ maxWidth: '640px', width: '92%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 className="settings-title" style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{t('settings.title')}</span>
            </h2>
            <button className="btn btn-icon" onClick={onClose} title={t('common.close')}>
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
              <span>{t('settings.tabImage')}</span>
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
              <span>{t('settings.tabKeybindings')}</span>
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
              <span>{t('settings.tabGeneral')}</span>
            </button>
          </div>

          {/* TAB 1: IMAGE HANDLING */}
          {activeTab === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {/* Option 1: Image Directory */}
              <div className="settings-group">
                <label className="settings-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{t('settings.imageDirLabel')}</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    className="settings-input"
                    value={settings.imageDir}
                    placeholder={t('settings.imageDirPlaceholder')}
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => setPickerTarget('imageDir')}
                    onChange={(e) => onUpdateSettings({ imageDir: e.target.value })}
                    title={t('settings.imageDirInputTitle')}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setPickerTarget('imageDir')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    <FolderIcon size={14} />
                    <span>{t('common.browseFolder')}</span>
                  </button>
                </div>
                <span className="settings-hint">
                  {t('settings.imageDirHint')}
                </span>
                <details className="settings-hint-details">
                  <summary className="settings-hint-summary">
                    <span>{t('settings.imageDirDetailsTitle')}</span>
                  </summary>
                  <div className="settings-hint-card">
                    <p style={{ margin: '0 0 6px 0' }}>
                      • {t('settings.imageDirDetail1')}
                    </p>
                    <p style={{ margin: '0 0 6px 0' }}>
                      • {t('settings.imageDirDetail2')}
                    </p>
                    <p className="settings-hint-note" style={{ margin: 0 }}>
                      {t('settings.imageDirSessionNote')}
                    </p>
                  </div>
                </details>
              </div>

              {/* Option 2: Naming Base Directory */}
              <div className="settings-group">
                <label className="settings-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{t('settings.namingBaseLabel')}</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    className="settings-input"
                    value={settings.imageNamingBaseDir || ''}
                    placeholder={t('settings.namingBasePlaceholder')}
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => setPickerTarget('namingBaseDir')}
                    onChange={(e) => onUpdateSettings({ imageNamingBaseDir: e.target.value })}
                    title={t('settings.namingBaseInputTitle')}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setPickerTarget('namingBaseDir')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    <FolderIcon size={14} />
                    <span>{t('common.browseFolder')}</span>
                  </button>
                </div>
                <span className="settings-hint">
                  {t('settings.namingBaseHint')}
                </span>
                <details className="settings-hint-details">
                  <summary className="settings-hint-summary">
                    <span>{t('settings.imageDirDetailsTitle')}</span>
                  </summary>
                  <div className="settings-hint-card">
                    <p style={{ margin: '0 0 6px 0' }}>
                      • {t('settings.namingBaseDetail1')}
                    </p>
                    <p style={{ margin: '0 0 6px 0' }}>
                      • {t('settings.namingBaseDetail2')}
                    </p>
                    <p style={{ margin: '0 0 6px 0' }}>
                      • {t('settings.namingBaseDetail3')}
                    </p>
                    <p className="settings-hint-note" style={{ margin: 0 }}>
                      {t('settings.imageDirSessionNote')}
                    </p>
                  </div>
                </details>
              </div>

              {/* Option 3: Image Reference Syntax (Relative vs Absolute) */}
              <div className="settings-group">
                <label className="settings-label" style={{ fontWeight: 600 }}>
                  {t('settings.refSyntaxLabel')}
                </label>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="imageReferenceType"
                      value="relative"
                      checked={settings.imageReferenceType !== 'absolute'}
                      onChange={() => onUpdateSettings({ imageReferenceType: 'relative' })}
                    />
                    <span><strong>{t('settings.refSyntaxRelative')}</strong></span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="imageReferenceType"
                      value="absolute"
                      checked={settings.imageReferenceType === 'absolute'}
                      onChange={() => onUpdateSettings({ imageReferenceType: 'absolute' })}
                    />
                    <span><strong>{t('settings.refSyntaxAbsolute')}</strong></span>
                  </label>
                </div>
                <span className="settings-hint">
                  {settings.imageReferenceType === 'absolute'
                    ? t('settings.refSyntaxAbsoluteHint')
                    : t('settings.refSyntaxRelativeHint')}
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
                    placeholder={t('settings.kbSearchPlaceholder')}
                    value={kbSearch}
                    onChange={(e) => setKbSearch(e.target.value)}
                  />
                  {kbSearch && (
                    <button
                      className="btn btn-icon"
                      style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', padding: '2px' }}
                      onClick={() => setKbSearch('')}
                      title={t('common.clearSearch')}
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
                  title={t('settings.kbResetAllTitle')}
                >
                  <RotateCcwIcon size={12} />
                  <span>{t('settings.kbResetAll')}</span>
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
                      <span>{t('settings.formattingGroup')}</span>
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
                      <span>{t('settings.applicationGroup')}</span>
                      <span className="keybinding-count">({filteredApplication.length})</span>
                    </div>
                    <div className="keybinding-list">
                      {filteredApplication.map(renderKeybindingRow)}
                    </div>
                  </div>
                )}

                {filteredFormatting.length === 0 && filteredApplication.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                    {t('settings.kbNoMatch', { query: kbSearch })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: GENERAL SETTINGS */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {/* Language Switcher */}
              <div className="settings-group">
                <label className="settings-label">{t('settings.language')}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn ${settings.language !== 'en' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleSelectLanguage('vi')}
                  >
                    {t('settings.langVi')}
                  </button>
                  <button
                    type="button"
                    className={`btn ${settings.language === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleSelectLanguage('en')}
                  >
                    {t('settings.langEn')}
                  </button>
                </div>
                <span className="settings-hint">{t('settings.languageRestartHint')}</span>
              </div>

              <div className="settings-group">
                <label className="settings-label">{t('settings.theme')}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn ${settings.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => onUpdateSettings({ theme: 'dark' })}
                  >
                    {t('settings.themeDark')}
                  </button>
                  <button
                    type="button"
                    className={`btn ${settings.theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => onUpdateSettings({ theme: 'light' })}
                  >
                    {t('settings.themeLight')}
                  </button>
                </div>
              </div>

              <div className="settings-group">
                <label className="settings-label">{t('settings.fontSize', { size: settings.fontSize })}</label>
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
                  <span>{t('settings.lineNumbers')}</span>
                </label>
              </div>

              <div className="settings-group">
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={settings.wordWrap}
                    onChange={(e) => onUpdateSettings({ wordWrap: e.target.checked })}
                  />
                  <span>{t('settings.wordWrap')}</span>
                </label>
              </div>

              <div className="settings-group">
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={settings.autoSave}
                    onChange={(e) => onUpdateSettings({ autoSave: e.target.checked })}
                  />
                  <span>{t('settings.autoSave')}</span>
                </label>
                {settings.autoSave && (
                  <div style={{ marginTop: '8px', paddingLeft: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('settings.autoSaveDelay')}</span>
                    <select
                      className="settings-input"
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                      value={settings.autoSaveDelay ?? 2}
                      onChange={(e) => onUpdateSettings({ autoSaveDelay: Number(e.target.value) })}
                    >
                      <option value={1}>{t('settings.seconds', { count: 1 })}</option>
                      <option value={2}>{t('settings.secondsDefault', { count: 2 })}</option>
                      <option value={3}>{t('settings.seconds', { count: 3 })}</option>
                      <option value={5}>{t('settings.seconds', { count: 5 })}</option>
                      <option value={10}>{t('settings.seconds', { count: 10 })}</option>
                      <option value={30}>{t('settings.seconds', { count: 30 })}</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border-primary)', paddingTop: '12px' }}>
            <button className="btn btn-primary" onClick={onClose}>
              {t('settings.done')}
            </button>
          </div>
        </div>
      </div>

      {/* Prompt asking user to restart/reload interface after switching language */}
      {showRestartPrompt && (
        <div
          className="prompt-modal-overlay"
          style={{ zIndex: 10050 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRestartPrompt(false);
          }}
        >
          <div className="prompt-modal-dialog" style={{ maxWidth: '460px' }}>
            <div className="prompt-modal-header" style={{ borderBottom: '1px solid var(--border-primary)' }}>
              <div className="prompt-modal-title-group">
                <div
                  className="prompt-modal-icon-badge"
                  style={{
                    background: 'rgba(99, 102, 241, 0.14)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                  }}
                >
                  <RotateCcwIcon size={18} />
                </div>
                <div>
                  <h3 className="prompt-modal-title">{t('settings.restartPromptTitle')}</h3>
                </div>
              </div>
              <button
                className="btn btn-icon prompt-close-btn"
                onClick={() => setShowRestartPrompt(false)}
                title={t('common.close')}
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="prompt-modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.55 }}>
                {t('settings.restartPromptDesc')}
              </div>

              {hasUnsavedTabs && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#d97706',
                    background: 'rgba(245, 158, 11, 0.09)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    lineHeight: 1.5,
                  }}
                >
                  {t('settings.restartPromptUnsavedNote')}
                </div>
              )}
            </div>

            <div
              className="prompt-modal-footer"
              style={{
                padding: '12px 20px',
                background: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border-primary)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary prompt-btn"
                onClick={() => setShowRestartPrompt(false)}
              >
                {t('settings.restartLaterBtn')}
              </button>

              {hasUnsavedTabs && onSaveAll && (
                <button
                  type="button"
                  className="btn btn-primary prompt-btn"
                  onClick={() => handleRestartNow(true)}
                >
                  {t('settings.saveAndRestartBtn')}
                </button>
              )}

              <button
                type="button"
                className={`btn ${hasUnsavedTabs ? 'btn-secondary' : 'btn-primary'} prompt-btn`}
                onClick={() => handleRestartNow(false)}
              >
                {t('settings.restartNowBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tree Folder Picker for Image Directory */}
      <ImageFolderPickerModal
        isOpen={pickerTarget === 'imageDir'}
        currentImageDir={settings.imageDir}
        fileTree={fileTree}
        workspaceName={workspaceName}
        title={t('settings.pickerImageDirTitle')}
        subtitle={t('settings.pickerImageDirSubtitle')}
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
        title={t('settings.pickerNamingBaseTitle')}
        subtitle={t('settings.pickerNamingBaseSubtitle')}
        defaultSearchQuery=""
        allowRootSelect={true}
        onClose={() => setPickerTarget(null)}
        onSelectFolder={(folder) => onUpdateSettings({ imageNamingBaseDir: folder })}
        onCreateFolder={onCreateFolder}
      />
    </>
  );
};
