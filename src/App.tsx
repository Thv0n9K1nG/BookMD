import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';
import './styles/index.css';
import {
  WorkspaceInfo,
  FileEntry,
  OpenTab,
  ViewMode,
  SidebarTab,
  Settings,
  ContextMenuState,
  ToastMessage,
} from './types';
import {
  openWorkspace,
  getWorkspaceTree,
  readDirectory,
  readFile,
  writeFile,
  createFile,
  renameFile,
  deleteFile,
  renameImagesForDocument,
  selectWorkspaceFolder,
  selectSingleFile,
  getCliLaunchPath,
  resolvePathTarget,
  isTauri,
} from './services/ipc';
import { clearImageWidthCache, normalizePathSegments } from './utils/imagePath';
import {
  isSameWorkspace,
  isPathInsideWorkspace,
  findTabForWorkspace,
} from './utils/tabUtils';
import { renameFileSessionState } from './utils/editorSession';
import { Header } from './components/Header/Header';
import { FileTree } from './components/Sidebar/FileTree';
import { TabBar } from './components/Tabs/TabBar';
import { Editor } from './components/Editor/Editor';
import { Preview } from './components/Preview/Preview';
import { SearchModal } from './components/Search/SearchModal';
import { CommandPalette, CommandItem } from './components/CommandPalette/CommandPalette';
import { ContextMenu } from './components/ContextMenu/ContextMenu';
import { SettingsModal } from './components/Settings/SettingsModal';
import { StatusBar } from './components/StatusBar/StatusBar';
import { ToastContainer } from './components/Toast/ToastContainer';
import { PromptModal } from './components/common/PromptModal';
import { ConfirmDeleteModal } from './components/common/ConfirmDeleteModal';
import { BackupModal } from './components/Backup/BackupModal';
import { ConsolidateImagesModal } from './components/ImageConsolidate/ConsolidateImagesModal';
import { CloseIcon, FolderOpenIcon } from './components/common/Icons';
import { generatePrintHtml, printHtmlViaIframe } from './utils/exportPdf';
import {
  getKeybinding,
  matchKeybinding,
  DEFAULT_KEYBINDINGS_MAP,
} from './utils/keybindings';
import {
  mergeTreePreservingChildren,
  attachChildrenToPath,
  loadPersistedExpandedFolders,
  savePersistedExpandedFolders,
} from './utils/treeState';
import { LanguageProvider, translate, Language } from './i18n';

