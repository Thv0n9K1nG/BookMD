import { EditorView } from '@codemirror/view';
import { KeybindingAction, KeybindingDef, KeybindingsMap } from '../types';

export const KEYBINDING_DEFINITIONS: KeybindingDef[] = [
  // Formatting Actions
  {
    id: 'formatBold',
    name: 'In đậm (Bold)',
    category: 'formatting',
    defaultKey: 'Ctrl+B',
    description: 'Bọc đoạn văn bản đã chọn trong dấu **in đậm**',
  },
  {
    id: 'formatItalic',
    name: 'In nghiêng (Italic)',
    category: 'formatting',
    defaultKey: 'Ctrl+I',
    description: 'Bọc đoạn văn bản đã chọn trong dấu *in nghiêng*',
  },
  {
    id: 'formatInlineCode',
    name: 'Mã nội dòng (Inline Code)',
    category: 'formatting',
    defaultKey: 'Ctrl+`',
    description: 'Bọc đoạn văn bản trong dấu `inline code`',
  },
  {
    id: 'formatCodeBlock',
    name: 'Khối mã nguồn (Code Block)',
    category: 'formatting',
    defaultKey: 'Ctrl+Shift+C',
    description: 'Chèn khối mã nguồn đa dòng ```...```',
  },
  {
    id: 'formatStrikethrough',
    name: 'Gạch ngang chữ (Strikethrough)',
    category: 'formatting',
    defaultKey: 'Ctrl+Shift+X',
    description: 'Bọc đoạn văn bản trong dấu ~~gạch ngang~~',
  },
  {
    id: 'formatLink',
    name: 'Chèn liên kết (Link)',
    category: 'formatting',
    defaultKey: 'Ctrl+K',
    description: 'Chèn cú pháp siêu liên kết [văn bản](url)',
  },
  {
    id: 'formatHeading1',
    name: 'Tiêu đề H1 (#)',
    category: 'formatting',
    defaultKey: 'Ctrl+1',
    description: 'Đặt dòng hiện tại thành tiêu đề cấp 1 (# )',
  },
  {
    id: 'formatHeading2',
    name: 'Tiêu đề H2 (##)',
    category: 'formatting',
    defaultKey: 'Ctrl+2',
    description: 'Đặt dòng hiện tại thành tiêu đề cấp 2 (## )',
  },
  {
    id: 'formatHeading3',
    name: 'Tiêu đề H3 (###)',
    category: 'formatting',
    defaultKey: 'Ctrl+3',
    description: 'Đặt dòng hiện tại thành tiêu đề cấp 3 (### )',
  },
  {
    id: 'formatQuote',
    name: 'Khối trích dẫn (Blockquote)',
    category: 'formatting',
    defaultKey: 'Ctrl+Shift+Q',
    description: 'Đặt dòng hiện tại thành khối trích dẫn (> )',
  },
  {
    id: 'formatBulletList',
    name: 'Danh sách dấu đầu dòng',
    category: 'formatting',
    defaultKey: 'Ctrl+Shift+U',
    description: 'Tạo hoặc hủy danh sách gạch đầu dòng (- )',
  },
  {
    id: 'formatNumberedList',
    name: 'Danh sách đánh số',
    category: 'formatting',
    defaultKey: 'Ctrl+Shift+O',
    description: 'Tạo hoặc hủy danh sách đánh số thứ tự (1. )',
  },
  {
    id: 'formatTaskList',
    name: 'Danh sách công việc (Checkbox)',
    category: 'formatting',
    defaultKey: 'Ctrl+Shift+T',
    description: 'Tạo hoặc hủy danh sách việc cần làm (- [ ] )',
  },

  // Application & Navigation Actions
  {
    id: 'saveFile',
    name: 'Lưu tài liệu hiện tại',
    category: 'application',
    defaultKey: 'Ctrl+S',
    description: 'Lưu nhanh tài liệu đang mở vào ổ đĩa',
  },
  {
    id: 'openFile',
    name: 'Mở file Markdown đơn',
    category: 'application',
    defaultKey: 'Ctrl+O',
    description: 'Chọn và mở một file .md trực tiếp từ máy tính',
  },
  {
    id: 'openWorkspace',
    name: 'Mở thư mục Workspace',
    category: 'application',
    defaultKey: 'Ctrl+Shift+W',
    description: 'Mở thư mục làm việc để quản lý danh sách ghi chú',
  },
  {
    id: 'toggleSidebar',
    name: 'Đóng/mở thanh bên trái',
    category: 'application',
    defaultKey: 'Ctrl+Shift+B',
    description: 'Thu gọn hoặc mở rộng khung danh sách thư mục và file',
  },
  {
    id: 'toggleToc',
    name: 'Bật/tắt tab Mục lục (TOC)',
    category: 'application',
    defaultKey: 'Ctrl+Shift+M',
    description: 'Chuyển đổi giữa danh sách file và mục lục tiêu đề',
  },
  {
    id: 'searchWorkspace',
    name: 'Tìm kiếm toàn bộ Workspace',
    category: 'application',
    defaultKey: 'Ctrl+Shift+F',
    description: 'Mở cửa sổ tìm kiếm từ khóa trong mọi file',
  },
  {
    id: 'commandPalette',
    name: 'Bảng lệnh nhanh (Command Palette)',
    category: 'application',
    defaultKey: 'Ctrl+Shift+P',
    description: 'Mở danh sách mọi lệnh tắt và hành động của BookMD',
  },
  {
    id: 'toggleViewMode',
    name: 'Chuyển chế độ xem (Editor/Split/Preview)',
    category: 'application',
    defaultKey: 'Ctrl+\\',
    description: 'Chuyển đổi tuần tự giữa Soạn thảo, Song song và Xem trước',
  },
  {
    id: 'exportPdf',
    name: 'Xuất tài liệu sang PDF A4',
    category: 'application',
    defaultKey: 'Ctrl+Shift+E',
    description: 'Xuất nội dung ghi chú ra file PDF hoặc in A4 chuẩn',
  },
];

