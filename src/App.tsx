import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './styles/index.css';
import {
  WorkspaceInfo,
  FileEntry,
  OpenTab,
  ViewMode,
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
  exportPdf,
  promptSavePdfPath,
  selectWorkspaceFolder,
} from './services/ipc';
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
import MarkdownIt from 'markdown-it';

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
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  // Open Workspace Action
  const handleOpenWorkspace = useCallback(async (path?: string) => {
    try {
      const selectedPath = path || (await selectWorkspaceFolder());
      if (!selectedPath) return;

      const wsInfo = await openWorkspace(selectedPath);
      setWorkspace(wsInfo);
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
        handleOpenFile(readme);
      }
    } catch (err: any) {
      console.error('Open workspace error:', err);
      addToast(`Lỗi mở workspace: ${err?.message || err}`, 'error');
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
    async (parentFolder: string, kind: 'file' | 'directory') => {
      const title = kind === 'file' ? 'Tên file mới (.md):' : 'Tên thư mục mới:';
      const defaultName = kind === 'file' ? 'new_note.md' : 'NewFolder';
      const name = prompt(title, defaultName);
      if (!name || !name.trim()) return;

      const finalName = kind === 'file' && !name.includes('.') ? `${name.trim()}.md` : name.trim();
      const relativePath = parentFolder ? `${parentFolder}/${finalName}` : finalName;

      try {
        const created = await createFile(relativePath, kind);
        await handleRefreshTree();
        addToast(`Đã tạo: ${created.name}`, 'success');
        if (kind === 'file') {
          handleOpenFile(created);
        }
      } catch (err: any) {
        console.error('Create entry error:', err);
        addToast(`Lỗi tạo: ${err?.message || err}`, 'error');
      }
    },
    [handleRefreshTree, handleOpenFile, addToast]
  );

  // Rename File / Folder
  const handleRename = useCallback(
    async (sourcePath: string, currentName: string) => {
      const newName = prompt('Đổi tên thành:', currentName);
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
        addToast(`Đã đổi tên thành ${newName.trim()}`, 'success');
      } catch (err: any) {
        console.error('Rename error:', err);
        addToast(`Lỗi đổi tên: ${err?.message || err}`, 'error');
      }
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
  const handleExportPdf = useCallback(async () => {
    const currentTab = tabs.find((t) => t.relativePath === activePath);
    if (!currentTab) {
      addToast('Vui lòng mở một file Markdown để xuất PDF', 'info');
      return;
    }

    try {
      const md = new MarkdownIt({ html: true, linkify: true, breaks: true });
      const bodyHtml = md.render(currentTab.content);
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${currentTab.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
    h1, h2, h3 { color: #0f172a; margin-top: 1.2em; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #4f46e5; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; color: inherit; }
    blockquote { border-left: 4px solid #6366f1; margin: 16px 0; padding: 8px 16px; background: #f8fafc; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; }
    img { max-width: 100%; height: auto; border-radius: 6px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;

      const dest = await promptSavePdfPath(currentTab.name);
      if (!dest) return;

      await exportPdf(currentTab.relativePath, fullHtml, dest);
      addToast(`Đã xuất PDF thành công: ${dest}`, 'success');
    } catch (err: any) {
      console.error('Export PDF error:', err);
      // In web browser fallback, trigger window.print
      window.print();
      addToast('Đã mở cửa sổ in ấn PDF', 'info');
    }
  }, [tabs, activePath, addToast]);

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
    ],
    [handleOpenWorkspace, handleCreateNew, handleSaveActiveFile, handleExportPdf, settings.theme]
  );

  // Active Tab details
  const activeTab = tabs.find((t) => t.relativePath === activePath);
  const wordCount = useMemo(() => {
    if (!activeTab?.content) return 0;
    return activeTab.content.trim().split(/\s+/).filter(Boolean).length;
  }, [activeTab?.content]);

  // Initial load
  useEffect(() => {
    handleOpenWorkspace('c:\\PROJECT\\BookMD');
  }, []);

  return (
    <div className="app">
      <Header
        workspaceName={workspace?.name}
        theme={settings.theme}
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
          isCollapsed={isSidebarCollapsed}
          width={sidebarWidth}
          onSelectFile={handleOpenFile}
          onRefresh={handleRefreshTree}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
                  theme={settings.theme}
                  settings={settings}
                  targetLine={targetLine}
                  onChange={handleContentChange}
                  onSave={handleSaveActiveFile}
                  onCursorChange={(line, col) => setCursorPos({ line, col })}
                  onToast={addToast}
                />
              )}

              {viewMode === 'split' && <div className="split-divider" />}

              {(viewMode === 'preview' || viewMode === 'split') && (
                <Preview
                  content={activeTab.content}
                  relativePath={activeTab.relativePath}
                  workspacePath={workspace?.path}
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
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={(newSettings) => setSettings((prev) => ({ ...prev, ...newSettings }))}
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

      <ToastContainer toasts={toasts} />
    </div>
  );
};

export default App;
