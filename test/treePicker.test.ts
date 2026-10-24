import { describe, it, expect } from 'vitest';
import { buildDirectoryTree } from '../src/components/Settings/ImageFolderPickerModal';
import { FileEntry } from '../src/types';

describe('buildDirectoryTree', () => {
  it('extracts directories only while preserving nesting hierarchy', () => {
    const rawTree: FileEntry[] = [
      {
        name: 'README.md',
        relativePath: 'README.md',
        kind: 'file',
      },
      {
        name: 'assets',
        relativePath: 'assets',
        kind: 'directory',
        children: [
          {
            name: 'logo.png',
            relativePath: 'assets/logo.png',
            kind: 'file',
          },
          {
            name: 'images',
            relativePath: 'assets/images',
            kind: 'directory',
            children: [
              {
                name: 'screenshot.png',
                relativePath: 'assets/images/screenshot.png',
                kind: 'file',
              },
            ],
          },
        ],
      },
      {
        name: 'TryHackMe',
        relativePath: 'TryHackMe',
        kind: 'directory',
        children: [
          {
            name: 'Docker',
            relativePath: 'TryHackMe/Docker',
            kind: 'directory',
            children: [
              {
                name: 'note.md',
                relativePath: 'TryHackMe/Docker/note.md',
                kind: 'file',
              },
            ],
          },
        ],
      },
    ];

    const dirTree = buildDirectoryTree(rawTree);
    expect(dirTree).toHaveLength(2);
    expect(dirTree[0].name).toBe('assets');
    expect(dirTree[0].children).toHaveLength(1);
    expect(dirTree[0].children[0].name).toBe('images');
    expect(dirTree[0].children[0].children).toHaveLength(0); // Files filtered out

    expect(dirTree[1].name).toBe('TryHackMe');
    expect(dirTree[1].children).toHaveLength(1);
    expect(dirTree[1].children[0].name).toBe('Docker');
    expect(dirTree[1].children[0].relativePath).toBe('TryHackMe/Docker');
  });
});
