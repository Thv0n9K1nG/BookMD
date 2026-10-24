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
  column?: number;
  matchLength?: number;
  matchedText: string;
  lineContent?: string;
  lineBefore?: string | null;
  lineAfter?: string | null;
  context: string;
}

export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  isRegex?: boolean;
  regex?: boolean;
  filePattern?: string;
}

export interface ImageResult {
  path: string;
  relativePath: string;
  docRelativePath?: string;
  filename: string;
  markdownReference: string;
}

export type ImageReferenceType = 'relative' | 'absolute';

export interface ImageSaveOptions {
  imageDir?: string;
  preferredExtension?: string;
  namingBaseDir?: string;
  referenceType?: ImageReferenceType;
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

export type KeybindingCategory = 'formatting' | 'application';

export type KeybindingAction =
  | 'formatBold'
  | 'formatItalic'
  | 'formatInlineCode'
  | 'formatCodeBlock'
  | 'formatStrikethrough'
  | 'formatLink'
  | 'formatHeading1'
  | 'formatHeading2'
  | 'formatHeading3'
  | 'formatQuote'
  | 'formatBulletList'
  | 'formatNumberedList'
  | 'formatTaskList'
  | 'saveFile'
  | 'openFile'
  | 'openWorkspace'
  | 'toggleSidebar'
  | 'toggleToc'
  | 'searchWorkspace'
  | 'commandPalette'
  | 'toggleViewMode'
  | 'exportPdf';

export interface KeybindingDef {
  id: KeybindingAction;
  name: string;
  category: KeybindingCategory;
  defaultKey: string;
  description: string;
}

export type KeybindingsMap = Record<string, string>;

export interface Settings {
  imageDir: string;
  imageNamingBaseDir?: string; // Thư mục bắt đầu đặt tên ảnh (mặc định: workspace root)
  imageReferenceType?: ImageReferenceType; // 'relative' (mặc định) | 'absolute'
  theme: Theme;
  fontSize: number;
  autoSave: boolean;
  autoSaveDelay?: number; // in seconds, default: 2
  lineNumbers: boolean;
  wordWrap: boolean;
  keybindings?: KeybindingsMap; // Custom keyboard shortcuts mapping
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

export interface OpenTargetResult {
  workspacePath: string;
  relativeFilePath?: string | null;
  fileName?: string | null;
  isFile: boolean;
}

