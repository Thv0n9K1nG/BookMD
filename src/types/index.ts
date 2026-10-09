export interface WorkspaceInfo {
  path: string;
  name: string;
}

export type FileKind = 'file' | 'directory';

export interface FileEntry {
  name: string;
  relativePath: string;
  kind: FileKind;
  children?: FileEntry[];
}

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  matchedText: string;
  context: string;
}

export interface SearchOptions {
  caseSensitive?: boolean;
  isRegex?: boolean;
}

export interface ImageResult {
  path: string;
  relativePath: string;
  filename: string;
  markdownReference: string;
}

export interface ImageSaveOptions {
  imageDir?: string;
  preferredExtension?: string;
}

export type ViewMode = 'editor' | 'preview' | 'split';

export type Theme = 'dark' | 'light';

export interface OpenTab {
  relativePath: string;
  name: string;
  content: string;
  savedContent: string;
  isDirty: boolean;
  cursorLine?: number;
}

export interface Settings {
  imageDir: string;
  theme: Theme;
  fontSize: number;
  autoSave: boolean;
  lineNumbers: boolean;
  wordWrap: boolean;
}

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'info' | 'success' | 'error';
}

export interface ContextMenuState {
  x: number;
  y: number;
  entry?: FileEntry;
  targetFolder?: string;
}

export type SidebarTab = 'files' | 'toc';

export interface TocItem {
  id: string;
  level: number;
  text: string;
  line: number;
}

