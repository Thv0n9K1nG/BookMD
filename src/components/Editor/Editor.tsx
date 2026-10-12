import React, { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { saveImage } from '../../services/ipc';
import { Theme, Settings } from '../../types';

interface EditorProps {
  content: string;
  relativePath: string;
  theme: Theme;
  settings: Settings;
  targetLine?: number;
  onChange: (value: string) => void;
  onSave: () => void;
  onCursorChange?: (line: number, col: number) => void;
  onToast?: (msg: string, type?: 'info' | 'success' | 'error') => void;
  onImagePasted?: (imageRelativePath: string) => void;
}

export const Editor: React.FC<EditorProps> = ({
  content,
  relativePath,
  theme,
  settings,
  targetLine,
  onChange,
  onSave,
  onCursorChange,
  onToast,
  onImagePasted,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  // Use refs for settings and callbacks so event handlers always have fresh values without re-creating EditorView
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const onToastRef = useRef(onToast);
  onToastRef.current = onToast;

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const onImagePastedRef = useRef(onImagePasted);
  onImagePastedRef.current = onImagePasted;

  // CodeMirror Compartments for dynamic reconfiguration of theme, line numbers, word wrap
  const themeCompartment = useRef(new Compartment());
  const lineNumbersCompartment = useRef(new Compartment());
  const wordWrapCompartment = useRef(new Compartment());

  // Custom Dark / Light CodeMirror Theme
  const getThemeExtension = (currentTheme: Theme, fontSize: number) => {
    const isDark = currentTheme === 'dark';
    return EditorView.theme({
      '&': {
        height: '100%',
        fontSize: `${fontSize}px`,
        backgroundColor: isDark ? 'var(--bg-editor)' : 'var(--bg-primary)',
        color: isDark ? 'var(--text-primary)' : '#1e293b',
      },
      '.cm-scroller': {
        fontFamily: 'var(--font-mono)',
        lineHeight: '1.6',
      },
      '.cm-content': {
        caretColor: 'var(--accent)',
        padding: '12px 16px',
      },
      '.cm-gutters': {
        backgroundColor: isDark ? 'var(--bg-editor)' : 'var(--bg-secondary)',
        color: 'var(--text-tertiary)',
        borderRight: '1px solid var(--border-primary)',
        paddingLeft: '4px',
      },
      '.cm-activeLineGutter': {
        backgroundColor: isDark ? 'var(--bg-hover)' : 'rgba(99, 102, 241, 0.08)',
        color: 'var(--text-accent)',
      },
      '.cm-activeLine': {
        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.04)' : 'rgba(99, 102, 241, 0.03)',
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: 'var(--accent)',
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.25) !important' : 'rgba(99, 102, 241, 0.2) !important',
      },
    });
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data:image/...;base64,
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Paste handler for automatic image management
    const pasteHandler = EditorView.domEventHandlers({
      paste: (event, view) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (!file) continue;

            event.preventDefault();
            fileToBase64(file).then(async (base64) => {
              try {
                // Read the latest imageDir directly from settingsRef to avoid stale closures
                const currentImageDir = settingsRef.current.imageDir;
                const res = await saveImage(relativePath, base64, {
                  imageDir: currentImageDir,
                });

                // Insert markdown image reference at cursor
                const selection = view.state.selection.main;
                const refText = res.markdownReference || `![${res.filename}](${res.relativePath})`;

                view.dispatch({
                  changes: {
                    from: selection.from,
                    to: selection.to,
                    insert: refText,
                  },
                  selection: { anchor: selection.from + refText.length },
                });

                onToastRef.current?.(`Đã lưu ảnh: ${res.filename}`, 'success');

                // Notify parent to refresh the workspace file tree and auto-expand the image folder
                onImagePastedRef.current?.(res.relativePath);
              } catch (err: any) {
                console.error('Save image error:', err);
                onToastRef.current?.(`Lỗi lưu ảnh: ${err?.message || err}`, 'error');
              }
            });
            return true;
          }
        }
        return false;
      },
    });

    const startState = EditorState.create({
      doc: content,
      extensions: [
        lineNumbersCompartment.current.of(settings.lineNumbers ? lineNumbers() : []),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        markdown(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        themeCompartment.current.of(getThemeExtension(theme, settings.fontSize)),
        wordWrapCompartment.current.of(settings.wordWrap ? EditorView.lineWrapping : []),
        pasteHandler,
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          {
            key: 'Mod-s',
            run: () => {
              onSaveRef.current();
              return true;
            },
          },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newDoc = update.state.doc.toString();
            contentRef.current = newDoc;
            onChange(newDoc);
          }
          if (update.selectionSet || update.docChanged) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            onCursorChange?.(line.number, pos - line.from + 1);
          }
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [relativePath]);

  // Dynamically reconfigure theme and font size without recreating EditorView
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: themeCompartment.current.reconfigure(getThemeExtension(theme, settings.fontSize)),
      });
    }
  }, [theme, settings.fontSize]);

  // Dynamically reconfigure line numbers and word wrap
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: [
          lineNumbersCompartment.current.reconfigure(settings.lineNumbers ? lineNumbers() : []),
          wordWrapCompartment.current.reconfigure(settings.wordWrap ? EditorView.lineWrapping : []),
        ],
      });
    }
  }, [settings.lineNumbers, settings.wordWrap]);

  // Sync external content update if doc changed from outside (e.g. file switched)
  useEffect(() => {
    const view = viewRef.current;
    if (view && content !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
    }
  }, [content]);

  // Jump to target line if provided (e.g. from search navigation)
  useEffect(() => {
    if (targetLine && targetLine > 0 && viewRef.current) {
      const view = viewRef.current;
      const totalLines = view.state.doc.lines;
      const validLine = Math.min(Math.max(1, targetLine), totalLines);
      const line = view.state.doc.line(validLine);
      view.dispatch({
        selection: { anchor: line.from },
        scrollIntoView: true,
      });
      view.focus();
    }
  }, [targetLine]);

  return <div className="editor-pane" ref={containerRef} />;
};