export const DEFAULT_KEYBINDINGS_MAP: KeybindingsMap = KEYBINDING_DEFINITIONS.reduce(
  (acc, def) => {
    acc[def.id] = def.defaultKey;
    return acc;
  },
  {} as KeybindingsMap
);

export function getKeybinding(action: KeybindingAction, customMap?: KeybindingsMap): string {
  if (customMap && customMap[action]) {
    return customMap[action];
  }
  return DEFAULT_KEYBINDINGS_MAP[action] || '';
}

/**
 * Formats a KeyboardEvent into a canonical combination string like "Ctrl+B", "Ctrl+`", "Ctrl+Shift+P".
 */
export function formatKeyEvent(e: KeyboardEvent | React.KeyboardEvent): string {
  const parts: string[] = [];

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const isCtrl = isMac ? e.metaKey || e.ctrlKey : e.ctrlKey || e.metaKey;

  if (isCtrl) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  let key = e.key;

  // Ignore bare modifier key presses
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    return '';
  }

  // Handle special and symbol keys
  if (key === ' ' || e.code === 'Space') {
    key = 'Space';
  } else if (key === '`' || e.code === 'Backquote') {
    key = '`';
  } else if (key === '\\' || e.code === 'Backslash') {
    key = '\\';
  } else if (key === '/' || e.code === 'Slash') {
    key = '/';
  } else if (key.length === 1) {
    key = key.toUpperCase();
  }

  parts.push(key);
  return parts.join('+');
}

/**
 * Checks if a KeyboardEvent matches a shortcut string (e.g. "Ctrl+B", "Ctrl+`", "Ctrl+Shift+P").
 */
