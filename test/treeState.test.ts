import { describe, it, expect } from 'vitest';
import {
  mergeTreePreservingChildren,
  attachChildrenToPath,
} from '../src/utils/treeState';
import { FileEntry } from '../src/types';

describe('Tree State Preservation & Lazy Loading', () => {
  it('preserves already-loaded children when receiving a new shallow tree from backend', () => {
    // Existing tree with folder "Project/15apk" expanded and children loaded
    const oldTree: FileEntry[] = [
      {
        name: 'Project',
        relativePath: 'Project',
        kind: 'directory',
        children: [
          {
            name: '15apk',
            relativePath: 'Project/15apk',
            kind: 'directory',
            children: [
              {
                name: 'report.md',
                relativePath: 'Project/15apk/report.md',
                kind: 'file',
              },
              {
                name: 'Workspace',
                relativePath: 'Project/15apk/Workspace',
                kind: 'directory',
                children: [
                  {
                    name: 'summary.txt',
                    relativePath: 'Project/15apk/Workspace/summary.txt',
                    kind: 'file',
                  },
                ],
              },
            ],
          },
          {
            name: 'Notes.md',
            relativePath: 'Project/Notes.md',
            kind: 'file',
          },
        ],
      },
    ];

    // Newly fetched shallow tree from backend where deeper folders have children: undefined / None
    const newShallowTree: FileEntry[] = [
      {
        name: 'Project',
        relativePath: 'Project',
        kind: 'directory',
        children: [
          {
            name: '15apk',
            relativePath: 'Project/15apk',
            kind: 'directory',
            // Backend returned None / undefined for depth 2
          },
          {
            name: 'Notes.md',
            relativePath: 'Project/Notes.md',
            kind: 'file',
          },
          {
            name: 'NewFile.md',
            relativePath: 'Project/NewFile.md',
            kind: 'file',
          },
        ],
      },
    ];

    const merged = mergeTreePreservingChildren(newShallowTree, oldTree);

    // Verify root is still Project
    expect(merged).toHaveLength(1);
    const project = merged[0];
    expect(project.children).toHaveLength(3);

    // Verify new file was added
    expect(project.children?.find((c) => c.name === 'NewFile.md')).toBeDefined();

    // Crucial: Verify 15apk DID NOT lose its children!
    const apkFolder = project.children?.find((c) => c.name === '15apk');
    expect(apkFolder?.children).toBeDefined();
    expect(apkFolder?.children).toHaveLength(2);
    expect(apkFolder?.children?.find((c) => c.name === 'report.md')).toBeDefined();

    // Crucial: Verify Workspace deeper children are also preserved!
    const wsFolder = apkFolder?.children?.find((c) => c.name === 'Workspace');
    expect(wsFolder?.children).toHaveLength(1);
    expect(wsFolder?.children?.[0].name).toBe('summary.txt');
  });

  it('correctly attaches children to a target directory path', () => {
    const tree: FileEntry[] = [
      {
        name: 'docs',
        relativePath: 'docs',
        kind: 'directory',
      },
    ];

    const children: FileEntry[] = [
      {
        name: 'guide.md',
        relativePath: 'docs/guide.md',
        kind: 'file',
      },
    ];

    const updated = attachChildrenToPath(tree, 'docs', children);
    expect(updated[0].children).toHaveLength(1);
    expect(updated[0].children?.[0].name).toBe('guide.md');
  });
});

