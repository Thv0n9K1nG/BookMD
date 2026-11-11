import { FileEntry } from '../types';

/**
 * Merges a newly fetched root tree with an existing tree,
 * preserving any already-loaded `children` arrays so that
 * expanded subdirectories never lose their contents during background
 * refreshes (such as watcher events or auto-saves).
 */
export function mergeTreePreservingChildren(
  newTree: FileEntry[],
  oldTree: FileEntry[]
): FileEntry[] {
  // Collect a map of relativePath -> existing children from oldTree
  const oldChildrenMap = new Map<string, FileEntry[]>();

  const collectOldChildren = (nodes: FileEntry[]) => {
    for (const node of nodes) {
      if (node.kind === 'directory' && Array.isArray(node.children)) {
        oldChildrenMap.set(node.relativePath, node.children);
        collectOldChildren(node.children);
      }
    }
  };
  collectOldChildren(oldTree);

  // Recursively apply to newTree
  const applyChildren = (nodes: FileEntry[]): FileEntry[] => {
    return nodes.map((node) => {
      if (node.kind !== 'directory') {
        return node;
      }

      const existingChildren = oldChildrenMap.get(node.relativePath);

      // If new node already has children (e.g. from initial depth 1),
      // recursively merge them with any deeper children from old tree!
      if (Array.isArray(node.children) && node.children.length > 0) {
        const merged = existingChildren
          ? mergeTreePreservingChildren(node.children, existingChildren)
          : applyChildren(node.children);
        return { ...node, children: merged };
      }

      // If new node had no children (None from shallow backend read),
      // but old tree already had loaded children, preserve them!
      if (existingChildren) {
        return {
          ...node,
          children: applyChildren(existingChildren),
        };
      }

      return node;
    });
  };

  return applyChildren(newTree);
}

/**
 * Immutably attaches children to a specific directory path in the tree.
 */
export function attachChildrenToPath(
  nodes: FileEntry[],
  targetPath: string,
  children: FileEntry[]
): FileEntry[] {
  return nodes.map((node) => {
    if (node.relativePath === targetPath) {
      return { ...node, children };
    }
    if (node.children) {
      return { ...node, children: attachChildrenToPath(node.children, targetPath, children) };
    }
    return node;
  });
}

/**
 * Retrieves persisted expanded folder set for a workspace.
 */
export function loadPersistedExpandedFolders(workspacePath: string): Set<string> {
  const defaultSet = new Set(['TryHackMe', 'images', 'assets', 'img']);
  if (!workspacePath) return defaultSet;

  try {
    const raw = localStorage.getItem(`bookmd_expanded_${workspacePath}`);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  return defaultSet;
}

/**
 * Saves expanded folder set for a workspace.
 */
export function savePersistedExpandedFolders(
  workspacePath: string,
  expandedFolders: Set<string>
): void {
  if (!workspacePath) return;
  try {
    localStorage.setItem(
      `bookmd_expanded_${workspacePath}`,
      JSON.stringify(Array.from(expandedFolders))
    );
  } catch {
    // Ignore storage quota errors
  }
}