export function matchKeybinding(
  e: KeyboardEvent | React.KeyboardEvent,
  targetShortcut?: string
): boolean {
  if (!targetShortcut) return false;

  const parts = targetShortcut.split('+').map((p) => p.trim());
  const hasCtrl = parts.includes('Ctrl') || parts.includes('Cmd') || parts.includes('Mod');
  const hasAlt = parts.includes('Alt');
  const hasShift = parts.includes('Shift');
  const targetKey = parts.find(
    (p) => !['Ctrl', 'Cmd', 'Mod', 'Alt', 'Shift'].includes(p)
  );

  if (!targetKey) return false;

  const isCtrlPressed = e.ctrlKey || e.metaKey;
  if (hasCtrl !== isCtrlPressed) return false;
  if (hasAlt !== Boolean(e.altKey)) return false;
  if (hasShift !== Boolean(e.shiftKey)) return false;

  const eventKey = e.key;
  if (targetKey === '`') {
    return eventKey === '`' || e.code === 'Backquote' || eventKey === '~';
  }
  if (targetKey === '\\') {
    return eventKey === '\\' || e.code === 'Backslash' || eventKey === '|';
  }
  if (targetKey === 'Space') {
    return eventKey === ' ' || e.code === 'Space';
  }

  return eventKey.toLowerCase() === targetKey.toLowerCase();
}

/**
 * Executes a Markdown formatting action on the current CodeMirror editor selection.
 */
