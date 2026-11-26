import { describe, it, expect } from 'vitest';
import {
  normalizeWorkspacePath,
  isSameWorkspace,
  isPathInsideWorkspace,
  findTabForWorkspace,
} from '../src/utils/tabUtils';
import { OpenTab } from '../src/types';

describe('Workspace & Tab Isolation Utilities', () => {
  it('normalizes Windows verbatim prefixes, slashes, trailing slashes, and casing', () => {
    expect(normalizeWorkspacePath('\\\\?\\C:\\Users\\test\\')).toBe('c:/users/test');
    expect(normalizeWorkspacePath('c:/Users/Test')).toBe('c:/users/test');
  });

  it('distinguishes different workspaces that share the exact same folder name', () => {
    expect(isSameWorkspace('D:/work/test', 'D:/backup/test')).toBe(false);
    expect(isSameWorkspace('\\\\?\\D:\\work\\test', 'd:/work/test/')).toBe(true);
  });

  it('checks workspace path boundaries accurately without sibling folder false positives', () => {
    expect(isPathInsideWorkspace('C:/work/test/test1/readme.md', 'C:/work/test')).toBe(true);
    expect(isPathInsideWorkspace('C:/work/test2/test1/readme.md', 'C:/work/test')).toBe(false);
  });

  it('prevents cross-workspace tab collision when relativePath matches across identically named workspaces', () => {
    const tabsFromOldWorkspace: OpenTab[] = [
      {
        relativePath: 'test1/readme.md',
        workspacePath: 'D:/work/test',
        name: 'readme.md',
        content: '# Old Test Content',
        savedContent: '# Old Test Content',
        isDirty: false,
      },
    ];

    // Switching to another workspace named "test" with identical relativePath must NOT match old tab
    const hitInNewWs = findTabForWorkspace(
      tabsFromOldWorkspace,
      'test1/readme.md',
      'D:/backup/test'
    );
    expect(hitInNewWs).toBeUndefined();

    // Same workspace (even with Windows verbatim \\?\ prefix) matches cleanly
    const hitInSameWs = findTabForWorkspace(
      tabsFromOldWorkspace,
      'test1/readme.md',
      '\\\\?\\D:\\work\\test'
    );
    expect(hitInSameWs).toBeDefined();
    expect(hitInSameWs?.content).toBe('# Old Test Content');
  });
});
