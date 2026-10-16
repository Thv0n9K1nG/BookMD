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
  readFile,
  writeFile,
  createFile,
  renameFile,
  deleteFile,
  renameImagesForDocument,
  selectWorkspaceFolder,
  isTauri,
} from './services/ipc';
import { normalizePathSegments } from './utils/imagePath';
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
import { generatePrintHtml, printHtmlViaIframe } from './utils/exportPdf';

export const App: React.FC = () => {
  // Settings
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('bookmd_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      imageDir: 'assets/images',
      theme: 'dark',
      fontSize: 14,
      autoSave: false,
      lineNumbers: true,
      wordWrap: true,
    };
  });

  // Workspace & Files
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [fileTree, setFileTree] = useState<FileEntry[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(['TryHackMe', 'assets', 'assets/images', 'img'])
  );
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('files');

  // Tabs & Editor
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [targetLine, setTargetLine] = useState<number | undefined>(undefined);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Modals & Panels
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
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

  // Apply theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    localStorage.setItem('bookmd_settings', JSON.stringify(settings));
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

  // Open Workspace Action
  const handleOpenWorkspace = useCallback(async (path?: string, isInitialAutoOpen = false) => {
    try {
      const selectedPath = path || (await selectWorkspaceFolder());
      if (!selectedPath) return;

      const wsInfo = await openWorkspace(selectedPath);
      setWorkspace(wsInfo);
      localStorage.setItem('bookmd_last_workspace', selectedPath);
      const tree = await getWorkspaceTree();
      setFileTree(tree);
      addToast(`Đã mở workspace: ${wsInfo.name}`, 'success');

      // Auto open README.md if present
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
      if (readme) {
        handleOpenFileRef.current?.(readme);
      }
    } catch (err: any) {
      console.error('Open workspace error:', err);
      if (isInitialAutoOpen) {
        // Silently clear previous workspace from localStorage if missing or moved
        localStorage.removeItem('bookmd_last_workspace');
      } else {
        addToast(`Lỗi mở workspace: ${err?.message || err}`, 'error');
      }
    }
  }, [addToast]);

  // Reload File Tree
  const handleRefreshTree = useCallback(async () => {
    if (!workspace) return;
    try {
      const tree = await getWorkspaceTree();
      setFileTree(tree);
      addToast('Đã làm mới thư mục', 'info');
    } catch (err: any) {
      console.error('Refresh tree error:', err);
    }
  }, [workspace, addToast]);

  // Toggle folder expansion in tree
  const handleToggleFolder = useCallback((folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  }, []);

  // Handle image pasted in editor: refresh file tree and expand image directory
  const handleImagePasted = useCallback(async (imageRelPath: string) => {
    try {
      const tree = await getWorkspaceTree();
      setFileTree(tree);

      const norm = imageRelPath.replace(/\\/g, '/');
      const lastSlash = norm.lastIndexOf('/');
      if (lastSlash > 0) {
        const folder = norm.substring(0, lastSlash);
        const parts = folder.split('/');
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
    } catch (err) {
      console.error('Failed to update tree after image paste:', err);
    }
  }, []);

  // Listen to background filesystem change events (watcher)
  useEffect(() => {
    if (!isTauri) return;

    let timer: any = null;
    const unlistenPromise = listen('fs-change', () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const tree = await getWorkspaceTree();
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

    const existing = tabs.find((t) => t.relativePath === entry.relativePath);
    if (existing) {
      setActivePath(entry.relativePath);
      if (line) setTargetLine(line);
      return;
    }

    try {
      const content = await readFile(entry.relativePath);
      const newTab: OpenTab = {
        relativePath: entry.relativePath,
        name: entry.name,
        content,
        savedContent: content,
        isDirty: false,
        cursorLine: line,
      };
      setTabs((prev) => [...prev, newTab]);
      setActivePath(entry.relativePath);
      if (line) setTargetLine(line);
    } catch (err: any) {
      console.error('Read file error:', err);
      addToast(`Không thể đọc file: ${err?.message || err}`, 'error');
    }
  }, [tabs, addToast]);
  handleOpenFileRef.current = handleOpenFile;

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
  const handleSelectTab = useCallback((path: string) => {
    setActivePath(path);
  }, []);

  // Close Tab
  const handleCloseTab = useCallback((path: string) => {
    setTabs((prev) => {
      const nextTabs = prev.filter((t) => t.relativePath !== path);
      if (activePath === path) {
        if (nextTabs.length > 0) {
          setActivePath(nextTabs[nextTabs.length - 1].relativePath);
        } else {
          setActivePath(null);
        }
      }
      return nextTabs;
    });
  }, [activePath]);

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

  // Save Active File
  const handleSaveActiveFile = useCallback(async () => {
    const currentTab = tabs.find((t) => t.relativePath === activePath);
    if (!currentTab || !currentTab.isDirty) return;

    try {
      await writeFile(currentTab.relativePath, currentTab.content);
      setTabs((prev) =>
        prev.map((tab) =>
          tab.relativePath === activePath
            ? { ...tab, savedContent: tab.content, isDirty: false }
            : tab
        )
      );
      addToast(`Đã lưu ${currentTab.name}`, 'success');
    } catch (err: any) {
      console.error('Save file error:', err);
      addToast(`Lỗi lưu file: ${err?.message || err}`, 'error');
    }
  }, [tabs, activePath, addToast]);

  // Create New File or Directory
  const handleCreateNew = useCallback(
    (parentFolder: string, kind: 'file' | 'directory') => {
      const isFile = kind === 'file';
      const title = isFile ? 'Tạo File Markdown mới' : 'Tạo Thư mục mới';
      const defaultName = isFile ? 'new_note.md' : 'NewFolder';
      const subtitle = parentFolder ? `Vị trí: ${parentFolder}` : 'Vị trí: Thư mục gốc Workspace';

      setPromptDialog({
        isOpen: true,
        title,
        subtitle,
        icon: isFile ? 'file' : 'directory',
        defaultValue: defaultName,
        placeholder: isFile ? 'vd: ghi_chu.md' : 'vd: ThuMucMoi',
        confirmLabel: isFile ? 'Tạo File' : 'Tạo Thư mục',
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

            addToast(`Đã tạo: ${created.name}`, 'success');
            if (kind === 'file') {
              handleOpenFile(created);
            }
          } catch (err: any) {
            console.error('Create entry error:', err);
            addToast(`Lỗi tạo: ${err?.message || err}`, 'error');
          }
        },
      });
    },
    [handleRefreshTree, handleOpenFile, addToast]
  );

  // Rename File / Folder
  const handleRename = useCallback(
    (sourcePath: string, currentName: string) => {
      const isFile = sourcePath.endsWith('.md') || currentName.includes('.');
      setPromptDialog({
        isOpen: true,
        title: `Đổi tên ${isFile ? 'File' : 'Thư mục'}`,
        subtitle: `Đường dẫn hiện tại: ${sourcePath}`,
        icon: 'rename',
        defaultValue: currentName,
        placeholder: 'Nhập tên mới...',
        confirmLabel: 'Đổi tên',
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
                await renameImagesForDocument(sourcePath, destinationPath, settings.imageDir);
              } catch (e) {
                console.warn('Image rename note:', e);
              }
            }

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
              setActivePath(destinationPath);
            }

            await handleRefreshTree();
            addToast(`Đã đổi tên thành: ${newName.trim()}`, 'success');
          } catch (err: any) {
            console.error('Rename error:', err);
            addToast(`Lỗi đổi tên: ${err?.message || err}`, 'error');
          }
        },
      });
    },
    [settings.imageDir, activePath, handleRefreshTree, addToast]
  );

  // Delete File / Folder
  const handleDelete = useCallback(
    async (targetPath: string, name: string) => {
      const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa "${name}" không?`);
      if (!confirmDelete) return;

      try {
        await deleteFile(targetPath);
        handleCloseTab(targetPath);
        await handleRefreshTree();
        addToast(`Đã xóa: ${name}`, 'success');
      } catch (err: any) {
        console.error('Delete error:', err);
        addToast(`Lỗi xóa: ${err?.message || err}`, 'error');
      }
    },
    [handleCloseTab, handleRefreshTree, addToast]
  );

  // Export Current Markdown Document to PDF
  const isExportingPdfRef = useRef(false);
  const handleExportPdf = useCallback(async () => {
    if (isExportingPdfRef.current) return;
    const currentTab = tabs.find((t) => t.relativePath === activePath);
    if (!currentTab) {
      addToast('Vui lòng mở một file Markdown để xuất PDF', 'info');
      return;
    }

    isExportingPdfRef.current = true;
    try {
      addToast('Đang chuẩn bị tài liệu xuất PDF...', 'info');
      const fullHtml = await generatePrintHtml(
        currentTab.name,
        currentTab.content,
        currentTab.relativePath,
        workspace?.path
      );

      const success = await printHtmlViaIframe(fullHtml);
      if (success) {
        addToast('Đã mở cửa sổ in ấn (chọn "Save as PDF" / "Lưu dưới dạng PDF")', 'success');
      } else {
        addToast('Không thể mở cửa sổ in ấn', 'error');
      }
    } catch (err: any) {
      console.error('Export PDF error:', err);
      addToast(`Lỗi xuất PDF: ${err?.message || 'Không xác định'}`, 'error');
    } finally {
      setTimeout(() => {
        isExportingPdfRef.current = false;
      }, 500);
    }
  }, [tabs, activePath, workspace?.path, addToast]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveActiveFile();
      } else if (isMod && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (isMod && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (isMod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      } else if (isMod && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setIsSidebarCollapsed(false);
        setSidebarTab((prev) => (prev === 'files' ? 'toc' : 'files'));
      } else if (isMod && e.key === '\\') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'editor' ? 'split' : prev === 'split' ? 'preview' : 'editor'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveActiveFile]);

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
  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'open-workspace',
        title: 'Mở Workspace...',
        shortcut: 'Ctrl+O',
        action: () => handleOpenWorkspace(),
      },
      {
        id: 'new-file',
        title: 'Tạo File Markdown mới...',
        shortcut: 'Ctrl+N',
        action: () => handleCreateNew('', 'file'),
      },
      {
        id: 'new-folder',
        title: 'Tạo Thư mục mới...',
        action: () => handleCreateNew('', 'directory'),
      },
      {
        id: 'save-file',
        title: 'Lưu File hiện tại',
        shortcut: 'Ctrl+S',
        action: () => handleSaveActiveFile(),
      },
      {
        id: 'search-workspace',
        title: 'Tìm kiếm toàn bộ Workspace',
        shortcut: 'Ctrl+Shift+F',
        action: () => setIsSearchOpen(true),
      },
      {
        id: 'toggle-sidebar',
        title: 'Ẩn / Hiện Sidebar',
        shortcut: 'Ctrl+B',
        action: () => setIsSidebarCollapsed((prev) => !prev),
      },
      {
        id: 'toggle-sidebar-toc',
        title: 'Sidebar: Chuyển đổi Thư mục / Mục lục (Table of Contents)',
        shortcut: 'Ctrl+Shift+O',
        action: () => {
          setIsSidebarCollapsed(false);
          setSidebarTab((prev) => (prev === 'files' ? 'toc' : 'files'));
        },
      },
      {
        id: 'view-editor',
        title: 'Chuyển sang chế độ: Chỉ Editor',
        action: () => setViewMode('editor'),
      },
      {
        id: 'view-split',
        title: 'Chuyển sang chế độ: Split (Editor + Preview)',
        shortcut: 'Ctrl+\\',
        action: () => setViewMode('split'),
      },
      {
        id: 'view-preview',
        title: 'Chuyển sang chế độ: Chỉ Preview',
        action: () => setViewMode('preview'),
      },
      {
        id: 'export-pdf',
        title: 'Xuất tài liệu sang PDF...',
        action: () => handleExportPdf(),
      },
      {
        id: 'toggle-theme',
        title: `Đổi giao diện sang ${settings.theme === 'dark' ? 'Sáng (Light)' : 'Tối (Dark)'}`,
        action: () =>
          setSettings((prev) => ({
            ...prev,
            theme: prev.theme === 'dark' ? 'light' : 'dark',
          })),
      },
      {
        id: 'open-settings',
        title: 'Cài đặt...',
        shortcut: 'Ctrl+,',
        action: () => setIsSettingsOpen(true),
      },
      {
        id: 'pick-image-dir',
        title: 'Cài đặt: Chọn thư mục lưu hình ảnh (Image Directory)...',
        action: () => setIsSettingsOpen(true),
      },
    ],
    [handleOpenWorkspace, handleCreateNew, handleSaveActiveFile, handleExportPdf, settings.theme]
  );

  // Active Tab details
  const activeTab = tabs.find((t) => t.relativePath === activePath);
  const wordCount = useMemo(() => {
    if (!activeTab?.content) return 0;
    return activeTab.content.trim().split(/\s+/).filter(Boolean).length;
  }, [activeTab?.content]);

  // Initial load: restore last workspace if stored, or stay on Welcome screen
  useEffect(() => {
    const savedWs = localStorage.getItem('bookmd_last_workspace');
    if (savedWs && savedWs.trim()) {
      handleOpenWorkspace(savedWs.trim(), true);
    }
  }, [handleOpenWorkspace]);

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
    <div className="app">
      <Header
        workspaceName={workspace?.name}
        theme={settings.theme}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenWorkspace={() => handleOpenWorkspace()}
        onToggleSearch={() => setIsSearchOpen(true)}
        onToggleCommandPalette={() => setIsCommandPaletteOpen(true)}
        onExportPdf={handleExportPdf}
        onToggleTheme={() =>
          setSettings((prev) => ({
            ...prev,
            theme: prev.theme === 'dark' ? 'light' : 'dark',
          }))
        }
        onOpenSettings={() => setIsSettingsOpen(true)}
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
          onSelectSidebarTab={setSidebarTab}
          onSelectFile={handleOpenFile}
          onRefresh={handleRefreshTree}
          onNavigateToLine={(line) => {
            setTargetLine(line);
            if (viewMode === 'preview') {
              setViewMode('split');
            }
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
              {(viewMode === 'editor' || viewMode === 'split') && (
                <Editor
                  content={activeTab.content}
                  relativePath={activeTab.relativePath}
                  workspacePath={workspace?.path}
                  theme={settings.theme}
                  settings={settings}
                  targetLine={targetLine}
                  onChange={handleContentChange}
                  onSave={handleSaveActiveFile}
                  onCursorChange={(line, col) => setCursorPos({ line, col })}
                  onToast={addToast}
                  onImagePasted={handleImagePasted}
                />
              )}

              {viewMode === 'split' && <div className="split-divider" />}

              {(viewMode === 'preview' || viewMode === 'split') && (
                <Preview
                  content={activeTab.content}
                  relativePath={activeTab.relativePath}
                  workspacePath={workspace?.path}
                  activeLine={cursorPos.line}
                  viewMode={viewMode}
                  onNavigateToFile={handleNavigateToFile}
                />
              )}
            </div>
          ) : (
            <div className="welcome">
              <div className="welcome-logo">BookMD</div>
              <div className="welcome-subtitle">
                A lightweight, filesystem-first Markdown workspace designed for technical notes, cybersecurity & devops documentation.
              </div>
              <div className="welcome-action">
                <button className="welcome-btn" onClick={() => handleCreateNew('', 'file')}>
                  📄 Tạo ghi chú mới
                </button>
                <div className="welcome-shortcut">hoặc mở tài liệu từ cây thư mục bên trái</div>
              </div>
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
        settings={settings}
        fileTree={fileTree}
        workspaceName={workspace?.name}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={(newSettings) => {
          setSettings((prev) => ({ ...prev, ...newSettings }));
          if (newSettings.imageDir) {
            addToast(`Thư mục lưu ảnh: ${newSettings.imageDir}`, 'success');
          }
        }}
        onCreateFolder={async (folderPath) => {
          try {
            await createFile(folderPath, 'directory');
            await handleRefreshTree();
            addToast(`Đã tạo thư mục: ${folderPath}`, 'success');
          } catch (err: any) {
            addToast(`Lỗi tạo thư mục: ${err.message || err}`, 'error');
          }
        }}
      />

      <ContextMenu
        state={contextMenu}
        onClose={() => setContextMenu(null)}
        onNewFile={(parent) => handleCreateNew(parent, 'file')}
        onNewFolder={(parent) => handleCreateNew(parent, 'directory')}
        onRename={handleRename}
        onDelete={handleDelete}
        onCopyRelativePath={(path) => {
          navigator.clipboard.writeText(path);
          addToast(`Đã sao chép: ${path}`, 'info');
        }}
      />

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

      <ToastContainer toasts={toasts} />
    </div>
  );
};

export default App;

