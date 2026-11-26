import { describe, it, expect, beforeEach } from 'vitest';
import {
  makeFileSessionKey,
  getFileSessionState,
  saveEditorSessionState,
  renameFileSessionState,
  clampSelectionToDoc,
  clearAllFileSessionStates,
} from '../src/utils/editorSession';

describe('Editor Session Cursor & Scroll Persistence', () => {
  beforeEach(() => {
    clearAllFileSessionStates();
  });

  it('persists cursor position and scroll offsets independently per file during a session', () => {
    saveEditorSessionState('notes/a.md', 'C:/Work/Docs', {
      anchor: 1450,
      head: 1450,
      line: 42,
      col: 18,
      editorScrollTop: 920,
      previewScrollTop: 780,
    });

    saveEditorSessionState('notes/b.md', 'C:/Work/Docs', {
      anchor: 310,
      head: 325,
      line: 9,
      col: 12,
      editorScrollTop: 140,
    });

    const stateA = getFileSessionState('notes/a.md', 'C:/Work/Docs');
    const stateB = getFileSessionState('notes/b.md', 'C:/Work/Docs');

    expect(stateA).toEqual({
      anchor: 1450,
      head: 1450,
      line: 42,
      col: 18,
      editorScrollTop: 920,
      previewScrollTop: 780,
    });
    expect(stateB?.anchor).toBe(310);
    expect(stateB?.head).toBe(325);
    expect(stateB?.line).toBe(9);
    expect(stateB?.editorScrollTop).toBe(140);
  });

  it('isolates session positions across identically named workspaces with same relative file paths', () => {
    saveEditorSessionState('test1/readme.md', 'D:/work/test', {
      anchor: 500,
      head: 500,
      line: 20,
      col: 5,
      editorScrollTop: 600,
    });

    saveEditorSessionState('test1/readme.md', 'D:/backup/test', {
      anchor: 40,
      head: 40,
      line: 2,
      col: 3,
      editorScrollTop: 0,
    });

    expect(makeFileSessionKey('test1/readme.md', '\\\\?\\D:\\work\\test')).toBe('d:/work/test::test1/readme.md');
    expect(getFileSessionState('test1/readme.md', 'D:/work/test')?.line).toBe(20);
    expect(getFileSessionState('test1/readme.md', 'D:/backup/test')?.line).toBe(2);
  });

  it('partially updates editorScrollTop without clobbering existing cursor position', () => {
    saveEditorSessionState('README.md', 'C:/Repo', {
      anchor: 800,
      head: 800,
      line: 30,
      col: 7,
      editorScrollTop: 400,
    });

    saveEditorSessionState('README.md', 'C:/Repo', {
      editorScrollTop: 1250,
    });

    const updated = getFileSessionState('README.md', 'C:/Repo');
    expect(updated?.anchor).toBe(800);
    expect(updated?.line).toBe(30);
    expect(updated?.editorScrollTop).toBe(1250);
  });

  it('transfers session state cleanly when renaming a file', () => {
    saveEditorSessionState('old_note.md', 'C:/Repo', {
      anchor: 220,
      head: 220,
      line: 11,
      col: 4,
      editorScrollTop: 300,
      previewScrollTop: 210,
    });

    renameFileSessionState('old_note.md', 'folder/new_note.md', 'C:/Repo');

    expect(getFileSessionState('old_note.md', 'C:/Repo')).toBeUndefined();
    const moved = getFileSessionState('folder/new_note.md', 'C:/Repo');
    expect(moved?.line).toBe(11);
    expect(moved?.editorScrollTop).toBe(300);
    expect(moved?.previewScrollTop).toBe(210);
  });

  it('clamps saved selection offsets safely within shorter modified document bounds', () => {
    expect(clampSelectionToDoc(100, 500, 520)).toEqual({ anchor: 100, head: 100 });
    expect(clampSelectionToDoc(0, -10, 50)).toEqual({ anchor: 0, head: 0 });
    expect(clampSelectionToDoc(200, 45.8, NaN)).toEqual({ anchor: 45, head: 0 });
  });
});
