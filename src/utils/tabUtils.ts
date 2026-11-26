import { OpenTab } from '../types';

/**
 * Normalizes a workspace directory path for reliable equality checks across OS path formats
 * (e.g. stripping Windows \\?\ verbatim prefixes, unifying slashes, trimming trailing slashes).
 */
export function normalizeWorkspacePath(path?: string | null): string {
  if (!path) return '';
  return path
    .trim()
    .replace(/^\\\\\?\\/, '')
    .replace(/^\/\/\?\//, '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
    .toLowerCase();
}

/**
 * Checks whether two workspace paths point to the same directory.
 */
export function isSameWorkspace(pathA?: string | null, pathB?: string | null): boolean {
  const a = normalizeWorkspacePath(pathA);
  const b = normalizeWorkspacePath(pathB);
  return a.length > 0 && a === b;
}

/**
 * Checks whether a target file or folder path lies inside a workspace directory.
 */
export function isPathInsideWorkspace(targetPath?: string | null, workspacePath?: string | null): boolean {
  const target = normalizeWorkspacePath(targetPath);
  const ws = normalizeWorkspacePath(workspacePath);
  if (!target || !ws) return false;
  return target === ws || target.startsWith(`${ws}/`);
}

/**
 * Finds an existing tab matching both relativePath and active workspacePath,
 * preventing cross-workspace tab collisions when two workspaces share identical folder names/structures.
 */
export function findTabForWorkspace(
  tabs: OpenTab[],
  relativePath: string,
  workspacePath?: string | null
): OpenTab | undefined {
  const normTargetWs = normalizeWorkspacePath(workspacePath);
  return tabs.find((tab) => {
    if (tab.relativePath !== relativePath) return false;
    const normTabWs = normalizeWorkspacePath(tab.workspacePath);
    if (!normTargetWs && !normTabWs) return true;
    return normTabWs === normTargetWs;
  });
}