export function executeFormattingCommand(
  view: EditorView,
  action: KeybindingAction
): boolean {
  const state = view.state;
  const selection = state.selection.main;
  const from = selection.from;
  const to = selection.to;
  const selectedText = state.sliceDoc(from, to);

  switch (action) {
    case 'formatBold': {
      if (selectedText.startsWith('**') && selectedText.endsWith('**') && selectedText.length >= 4) {
        // Unwrap
        const inner = selectedText.slice(2, -2);
        view.dispatch({
          changes: { from, to, insert: inner },
          selection: { anchor: from, head: from + inner.length },
        });
      } else if (from === to) {
        // Cursor only: insert **** and place cursor inside
        view.dispatch({
          changes: { from, insert: '****' },
          selection: { anchor: from + 2 },
        });
      } else {
        // Wrap
        view.dispatch({
          changes: { from, to, insert: `**${selectedText}**` },
          selection: { anchor: from, head: to + 4 },
        });
      }
      return true;
    }

    case 'formatItalic': {
      if (selectedText.startsWith('*') && selectedText.endsWith('*') && selectedText.length >= 2 && !selectedText.startsWith('**')) {
        const inner = selectedText.slice(1, -1);
        view.dispatch({
          changes: { from, to, insert: inner },
          selection: { anchor: from, head: from + inner.length },
        });
      } else if (from === to) {
        view.dispatch({
          changes: { from, insert: '**' },
          selection: { anchor: from + 1 },
        });
      } else {
        view.dispatch({
          changes: { from, to, insert: `*${selectedText}*` },
          selection: { anchor: from, head: to + 2 },
        });
      }
      return true;
    }

    case 'formatInlineCode': {
      if (selectedText.startsWith('`') && selectedText.endsWith('`') && selectedText.length >= 2) {
        const inner = selectedText.slice(1, -1);
        view.dispatch({
          changes: { from, to, insert: inner },
          selection: { anchor: from, head: from + inner.length },
        });
      } else if (from === to) {
        view.dispatch({
          changes: { from, insert: '``' },
          selection: { anchor: from + 1 },
        });
      } else {
        view.dispatch({
          changes: { from, to, insert: `\`${selectedText}\`` },
          selection: { anchor: from, head: to + 2 },
        });
      }
      return true;
    }

    case 'formatStrikethrough': {
      if (selectedText.startsWith('~~') && selectedText.endsWith('~~') && selectedText.length >= 4) {
        const inner = selectedText.slice(2, -2);
        view.dispatch({
          changes: { from, to, insert: inner },
          selection: { anchor: from, head: from + inner.length },
        });
      } else if (from === to) {
        view.dispatch({
          changes: { from, insert: '~~~~' },
          selection: { anchor: from + 2 },
        });
      } else {
        view.dispatch({
          changes: { from, to, insert: `~~${selectedText}~~` },
          selection: { anchor: from, head: to + 4 },
        });
      }
      return true;
    }

    case 'formatCodeBlock': {
      if (from === to) {
        view.dispatch({
          changes: { from, insert: '\n```\n\n```\n' },
          selection: { anchor: from + 5 },
        });
      } else {
        const block = `\n\`\`\`\n${selectedText}\n\`\`\`\n`;
        view.dispatch({
          changes: { from, to, insert: block },
          selection: { anchor: from, head: from + block.length },
        });
      }
      return true;
    }

    case 'formatLink': {
      if (from === to) {
        view.dispatch({
          changes: { from, insert: '[](url)' },
          selection: { anchor: from + 1 },
        });
      } else {
        const link = `[${selectedText}](url)`;
        view.dispatch({
          changes: { from, to, insert: link },
          // Highlight 'url' part so user can type URL immediately
          selection: { anchor: from + selectedText.length + 3, head: from + link.length - 1 },
        });
      }
      return true;
    }

    case 'formatHeading1':
    case 'formatHeading2':
    case 'formatHeading3': {
      const level = action === 'formatHeading1' ? 1 : action === 'formatHeading2' ? 2 : 3;
      const prefix = '#'.repeat(level) + ' ';

      const startLine = state.doc.lineAt(from);
      const endLine = state.doc.lineAt(to);
      const changes: { from: number; to: number; insert: string }[] = [];

      for (let l = startLine.number; l <= endLine.number; l++) {
        const line = state.doc.line(l);
        const text = line.text;
        const match = text.match(/^(#{1,6}\s+)/);

        if (match) {
          if (match[1] === prefix) {
            // Remove heading
            changes.push({ from: line.from, to: line.from + match[1].length, insert: '' });
          } else {
            // Replace level
            changes.push({ from: line.from, to: line.from + match[1].length, insert: prefix });
          }
        } else {
          // Add heading
          changes.push({ from: line.from, to: line.from, insert: prefix });
        }
      }

      view.dispatch({ changes });
      return true;
    }

    case 'formatQuote': {
      const startLine = state.doc.lineAt(from);
      const endLine = state.doc.lineAt(to);
      const changes: { from: number; to: number; insert: string }[] = [];

      for (let l = startLine.number; l <= endLine.number; l++) {
        const line = state.doc.line(l);
        if (line.text.startsWith('> ')) {
          changes.push({ from: line.from, to: line.from + 2, insert: '' });
        } else {
          changes.push({ from: line.from, to: line.from, insert: '> ' });
        }
      }

      view.dispatch({ changes });
      return true;
    }

    case 'formatBulletList': {
      const startLine = state.doc.lineAt(from);
      const endLine = state.doc.lineAt(to);
      const changes: { from: number; to: number; insert: string }[] = [];

      for (let l = startLine.number; l <= endLine.number; l++) {
        const line = state.doc.line(l);
        if (line.text.startsWith('- ') || line.text.startsWith('* ')) {
          changes.push({ from: line.from, to: line.from + 2, insert: '' });
        } else {
          changes.push({ from: line.from, to: line.from, insert: '- ' });
        }
      }

      view.dispatch({ changes });
      return true;
    }

    case 'formatNumberedList': {
      const startLine = state.doc.lineAt(from);
      const endLine = state.doc.lineAt(to);
      const changes: { from: number; to: number; insert: string }[] = [];
      let counter = 1;

      for (let l = startLine.number; l <= endLine.number; l++) {
        const line = state.doc.line(l);
        const match = line.text.match(/^(\d+\.\s+)/);
        if (match) {
          changes.push({ from: line.from, to: line.from + match[1].length, insert: '' });
        } else {
          changes.push({ from: line.from, to: line.from, insert: `${counter}. ` });
          counter++;
        }
      }

      view.dispatch({ changes });
      return true;
    }

    case 'formatTaskList': {
      const startLine = state.doc.lineAt(from);
      const endLine = state.doc.lineAt(to);
      const changes: { from: number; to: number; insert: string }[] = [];

      for (let l = startLine.number; l <= endLine.number; l++) {
        const line = state.doc.line(l);
        if (line.text.startsWith('- [ ] ') || line.text.startsWith('- [x] ') || line.text.startsWith('- [X] ')) {
          changes.push({ from: line.from, to: line.from + 6, insert: '' });
        } else if (line.text.startsWith('- ')) {
          changes.push({ from: line.from, to: line.from + 2, insert: '- [ ] ' });
        } else {
          changes.push({ from: line.from, to: line.from, insert: '- [ ] ' });
        }
      }

      view.dispatch({ changes });
      return true;
    }

    default:
      return false;
  }
}
