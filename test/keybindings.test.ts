import { describe, it, expect } from 'vitest';
import {
  formatKeyEvent,
  matchKeybinding,
  getKeybinding,
  DEFAULT_KEYBINDINGS_MAP,
  KEYBINDING_DEFINITIONS,
} from '../src/utils/keybindings';

describe('keybindings utility', () => {
  it('formats KeyboardEvents accurately into canonical shortcut strings', () => {
    // Ctrl+B (Bold)
    const eventCtrlB = {
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      key: 'b',
      code: 'KeyB',
    } as unknown as KeyboardEvent;
    expect(formatKeyEvent(eventCtrlB)).toBe('Ctrl+B');

    // Ctrl+` (Inline code)
    const eventCtrlBackquote = {
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      key: '`',
      code: 'Backquote',
    } as unknown as KeyboardEvent;
    expect(formatKeyEvent(eventCtrlBackquote)).toBe('Ctrl+`');

    // Ctrl+Shift+C (Code block)
    const eventCtrlShiftC = {
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: true,
      key: 'C',
      code: 'KeyC',
    } as unknown as KeyboardEvent;
    expect(formatKeyEvent(eventCtrlShiftC)).toBe('Ctrl+Shift+C');

    // Ignore bare modifier keys
    const eventCtrlOnly = {
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      key: 'Control',
      code: 'ControlLeft',
    } as unknown as KeyboardEvent;
    expect(formatKeyEvent(eventCtrlOnly)).toBe('');
  });

  it('matches keyboard shortcuts with matchKeybinding', () => {
    // Match Ctrl+B
    const eventB = {
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      key: 'b',
      code: 'KeyB',
    } as unknown as KeyboardEvent;
    expect(matchKeybinding(eventB, 'Ctrl+B')).toBe(true);
    expect(matchKeybinding(eventB, 'Ctrl+I')).toBe(false);
    expect(matchKeybinding(eventB, 'Ctrl+Shift+B')).toBe(false);

    // Match Ctrl+`
    const eventBackquote = {
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      key: '`',
      code: 'Backquote',
    } as unknown as KeyboardEvent;
    expect(matchKeybinding(eventBackquote, 'Ctrl+`')).toBe(true);

    // Match Ctrl+\
    const eventBackslash = {
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      key: '\\',
      code: 'Backslash',
    } as unknown as KeyboardEvent;
    expect(matchKeybinding(eventBackslash, 'Ctrl+\\')).toBe(true);

    // Match on macOS using metaKey (Cmd)
    const eventMacCmdS = {
      ctrlKey: false,
      metaKey: true,
      altKey: false,
      shiftKey: false,
      key: 's',
      code: 'KeyS',
    } as unknown as KeyboardEvent;
    expect(matchKeybinding(eventMacCmdS, 'Ctrl+S')).toBe(true);
  });

  it('retrieves default or custom keybindings with getKeybinding', () => {
    expect(getKeybinding('formatBold')).toBe('Ctrl+B');
    expect(getKeybinding('formatItalic')).toBe('Ctrl+Shift+I');
    expect(getKeybinding('formatInlineCode')).toBe('Ctrl+`');
    expect(getKeybinding('saveFile')).toBe('Ctrl+S');
    expect(getKeybinding('toggleSidebar')).toBe('Ctrl+Shift+B');

    // Custom map override
    const customMap = {
      formatBold: 'Ctrl+Alt+B',
      formatInlineCode: 'Ctrl+Shift+`',
    };
    expect(getKeybinding('formatBold', customMap)).toBe('Ctrl+Alt+B');
    expect(getKeybinding('formatInlineCode', customMap)).toBe('Ctrl+Shift+`');
    expect(getKeybinding('saveFile', customMap)).toBe('Ctrl+S');
  });

  it('has valid definitions for all actions', () => {
    expect(KEYBINDING_DEFINITIONS.length).toBeGreaterThanOrEqual(20);
    for (const def of KEYBINDING_DEFINITIONS) {
      expect(def.id).toBeTruthy();
      expect(def.name).toBeTruthy();
      expect(def.defaultKey).toBeTruthy();
      expect(DEFAULT_KEYBINDINGS_MAP[def.id]).toBe(def.defaultKey);
    }
  });
});
