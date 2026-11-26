import { normalizeWorkspacePath } from './tabUtils';

export interface FileSessionState {
  anchor: number;
  head: number;
  line: number;
  col: number;
  editorScrollTop: number;
  previewScrollTop: number;
}

const sessionStore = new Map<string, FileSessionState>();

/**
 * Builds a unique session key combining normalized workspace path and file relative path,
 * ensuring per-file state never collides across identically named workspaces.
 */
export function makeFileSessionKey(
  relativePath: string,
  workspacePath?: string | null
): string {
  const normWs = normalizeWorkspacePath(workspacePath);
  const normRel = (relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  return `${normWs}::${normRel}`;
}

/**
 * Clamps saved CodeMirror selection offsets safely within the current document length.
 */
export function clampSelectionToDoc(
  docLength: number,
  anchor: number,
  head: number
): { anchor: number; head: number } {
  const safeMax = Math.max(0, docLength);
  const clamp = (val: number) => {
    if (!Number.isFinite(val)) return 0;
    return Math.min(safeMax, Math.max(0, Math.trunc(val)));
  };
  return {
    anchor: clamp(anchor),
    head: clamp(head),
  };
}

/**
 * Retrieves the remembered session state (cursor + scroll offsets) for a file within this app session.
 */
export function getFileSessionState(
  relativePath: string,
  workspacePath?: string | null
): FileSessionState | undefined {
  if (!relativePath) return undefined;
  return sessionStore.get(makeFileSessionKey(relativePath, workspacePath));
}

/**
 * Updates remembered cursor and/or scroll offsets for a file in the current session.
 */
export function saveEditorSessionState(
  relativePath: string,
  workspacePath: string | undefined | null,
  partial: Partial<FileSessionState>
): void {
  if (!relativePath) return;
  const key = makeFileSessionKey(relativePath, workspacePath);
  const existing = sessionStore.get(key) || {
    anchor: 0,
    head: 0,
    line: 1,
    col: 1,
    editorScrollTop: 0,
    previewScrollTop: 0,
  };
  sessionStore.set(key, {
    ...existing,
    ...partial,
  });
}

/**
 * Transfers remembered session state when a file is renamed within the workspace.
 */
export function renameFileSessionState(
  oldRelativePath: string,
  newRelativePath: string,
  workspacePath?: string | null
): void {
  if (!oldRelativePath || !newRelativePath) return;
  const oldKey = makeFileSessionKey(oldRelativePath, workspacePath);
  const existing = sessionStore.get(oldKey);
  if (existing) {
    sessionStore.set(makeFileSessionKey(newRelativePath, workspacePath), existing);
    sessionStore.delete(oldKey);
  }
}

/**
 * Clears all in-memory session cursor/scroll states (useful for tests or explicit resets).
 */
export function clearAllFileSessionStates(): void {
  sessionStore.clear();
}