export const App: React.FC = () => {
  // Settings
  const [settings, setSettings] = useState<Settings>(() => {
    const defaultSettings: Settings = {
      language: 'vi',
      imageDir: 'images',
      imageNamingBaseDir: '',
      imageReferenceType: 'relative',
      theme: 'dark',
      fontSize: 14,
      autoSave: false,
      autoSaveDelay: 2,
      lineNumbers: true,
      wordWrap: true,
      keybindings: DEFAULT_KEYBINDINGS_MAP,
    };
    const saved = localStorage.getItem('bookmd_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaultSettings,
          ...parsed,
          // Reset session-scoped image handling settings per session
          imageDir: 'images',
          imageNamingBaseDir: '',
          keybindings: {
            ...DEFAULT_KEYBINDINGS_MAP,
            ...(parsed.keybindings || {}),
          },
        };
      } catch (e) {
        // ignore
      }
    }
    return defaultSettings;
  });

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Translation helper
  const currentLang: Language = settings.language || 'vi';
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(currentLang, key, params);
    },
    [currentLang]
  );

  // Workspace & Files
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [fileTree, setFileTree] = useState<FileEntry[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('files');

  // Keep live refs for background events (watcher, auto-saves)
  const fileTreeRef = useRef<FileEntry[]>([]);
  useEffect(() => {
    fileTreeRef.current = fileTree;
  }, [fileTree]);

  const expandedFoldersRef = useRef<Set<string>>(expandedFolders);
  useEffect(() => {
    expandedFoldersRef.current = expandedFolders;
  }, [expandedFolders]);

  // Tabs & Editor
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [targetLine, setTargetLine] = useState<number | undefined>(undefined);
  const [targetLineKey, setTargetLineKey] = useState<number>(0);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [pendingWorkspaceSwitch, setPendingWorkspaceSwitch] = useState<{
    targetPath: string;
    fileNames: string[];
  } | null>(null);

  const workspaceRef = useRef<WorkspaceInfo | null>(workspace);
  workspaceRef.current = workspace;

  const tabsRef = useRef<OpenTab[]>(tabs);
  tabsRef.current = tabs;

  const activePathRef = useRef<string | null>(activePath);
  activePathRef.current = activePath;

  // Modals & Panels
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isConsolidateImagesOpen, setIsConsolidateImagesOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'image' | 'keybindings'>('general');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    targetPath: string;
    name: string;
    isFolder: boolean;
  } | null>(null);
  const [promptDialog, setPromptDialog] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    icon?: 'file' | 'directory' | 'rename';
    defaultValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    onSubmit: (val: string) => void;
  } | null>(null);

  // Apply theme to DOM and persist settings (excluding session-scoped image handling settings)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    const { imageDir: _imgDir, imageNamingBaseDir: _namingDir, ...persistentSettings } = settings;
    localStorage.setItem('bookmd_settings', JSON.stringify(persistentSettings));
  }, [settings]);

  // Toast helper
  const addToast = useCallback((text: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // Ref to handleOpenFile to avoid circular dependency in handleOpenWorkspace
  const handleOpenFileRef = useRef<((entry: FileEntry, line?: number) => Promise<void>) | null>(null);

  // Reset all tab & editor state when moving to a different workspace
  const resetWorkspaceTabs = useCallback(() => {
    tabsRef.current = [];
    activePathRef.current = null;
    setTabs([]);
    setActivePath(null);
    setTargetLine(undefined);
    setCursorPos({ line: 1, col: 1 });
    clearImageWidthCache();
  }, []);

  // Save all currently dirty tabs within the active workspace
  const handleSaveAllDirtyTabs = useCallback(async () => {
    const dirty = tabsRef.current.filter((tab) => tab.isDirty);
    if (dirty.length === 0) return;

    for (const tab of dirty) {
      await writeFile(tab.relativePath, tab.content);
    }

    setTabs((prev) => {
      const next = prev.map((tab) =>
        tab.isDirty ? { ...tab, savedContent: tab.content, isDirty: false } : tab
      );
      tabsRef.current = next;
      return next;
    });
  }, []);

  // Core workspace loader (after dirty-tab handling)
  const proceedOpenWorkspace = useCallback(async (selectedPath: string, isInitialAutoOpen = false) => {
    try {
      const switchingToDifferentWs = !isSameWorkspace(workspaceRef.current?.path, selectedPath);
      if (switchingToDifferentWs) {
        resetWorkspaceTabs();
      }

      const wsInfo = await openWorkspace(selectedPath);
      workspaceRef.current = wsInfo;
      setWorkspace(wsInfo);
      localStorage.setItem('bookmd_last_workspace', wsInfo.path || selectedPath);

      // Reset session-scoped image handling settings on workspace change
      setSettings((prev) => ({
        ...prev,
        imageDir: 'images',
        imageNamingBaseDir: '',
      }));

      // Restore persisted expanded folders for this workspace
      const persistedExpanded = loadPersistedExpandedFolders(wsInfo.path || selectedPath);
      setExpandedFolders(persistedExpanded);

      let tree = await getWorkspaceTree();
      for (const folderPath of persistedExpanded) {
        try {
          const children = await readDirectory(folderPath);
          tree = attachChildrenToPath(tree, folderPath, children);
        } catch {}
      }
      setFileTree(tree);

      if (!isInitialAutoOpen) {
        addToast(t('toasts.workspaceOpened', { name: wsInfo.name }), 'success');
      }

      // Auto open README.md if present (only if switching workspaces or no tab active)
      const findReadme = (entries: FileEntry[]): FileEntry | undefined => {
        for (const e of entries) {
          if (e.name.toLowerCase() === 'readme.md') return e;
          if (e.children) {
            const found = findReadme(e.children);
            if (found) return found;
          }
        }
        return undefined;
      };
      const readme = findReadme(tree);
      if (readme && (switchingToDifferentWs || !activePathRef.current)) {
        await handleOpenFileRef.current?.(readme);
      }
    } catch (err: any) {
      console.error('Open workspace error:', err);
      if (isInitialAutoOpen) {
        // Silently clear previous workspace from localStorage if missing or moved
        localStorage.removeItem('bookmd_last_workspace');
      } else {
        addToast(t('toasts.workspaceError', { error: err?.message || err }), 'error');
      }
    }
  }, [addToast, resetWorkspaceTabs, t]);

  // Open Workspace Action
  const handleOpenWorkspace = useCallback(async (path?: string, isInitialAutoOpen = false) => {
    try {
      const selectedPath = path || (await selectWorkspaceFolder());
      if (!selectedPath) return;

      const switchingToDifferentWs =
        Boolean(workspaceRef.current) && !isSameWorkspace(workspaceRef.current?.path, selectedPath);

      if (switchingToDifferentWs && !isInitialAutoOpen) {
        const dirtyTabs = tabsRef.current.filter((tab) => tab.isDirty);
        if (dirtyTabs.length > 0) {
          if (settingsRef.current.autoSave) {
            await handleSaveAllDirtyTabs();
          } else {
            setPendingWorkspaceSwitch({
              targetPath: selectedPath,
              fileNames: dirtyTabs.map((tab) => tab.name),
            });
            return;
          }
        }
      }

      await proceedOpenWorkspace(selectedPath, isInitialAutoOpen);
    } catch (err: any) {
      console.error('Open workspace error:', err);
      addToast(t('toasts.workspaceError', { error: err?.message || err }), 'error');
    }
  }, [proceedOpenWorkspace, handleSaveAllDirtyTabs, addToast, t]);

  // Load directory children on demand for lazy expansion
  const handleLoadFolderChildren = useCallback(async (folderPath: string) => {
    try {
      const children = await readDirectory(folderPath);
      setFileTree((prev) => attachChildrenToPath(prev, folderPath, children));
    } catch (err) {
      console.error('Failed to read directory children:', folderPath, err);
    }
  }, []);

  // Reload File Tree with currently expanded folders re-hydrated
  const handleRefreshTree = useCallback(async () => {
    if (!workspace) return;
    try {
      const rawTree = await getWorkspaceTree();
      let tree = mergeTreePreservingChildren(rawTree, fileTreeRef.current);
      for (const folderPath of expandedFoldersRef.current) {
        try {
          const children = await readDirectory(folderPath);
          tree = attachChildrenToPath(tree, folderPath, children);
        } catch {
          // Ignore missing folders
        }
      }
      setFileTree(tree);
      addToast(t('toasts.fileTreeRefreshed'), 'info');
    } catch (err: any) {
      console.error('Refresh tree error:', err);
    }
  }, [workspace, addToast, t]);

  // Toggle folder expansion in tree with lazy loading on demand
  const handleToggleFolder = useCallback(async (folderPath: string) => {
    const isExpanding = !expandedFoldersRef.current.has(folderPath);

    if (isExpanding) {
      const findNode = (nodes: FileEntry[]): FileEntry | undefined => {
        for (const node of nodes) {
          if (node.relativePath === folderPath) return node;
          if (node.children) {
            const found = findNode(node.children);
            if (found) return found;
          }
        }
        return undefined;
      };

      const targetNode = findNode(fileTreeRef.current);
      if (!targetNode || !targetNode.children) {
        await handleLoadFolderChildren(folderPath);
      }
    }

    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      if (workspace?.path) {
        savePersistedExpandedFolders(workspace.path, next);
      }
      return next;
    });
  }, [workspace, handleLoadFolderChildren]);

  // Handle image pasted in editor: refresh file tree and expand image directory
  const handleImagePasted = useCallback(async (imageRelPath: string) => {
    try {
      const norm = imageRelPath.replace(/\\/g, '/');
      const lastSlash = norm.lastIndexOf('/');
      const toExpand: string[] = [];
      if (lastSlash > 0) {
        const folder = norm.substring(0, lastSlash);
        const parts = folder.split('/');
        let cur = '';
        for (const p of parts) {
          cur = cur ? `${cur}/${p}` : p;
          toExpand.push(cur);
        }
        setExpandedFolders((prev) => {
          const next = new Set(prev);
          toExpand.forEach((f) => next.add(f));
          if (workspace?.path) {
            savePersistedExpandedFolders(workspace.path, next);
          }
          return next;
        });
      }

      const rawTree = await getWorkspaceTree();
      let tree = mergeTreePreservingChildren(rawTree, fileTreeRef.current);
      const allToExpand = new Set([...Array.from(expandedFoldersRef.current), ...toExpand]);
      for (const folder of allToExpand) {
        try {
          const children = await readDirectory(folder);
          tree = attachChildrenToPath(tree, folder, children);
        } catch {}
      }
      setFileTree(tree);
    } catch (err) {
      console.error('Failed to update tree after image paste:', err);
    }
  }, [workspace]);

  // Listen to background filesystem change events (watcher)
  useEffect(() => {
    if (!isTauri) return;

    let timer: any = null;
    const unlistenPromise = listen('fs-change', () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const rawTree = await getWorkspaceTree();
          let tree = mergeTreePreservingChildren(rawTree, fileTreeRef.current);
          for (const folderPath of expandedFoldersRef.current) {
            try {
              const children = await readDirectory(folderPath);
              tree = attachChildrenToPath(tree, folderPath, children);
            } catch {}
          }
          setFileTree(tree);
        } catch (err) {
          console.error('Error refreshing tree from fs-change:', err);
        }
      }, 300);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Open File into Tabs
  const handleOpenFile = useCallback(async (entry: FileEntry, line?: number) => {
    if (entry.kind !== 'file') return;

    const currentWsPath = workspaceRef.current?.path;
    const existing = findTabForWorkspace(tabsRef.current, entry.relativePath, currentWsPath);
    if (existing) {
      activePathRef.current = entry.relativePath;
      setActivePath(entry.relativePath);
      if (line && line > 0) {
        setTargetLine(line);
        setTargetLineKey((k) => k + 1);
      } else {
        setTargetLine(undefined);
      }
      return;
    }

    try {
      const content = await readFile(entry.relativePath);
      const newTab: OpenTab = {
        relativePath: entry.relativePath,
        workspacePath: currentWsPath,
        name: entry.name,
        content,
        savedContent: content,
        isDirty: false,
        cursorLine: line,
      };
      setTabs((prev) => {
        if (findTabForWorkspace(prev, entry.relativePath, currentWsPath)) {
          return prev;
        }
        const next = [...prev, newTab];
        tabsRef.current = next;
        return next;
      });
      activePathRef.current = entry.relativePath;
      setActivePath(entry.relativePath);
      if (line && line > 0) {
        setTargetLine(line);
        setTargetLineKey((k) => k + 1);
      } else {
        setTargetLine(undefined);
      }
    } catch (err: any) {
      console.error('Read file error:', err);
      addToast(t('toasts.fileReadError', { error: err?.message || err }), 'error');
    }
  }, [addToast, t]);
  handleOpenFileRef.current = handleOpenFile;

  // Open any path (file or workspace folder)
  const handleOpenPath = useCallback(
    async (rawPath: string) => {
      if (!rawPath || rawPath.trim().length === 0) return;
      const cleanPath = rawPath.trim();

      try {
        const target = await resolvePathTarget(cleanPath);
        const currentWsPath = workspaceRef.current?.path;

        if (target.isFile) {
          // Check if file is actually inside the current open workspace (with slash boundary)
          if (
            currentWsPath &&
            (isPathInsideWorkspace(cleanPath, currentWsPath) ||
              isPathInsideWorkspace(target.workspacePath, currentWsPath))
          ) {
            const wsPathClean = currentWsPath.replace(/\\/g, '/').replace(/\/+$/, '');
            const cleanTargetFile = cleanPath.replace(/\\/g, '/');
            let rel = cleanTargetFile;
            if (cleanTargetFile.toLowerCase().startsWith(wsPathClean.toLowerCase() + '/')) {
              rel = cleanTargetFile.slice(wsPathClean.length + 1);
            } else if (target.relativeFilePath) {
              rel = target.relativeFilePath;
            }
            await handleOpenFile({
              name: target.fileName || rel.split('/').pop() || 'Document.md',
              relativePath: rel,
              kind: 'file',
            });
            addToast(t('toasts.fileOpened', { name: target.fileName || rel }), 'success');
            return;
          }

          // Otherwise, file is outside current workspace: flush/reset tabs cleanly before switching workspace
          if (currentWsPath && !isSameWorkspace(currentWsPath, target.workspacePath)) {
            if (settingsRef.current.autoSave) {
              await handleSaveAllDirtyTabs();
            }
            resetWorkspaceTabs();
          }

          const wsInfo = await openWorkspace(target.workspacePath);
          workspaceRef.current = wsInfo;
          setWorkspace(wsInfo);
          localStorage.setItem('bookmd_last_workspace', wsInfo.path || target.workspacePath);
          const tree = await getWorkspaceTree();
          setFileTree(tree);

          const fileName = target.fileName || target.relativeFilePath || 'Document.md';
          const relPath = target.relativeFilePath || fileName;
          await handleOpenFile({
            name: fileName,
            relativePath: relPath,
            kind: 'file',
          });
          addToast(t('toasts.fileOpened', { name: fileName }), 'success');
        } else {
          // It's a directory: open as workspace
          await handleOpenWorkspace(target.workspacePath);
        }
      } catch (err: any) {
        console.error('Failed to open path:', err);
        addToast(t('toasts.openError', { error: err?.message || err }), 'error');
      }
    },
    [handleOpenWorkspace, handleOpenFile, handleSaveAllDirtyTabs, resetWorkspaceTabs, addToast, t]
  );

  // Open single file dialog action
  const handleSelectAndOpenFile = useCallback(async () => {
    const filePath = await selectSingleFile();
    if (filePath) {
      await handleOpenPath(filePath);
    }
  }, [handleOpenPath]);

  // Navigate to relative file (e.g. from markdown link in Preview)
  const handleNavigateToFile = useCallback(
    (href: string) => {
      const cleanHref = href.split('#')[0].split('?')[0];
      if (!cleanHref) return;
      const currentDir =
        activePath && activePath.includes('/')
          ? activePath.substring(0, activePath.lastIndexOf('/'))
          : '';
      const combined = currentDir ? `${currentDir}/${cleanHref}` : cleanHref;
      const targetRelPath = normalizePathSegments(combined);
      const fileName = targetRelPath.split('/').pop() || targetRelPath;
      handleOpenFile({
        name: fileName,
        relativePath: targetRelPath,
        kind: 'file',
      });
    },
    [activePath, handleOpenFile]
  );

  // Select Tab
  const handleSelectTab = useCallback(
    (path: string) => {
      if (settings.autoSave && activePath && activePath !== path) {
        const prevTab = tabs.find((t) => t.relativePath === activePath);
        if (prevTab && prevTab.isDirty) {
          writeFile(prevTab.relativePath, prevTab.content)
            .then(() => {
              setTabs((prev) =>
                prev.map((t) =>
                  t.relativePath === prevTab.relativePath
                    ? { ...t, savedContent: t.content, isDirty: false }
                    : t
                )
              );
            })
            .catch((err) => console.error('Failed to auto-save tab on switch:', err));
        }
      }
      setTargetLine(undefined);
      activePathRef.current = path;
      setActivePath(path);
    },
    [settings.autoSave, activePath, tabs]
  );

  // Close Tab
  const handleCloseTab = useCallback(
    (path: string) => {
      const tabToClose = tabs.find((t) => t.relativePath === path);
      if (tabToClose && tabToClose.isDirty && settings.autoSave) {
        writeFile(tabToClose.relativePath, tabToClose.content).catch((err) =>
          console.error('Failed to auto-save closing tab:', err)
        );
      }
      setTabs((prev) => {
        const nextTabs = prev.filter((t) => t.relativePath !== path);
        tabsRef.current = nextTabs;
        if (activePath === path) {
          const nextActive = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].relativePath : null;
          activePathRef.current = nextActive;
          setActivePath(nextActive);
        }
        return nextTabs;
      });
    },
    [activePath, tabs, settings.autoSave]
  );

  // Content Change in Active File
  const handleContentChange = useCallback((newContent: string) => {
    if (!activePath) return;

    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.relativePath === activePath) {
          return {
            ...tab,
            content: newContent,
            isDirty: newContent !== tab.savedContent,
          };
        }
        return tab;
      })
    );
  }, [activePath]);

  const isSavingRef = useRef(false);

  // Save Active File
  const handleSaveActiveFile = useCallback(
    async (isSilent = false) => {
      if (isSavingRef.current) return;
      const currentTab = tabs.find((t) => t.relativePath === activePath);
      if (!currentTab || !currentTab.isDirty) return;

      isSavingRef.current = true;
      try {
        await writeFile(currentTab.relativePath, currentTab.content);
        setTabs((prev) =>
          prev.map((tab) =>
            tab.relativePath === activePath
              ? { ...tab, savedContent: tab.content, isDirty: false }
              : tab
          )
        );
        if (!isSilent) {
          addToast(t('toasts.fileSaved', { name: currentTab.name }), 'success');
        }
      } catch (err: any) {
        console.error('Save file error:', err);
        addToast(t('toasts.fileSaveError', { error: err?.message || err }), 'error');
      } finally {
        isSavingRef.current = false;
      }
    },
    [tabs, activePath, addToast, t]
  );

  // Auto-Save Effect (debounced by settings.autoSaveDelay)
  useEffect(() => {
    if (!settings.autoSave || !activePath) return;

    const currentTab = tabs.find((t) => t.relativePath === activePath);
    if (!currentTab || !currentTab.isDirty) return;

    const delayMs = Math.max(1, settings.autoSaveDelay ?? 2) * 1000;
    const timer = setTimeout(() => {
      handleSaveActiveFile(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [settings.autoSave, settings.autoSaveDelay, activePath, tabs, handleSaveActiveFile]);

  // Create New File or Directory
  const handleCreateNew = useCallback(
    (parentFolder: string, kind: 'file' | 'directory') => {
      const isFile = kind === 'file';
      const title = isFile ? t('prompt.createFileTitle') : t('prompt.createFolderTitle');
      const defaultName = isFile ? 'new_note.md' : 'NewFolder';
      const subtitle = parentFolder ? t('prompt.location', { path: parentFolder }) : t('prompt.locationRoot');

      setPromptDialog({
        isOpen: true,
        title,
        subtitle,
        icon: isFile ? 'file' : 'directory',
        defaultValue: defaultName,
        placeholder: isFile ? t('prompt.placeholderFile') : t('prompt.placeholderFolder'),
        confirmLabel: isFile ? t('prompt.createFileBtn') : t('prompt.createFolderBtn'),
        onSubmit: async (name: string) => {
          setPromptDialog(null);
          if (!name || !name.trim()) return;

          const finalName = isFile && !name.includes('.') ? `${name.trim()}.md` : name.trim();
          const relativePath = parentFolder ? `${parentFolder}/${finalName}` : finalName;

          try {
            const created = await createFile(relativePath, kind);
            await handleRefreshTree();

            // Auto-expand parent folder if created inside one
            if (parentFolder) {
              const parts = parentFolder.replace(/\\/g, '/').split('/');
              const toExpand: string[] = [];
              let cur = '';
              for (const p of parts) {
                cur = cur ? `${cur}/${p}` : p;
                toExpand.push(cur);
              }
              setExpandedFolders((prev) => {
                const next = new Set(prev);
                toExpand.forEach((f) => next.add(f));
                return next;
              });
            }

            addToast(t('toasts.created', { name: created.name }), 'success');
            if (kind === 'file') {
              handleOpenFile(created);
            }
          } catch (err: any) {
            console.error('Create entry error:', err);
            addToast(t('toasts.createError', { error: err?.message || err }), 'error');
          }
        },
      });
    },
    [handleRefreshTree, handleOpenFile, addToast, t]
  );

  // Rename File / Folder
  const handleRename = useCallback(
    (sourcePath: string, currentName: string) => {
      setPromptDialog({
        isOpen: true,
        title: t('prompt.renameTitle'),
        subtitle: `${sourcePath}`,
        icon: 'rename',
        defaultValue: currentName,
        confirmLabel: t('prompt.renameBtn'),
        onSubmit: async (newName: string) => {
          setPromptDialog(null);
          if (!newName || !newName.trim() || newName.trim() === currentName) return;

          const parts = sourcePath.split(/[\/\\]/);
          parts.pop();
          const destinationPath = parts.length > 0 ? `${parts.join('/')}/${newName.trim()}` : newName.trim();

          try {
            await renameFile(sourcePath, destinationPath);

            // Rename associated images if markdown file
            if (sourcePath.endsWith('.md')) {
              try {
                await renameImagesForDocument(
                  sourcePath,
                  destinationPath,
                  settings.imageDir,
                  settings.imageNamingBaseDir
                );
              } catch (e) {
                console.warn('Image rename note:', e);
              }
            }

            // Preserve remembered session cursor/scroll state across file rename
            renameFileSessionState(sourcePath, destinationPath, workspaceRef.current?.path);

            // Update tabs if opened
            setTabs((prev) =>
              prev.map((tab) => {
                if (tab.relativePath === sourcePath) {
                  return {
                    ...tab,
                    relativePath: destinationPath,
                    name: newName.trim(),
                  };
                }
                return tab;
              })
            );
            if (activePath === sourcePath) {
              activePathRef.current = destinationPath;
              setActivePath(destinationPath);
            }

            await handleRefreshTree();
            addToast(t('toasts.renamed', { name: newName.trim() }), 'success');
          } catch (err: any) {
            console.error('Rename error:', err);
            addToast(t('toasts.renameError', { error: err?.message || err }), 'error');
          }
        },
      });
    },
    [settings.imageDir, settings.imageNamingBaseDir, activePath, handleRefreshTree, addToast, t]
  );

  // Request Delete File / Folder (Opens Confirmation Modal)
  const handleRequestDelete = useCallback((targetPath: string, name: string, isFolder = false) => {
    setDeleteModalState({
      isOpen: true,
      targetPath,
      name,
      isFolder,
    });
  }, []);

  // Execute Confirmed Delete
  const handleExecuteDelete = useCallback(async () => {
    if (!deleteModalState) return;
    const { targetPath, name } = deleteModalState;
    setDeleteModalState(null);

    try {
      await deleteFile(targetPath);
      handleCloseTab(targetPath);
      await handleRefreshTree();
      addToast(t('toasts.deleted', { name }), 'success');
    } catch (err: any) {
      console.error('Delete error:', err);
      addToast(t('toasts.deleteError', { error: err?.message || err }), 'error');
    }
  }, [deleteModalState, handleCloseTab, handleRefreshTree, addToast, t]);

  // Export Current Markdown Document to PDF
  const isExportingPdfRef = useRef(false);
  const handleExportPdf = useCallback(async () => {
    if (isExportingPdfRef.current) return;
    const currentTab = tabs.find((t) => t.relativePath === activePath);
    if (!currentTab) {
      addToast(t('toasts.pdfNeedMarkdown'), 'info');
      return;
    }

    isExportingPdfRef.current = true;
    try {
      addToast(t('toasts.pdfPreparing'), 'info');
      const fullHtml = await generatePrintHtml(
        currentTab.name,
        currentTab.content,
        currentTab.relativePath,
        workspace?.path
      );

      const success = await printHtmlViaIframe(fullHtml);
      if (success) {
        addToast(t('toasts.pdfPrintReady'), 'success');
      } else {
        addToast(t('toasts.pdfFailed'), 'error');
      }
    } catch (err: any) {
      console.error('Export PDF error:', err);
      addToast(t('toasts.pdfError', { error: err?.message || 'Error' }), 'error');
    } finally {
      setTimeout(() => {
        isExportingPdfRef.current = false;
      }, 500);
    }
  }, [tabs, activePath, workspace?.path, addToast, t]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const kb = settingsRef.current.keybindings;

      if (matchKeybinding(e, getKeybinding('saveFile', kb))) {
        e.preventDefault();
        handleSaveActiveFile();
      } else if (matchKeybinding(e, getKeybinding('openFile', kb))) {
        e.preventDefault();
        handleSelectAndOpenFile();
      } else if (matchKeybinding(e, getKeybinding('openWorkspace', kb))) {
        e.preventDefault();
        handleOpenWorkspace();
      } else if (matchKeybinding(e, getKeybinding('commandPalette', kb))) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (matchKeybinding(e, getKeybinding('searchWorkspace', kb))) {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (matchKeybinding(e, getKeybinding('toggleSidebar', kb))) {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      } else if (matchKeybinding(e, getKeybinding('toggleToc', kb))) {
        e.preventDefault();
        setIsSidebarCollapsed(false);
        setSidebarTab((prev) => (prev === 'files' ? 'toc' : 'files'));
      } else if (matchKeybinding(e, getKeybinding('toggleViewMode', kb))) {
        e.preventDefault();
        setViewMode((prev) => (prev === 'editor' ? 'split' : prev === 'split' ? 'preview' : 'editor'));
      } else if (matchKeybinding(e, getKeybinding('exportPdf', kb))) {
        e.preventDefault();
        handleExportPdf();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveActiveFile, handleSelectAndOpenFile, handleOpenWorkspace, handleExportPdf]);

  // Context Menu Handler
  const handleContextMenu = (e: React.MouseEvent, entry?: FileEntry, folderPath?: string) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      entry,
      targetFolder: folderPath,
    });
  };

  // Commands for Palette
  const commands: CommandItem[] = useMemo(() => {
    const kb = settings.keybindings;
    return [
      {
        id: 'open-file',
        title: t('commandPalette.openFile'),
        shortcut: getKeybinding('openFile', kb),
        action: () => handleSelectAndOpenFile(),
      },
      {
        id: 'open-workspace',
        title: t('commandPalette.openWorkspace'),
        shortcut: getKeybinding('openWorkspace', kb),
        action: () => handleOpenWorkspace(),
      },
      {
        id: 'new-file',
        title: t('commandPalette.newNote'),
        shortcut: 'Ctrl+N',
        action: () => handleCreateNew('', 'file'),
      },
      {
        id: 'new-folder',
        title: t('commandPalette.newFolder'),
        action: () => handleCreateNew('', 'directory'),
      },
      {
        id: 'search-workspace',
        title: t('commandPalette.search'),
        shortcut: getKeybinding('searchWorkspace', kb),
        action: () => setIsSearchOpen(true),
      },
      {
        id: 'export-pdf',
        title: t('commandPalette.exportPdf'),
        shortcut: getKeybinding('exportPdf', kb),
        action: () => handleExportPdf(),
      },
      {
        id: 'backup-data',
        title: t('commandPalette.backup'),
        action: () => setIsBackupOpen(true),
      },
      {
        id: 'consolidate-images',
        title: t('commandPalette.consolidateImages'),
        action: () => {
          if (!activePath) {
            addToast(t('toasts.needMarkdownForConsolidate'), 'info');
            return;
          }
          setIsConsolidateImagesOpen(true);
        },
      },
      {
        id: 'toggle-theme',
        title: t('commandPalette.toggleTheme'),
        action: () =>
          setSettings((prev) => ({
            ...prev,
            theme: prev.theme === 'dark' ? 'light' : 'dark',
          })),
      },
      {
        id: 'open-settings',
        title: t('commandPalette.openSettings'),
        shortcut: 'Ctrl+,',
        action: () => {
          setSettingsTab('general');
          setIsSettingsOpen(true);
        },
      },
      {
        id: 'pick-image-dir',
        title: t('commandPalette.openImageSettings'),
        action: () => {
          setSettingsTab('image');
          setIsSettingsOpen(true);
        },
      },
    ];
  }, [
    handleSelectAndOpenFile,
    handleOpenWorkspace,
    handleCreateNew,
    handleExportPdf,
    activePath,
    addToast,
    settings.keybindings,
    t,
  ]);

  // Active Tab details
  const activeTab = tabs.find((t) => t.relativePath === activePath);
  const wordCount = useMemo(() => {
    if (!activeTab?.content) return 0;
    return activeTab.content.trim().split(/\s+/).filter(Boolean).length;
  }, [activeTab?.content]);

  // Stable refs for callbacks invoked by initial load and global listeners
  const handleOpenPathRef = useRef(handleOpenPath);
  handleOpenPathRef.current = handleOpenPath;

  const handleOpenWorkspaceRef = useRef(handleOpenWorkspace);
  handleOpenWorkspaceRef.current = handleOpenWorkspace;

  // Initial load: check CLI launch argument first, else restore last workspace if stored (RUN ONCE)
  const initialLoadDoneRef = useRef(false);
  useEffect(() => {
    if (initialLoadDoneRef.current) return;
    initialLoadDoneRef.current = true;

    (async () => {
      try {
        const cliPath = await getCliLaunchPath();
        if (cliPath && cliPath.trim().length > 0) {
          handleOpenPathRef.current?.(cliPath);
        } else {
          const savedWs = localStorage.getItem('bookmd_last_workspace');
          if (savedWs && savedWs.trim()) {
            handleOpenWorkspaceRef.current?.(savedWs.trim(), true);
          }
        }
      } catch (err) {
        console.warn('Initial load error:', err);
      }
    })();
  }, []);

  // Listen for single-instance launch requests and file drag-drop (RUN ONCE)
  useEffect(() => {
    let unlistenOpenPath: (() => void) | undefined;
    let unlistenDragDrop: (() => void) | undefined;

    if (isTauri) {
      listen<string>('open-path-requested', (event) => {
        if (event.payload) {
          handleOpenPathRef.current?.(event.payload);
        }
      }).then((fn) => {
        unlistenOpenPath = fn;
      });

      listen<{ paths?: string[] }>('tauri://drag-drop', (event) => {
        if (event.payload?.paths && event.payload.paths.length > 0) {
          const first = event.payload.paths[0];
          if (first) {
            handleOpenPathRef.current?.(first);
          }
        }
      }).then((fn) => {
        unlistenDragDrop = fn;
      });
    }

    return () => {
      unlistenOpenPath?.();
      unlistenDragDrop?.();
    };
  }, []);

  // Intercept global link clicks so external URLs never navigate the WebView
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (href && /^(https?:\/\/|mailto:|tel:)/i.test(href)) {
        e.preventDefault();
        e.stopPropagation();
        if (isTauri) {
          openUrl(href).catch((err) => console.error('Failed to open URL via plugin-opener:', err));
        } else {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      }
    };
    document.addEventListener('click', handleGlobalClick, true);
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

  return (
    <LanguageProvider
      language={currentLang}
      onLanguageChange={(lang) => setSettings((prev) => ({ ...prev, language: lang }))}
    >
      <div className="app">
      <Header
        workspaceName={workspace?.name}
        theme={settings.theme}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenFile={handleSelectAndOpenFile}
        onOpenWorkspace={() => handleOpenWorkspace()}
        onToggleSearch={() => setIsSearchOpen(true)}
        onToggleCommandPalette={() => setIsCommandPaletteOpen(true)}
        onExportPdf={handleExportPdf}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenConsolidateImages={() => {
          if (!activePath) {
            addToast(t('toasts.needMarkdownForConsolidate'), 'info');
            return;
          }
          setIsConsolidateImagesOpen(true);
        }}
        onToggleTheme={() =>
          setSettings((prev) => ({
            ...prev,
            theme: prev.theme === 'dark' ? 'light' : 'dark',
          }))
        }
        onOpenSettings={() => {
          setSettingsTab('general');
          setIsSettingsOpen(true);
        }}
        onOpenImageSettings={() => {
          setSettingsTab('image');
          setIsSettingsOpen(true);
        }}
      />

      <div className="app-body">
        <FileTree
          tree={fileTree}
          activeFile={activePath || undefined}
          activeContent={activeTab?.content}
          isCollapsed={isSidebarCollapsed}
          width={sidebarWidth}
          sidebarTab={sidebarTab}
          expandedFolders={expandedFolders}
          onToggleFolder={handleToggleFolder}
          onLoadChildren={handleLoadFolderChildren}
          onSelectSidebarTab={setSidebarTab}
          onSelectFile={handleOpenFile}
          onRefresh={handleRefreshTree}
          onNavigateToLine={(line) => {
            setTargetLine(line);
            setTargetLineKey((k) => k + 1);
            setCursorPos((prev) => ({ ...prev, line }));
          }}
          onContextMenu={handleContextMenu}
          onCreateNew={handleCreateNew}
        />

        {!isSidebarCollapsed && (
          <div
            className="resize-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startW = sidebarWidth;
              const onMouseMove = (moveEvent: MouseEvent) => {
                const newW = Math.max(180, Math.min(450, startW + (moveEvent.clientX - startX)));
                setSidebarWidth(newW);
              };
              const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
              };
              window.addEventListener('mousemove', onMouseMove);
              window.addEventListener('mouseup', onMouseUp);
            }}
          />
        )}

        <main className="main-panel">
          <TabBar
            tabs={tabs}
            activePath={activePath}
            viewMode={viewMode}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
            onChangeViewMode={setViewMode}
          />

          {activeTab ? (
            <div className="editor-area">
              <Editor
                content={activeTab.content}
                relativePath={activeTab.relativePath}
                workspacePath={workspace?.path}
                theme={settings.theme}
                settings={settings}
                targetLine={targetLine}
                targetLineKey={targetLineKey}
                viewMode={viewMode}
                isVisible={viewMode === 'editor' || viewMode === 'split'}
                onChange={handleContentChange}
                onSave={handleSaveActiveFile}
                onCursorChange={(line, col) => setCursorPos({ line, col })}
                onToast={addToast}
                onImagePasted={handleImagePasted}
              />

              {viewMode === 'split' && <div className="split-divider" />}

              <Preview
                content={activeTab.content}
                relativePath={activeTab.relativePath}
                workspacePath={workspace?.path}
                activeLine={cursorPos.line}
                viewMode={viewMode}
                isVisible={viewMode === 'preview' || viewMode === 'split'}
                theme={settings.theme}
                onNavigateToFile={handleNavigateToFile}
                onToast={addToast}
              />
            </div>
          ) : (
            <div className="welcome">
              <div className="welcome-logo">BookMD</div>
              <div className="welcome-subtitle">
                {t('welcome.subtitle')}
              </div>
              <div className="welcome-action" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="welcome-btn" onClick={handleSelectAndOpenFile} title={t('welcome.openFileTitle')}>
                  {t('welcome.openFile')}
                </button>
                <button className="welcome-btn" onClick={() => handleOpenWorkspace()} title={t('welcome.openWorkspaceTitle')}>
                  {t('welcome.openWorkspace')}
                </button>
                <button className="welcome-btn" onClick={() => handleCreateNew('', 'file')} title={t('welcome.newNoteTitle')}>
                  {t('welcome.newNote')}
                </button>
              </div>
              <div className="welcome-shortcut">{t('welcome.hint')}</div>
            </div>
          )}
        </main>
      </div>

      <StatusBar
        activeFile={activeTab?.relativePath}
        isDirty={activeTab?.isDirty}
        cursorLine={cursorPos.line}
        cursorCol={cursorPos.col}
        wordCount={wordCount}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(file, line) => {
          handleOpenFile({ name: file.split(/[\/\\]/).pop() || file, relativePath: file, kind: 'file' }, line);
        }}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        commands={commands}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        initialTab={settingsTab}
        settings={settings}
        fileTree={fileTree}
        workspaceName={workspace?.name}
        hasUnsavedTabs={tabs.some((tab) => tab.isDirty)}
        onClose={() => setIsSettingsOpen(false)}
        onSaveAll={handleSaveAllDirtyTabs}
        onUpdateSettings={(newSettings) => {
          setSettings((prev) => ({ ...prev, ...newSettings }));
          if (newSettings.imageDir !== undefined) {
            addToast(t('toasts.imageDirToast', { dir: newSettings.imageDir }), 'success');
          }
          if (newSettings.imageNamingBaseDir !== undefined) {
            addToast(
              newSettings.imageNamingBaseDir
                ? t('toasts.namingBaseToast', { dir: newSettings.imageNamingBaseDir })
                : t('toasts.namingBaseResetToast'),
              'success'
            );
          }
          if (newSettings.imageReferenceType !== undefined) {
            addToast(
              newSettings.imageReferenceType === 'relative'
                ? t('toasts.refSyntaxRelativeToast')
                : t('toasts.refSyntaxAbsoluteToast'),
              'success'
            );
          }
          if (newSettings.keybindings !== undefined) {
            addToast(t('toasts.keybindingsSaved'), 'success');
          }
        }}
        onCreateFolder={async (folderPath) => {
          try {
            await createFile(folderPath, 'directory');
            await handleRefreshTree();
            addToast(t('toasts.folderCreated', { path: folderPath }), 'success');
          } catch (err: any) {
            addToast(t('toasts.folderCreateError', { error: err.message || err }), 'error');
          }
        }}
      />

      <ContextMenu
        state={contextMenu}
        onClose={() => setContextMenu(null)}
        onNewFile={(parent) => handleCreateNew(parent, 'file')}
        onNewFolder={(parent) => handleCreateNew(parent, 'directory')}
        onRename={handleRename}
        onDelete={handleRequestDelete}
        onCopyRelativePath={(path) => {
          navigator.clipboard.writeText(path);
          addToast(t('toasts.pathCopied', { path }), 'info');
        }}
      />

      {deleteModalState && (
        <ConfirmDeleteModal
          isOpen={deleteModalState.isOpen}
          targetPath={deleteModalState.targetPath}
          name={deleteModalState.name}
          isFolder={deleteModalState.isFolder}
          onClose={() => setDeleteModalState(null)}
          onConfirm={handleExecuteDelete}
        />
      )}

      {promptDialog && (
        <PromptModal
          isOpen={promptDialog.isOpen}
          title={promptDialog.title}
          subtitle={promptDialog.subtitle}
          icon={promptDialog.icon}
          defaultValue={promptDialog.defaultValue}
          placeholder={promptDialog.placeholder}
          confirmLabel={promptDialog.confirmLabel}
          onClose={() => setPromptDialog(null)}
          onSubmit={promptDialog.onSubmit}
        />
      )}

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        workspace={workspace}
        activeFile={activePath || undefined}
        tree={fileTree}
        addToast={addToast}
      />

      <ConsolidateImagesModal
        isOpen={isConsolidateImagesOpen}
        onClose={() => setIsConsolidateImagesOpen(false)}
        markdownFile={activePath}
        content={activeTab?.content || ''}
        imageDir={settings.imageDir}
        imageNamingBaseDir={settings.imageNamingBaseDir}
        onSuccess={(updatedContent) => {
          if (activePath) {
            setTabs((prev) =>
              prev.map((t) =>
                t.relativePath === activePath
                  ? { ...t, content: updatedContent, isDirty: true }
                  : t
              )
            );
            handleRefreshTree();
          }
        }}
        addToast={addToast}
      />

      {pendingWorkspaceSwitch && (
        <div
          className="prompt-modal-overlay"
          style={{ zIndex: 10040 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPendingWorkspaceSwitch(null);
          }}
        >
          <div className="prompt-modal-dialog" style={{ maxWidth: '470px' }}>
            <div className="prompt-modal-header" style={{ borderBottom: '1px solid var(--border-primary)' }}>
              <div className="prompt-modal-title-group">
                <div
                  className="prompt-modal-icon-badge"
                  style={{
                    background: 'rgba(245, 158, 11, 0.14)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <FolderOpenIcon size={18} />
                </div>
                <div>
                  <h3 className="prompt-modal-title">{t('workspaceSwitch.unsavedTitle')}</h3>
                  <div className="prompt-modal-subtitle">{t('workspaceSwitch.unsavedSubtitle')}</div>
                </div>
              </div>
              <button
                className="btn btn-icon prompt-close-btn"
                onClick={() => setPendingWorkspaceSwitch(null)}
                title={t('common.close')}
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="prompt-modal-body" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.55 }}>
                {t('workspaceSwitch.unsavedDesc', { files: pendingWorkspaceSwitch.fileNames.join(', ') })}
              </div>
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
                onClick={() => setPendingWorkspaceSwitch(null)}
              >
                {t('workspaceSwitch.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-secondary prompt-btn"
                onClick={async () => {
                  const target = pendingWorkspaceSwitch.targetPath;
                  setPendingWorkspaceSwitch(null);
                  await proceedOpenWorkspace(target, false);
                }}
              >
                {t('workspaceSwitch.discardAndSwitch')}
              </button>
              <button
                type="button"
                className="btn btn-primary prompt-btn"
                onClick={async () => {
                  const target = pendingWorkspaceSwitch.targetPath;
                  setPendingWorkspaceSwitch(null);
                  try {
                    await handleSaveAllDirtyTabs();
                  } catch (err: any) {
                    addToast(t('toasts.fileSaveError', { error: err?.message || err }), 'error');
                    return;
                  }
                  await proceedOpenWorkspace(target, false);
                }}
              >
                {t('workspaceSwitch.saveAndSwitch')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </div>
    </LanguageProvider>
  );
};

export default App;

