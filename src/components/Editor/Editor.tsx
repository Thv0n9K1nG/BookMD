import React, { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentMore, indentLess } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { saveImage } from '../../services/ipc';
import {
  buildImageHtmlTag,
  cacheImageWidth,
  detectImageWidth,
  getCachedImageWidth,
  getImageNaturalWidth,
} from '../../utils/imagePath';
import { Theme, Settings, KeybindingAction, ViewMode } from '../../types';
import {
  getKeybinding,
  matchKeybinding,
  executeFormattingCommand,
} from '../../utils/keybindings';
import { tryParseClipboardRichText } from '../../utils/tablePaste';
import {
  hasSvgInClipboard,
  extractSvgFromClipboard,
  convertSvgXmlToPngBase64,
} from '../../utils/svgPaste';
import {
  getFileSessionState,
  saveEditorSessionState,
  clampSelectionToDoc,
} from '../../utils/editorSession';
import { useTranslation } from '../../i18n';

interface EditorProps {
  content: string;
  relativePath: string;
  workspacePath?: string;
  theme: Theme;
  settings: Settings;
  targetLine?: number;
  targetLineKey?: number;
  viewMode?: ViewMode;
  isActiveTab?: boolean;
  isVisible?: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onCursorChange?: (line: number, col: number) => void;
  onToast?: (msg: string, type?: 'info' | 'success' | 'error') => void;
  onImagePasted?: (imageRelativePath: string) => void;
}

export const Editor: React.FC<EditorProps> = ({
  content,
  relativePath,
  workspacePath,
  theme,
  settings,
  targetLine,
  targetLineKey,
  viewMode,
  isActiveTab = true,
  isVisible = true,
  onChange,
  onSave,
  onCursorChange,
  onToast,
  onImagePasted,
}) => {
  const { t } = useTranslation();
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const savedScrollTopRef = useRef<number>(0);
  const savedTopVisiblePosRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(isVisible);
  isVisibleRef.current = isVisible;
  const isActiveTabRef = useRef<boolean>(isActiveTab);
  isActiveTabRef.current = isActiveTab;
  const wasVisibleRef = useRef<boolean>(isVisible);
  const prevViewModeRef = useRef<ViewMode | undefined>(viewMode);
  const isRestoringScrollRef = useRef<boolean>(false);
  const isInitialMountRestoreRef = useRef<boolean>(true);
  const contentRef = useRef(content);
  contentRef.current = content;

  // Use refs for settings and callbacks so event handlers always have fresh values without re-creating EditorView
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const workspacePathRef = useRef(workspacePath);
  workspacePathRef.current = workspacePath;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;

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
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        // 1. Check if clipboard contains an SVG image (inline <svg>, HTML <img src="...svg">, or SVG file)
        if (hasSvgInClipboard(clipboardData)) {
          event.preventDefault();

          // Provide immediate user feedback so editor does not appear frozen while fetching
          onToastRef.current?.(tRef.current('editor.svgDownloading'), 'info');

          extractSvgFromClipboard(clipboardData).then(async (svgXml) => {
            if (!svgXml) {
              onToastRef.current?.(tRef.current('editor.svgExtractError'), 'error');
              return;
            }

            try {
              const { base64, naturalWidth } = await convertSvgXmlToPngBase64(svgXml);

              // Read image settings directly from settingsRef to avoid stale closures
              const currentImageDir = settingsRef.current.imageDir;
              const currentNamingBaseDir = settingsRef.current.imageNamingBaseDir;
              const currentReferenceType = settingsRef.current.imageReferenceType || 'relative';

              const res = await saveImage(relativePath, base64, {
                imageDir: currentImageDir,
                namingBaseDir: currentNamingBaseDir,
                referenceType: currentReferenceType,
              });

              if (naturalWidth) {
                cacheImageWidth(res.relativePath, naturalWidth);
              }

              // Insert HTML <img> tag: if referenceType is 'absolute', use full path, otherwise use docRelativePath
              const refSrc =
                currentReferenceType === 'absolute'
                  ? res.path.replace(/\\/g, '/')
                  : (res.docRelativePath || res.relativePath);

              const selection = view.state.selection.main;
              const refText = buildImageHtmlTag(refSrc, '', '', naturalWidth);

              view.dispatch({
                changes: {
                  from: selection.from,
                  to: selection.to,
                  insert: refText,
                },
                selection: { anchor: selection.from + refText.length },
              });

              onToastRef.current?.(tRef.current('editor.svgConverted', { filename: res.filename }), 'success');

              // Notify parent to refresh the workspace file tree and auto-expand the image folder
              onImagePastedRef.current?.(res.relativePath);
            } catch (err: any) {
              console.error('SVG paste convert error:', err);
              onToastRef.current?.(tRef.current('editor.svgError', { error: err?.message || err }), 'error');
            }
          });
          return true;
        }

        // 2. Normal bitmap image paste
        const items = clipboardData.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
              const file = item.getAsFile();
              if (!file) continue;

              event.preventDefault();
              const blobUrl = URL.createObjectURL(file);
              getImageNaturalWidth(blobUrl).then(async (naturalWidth) => {
                URL.revokeObjectURL(blobUrl);
                try {
                  // Read image settings directly from settingsRef to avoid stale closures
                  const currentImageDir = settingsRef.current.imageDir;
                  const currentNamingBaseDir = settingsRef.current.imageNamingBaseDir;
                  const currentReferenceType = settingsRef.current.imageReferenceType || 'relative';

                  const base64 = await fileToBase64(file);
                  const res = await saveImage(relativePath, base64, {
                    imageDir: currentImageDir,
                    namingBaseDir: currentNamingBaseDir,
                    referenceType: currentReferenceType,
                  });

                  if (naturalWidth) {
                    cacheImageWidth(res.relativePath, naturalWidth);
                  }

                  // Insert HTML <img> tag: if referenceType is 'absolute', use full path, otherwise use docRelativePath
                  const refSrc =
                    currentReferenceType === 'absolute'
                      ? res.path.replace(/\\/g, '/')
                      : (res.docRelativePath || res.relativePath);

                  const selection = view.state.selection.main;
                  const refText = buildImageHtmlTag(refSrc, '', '', naturalWidth);

                  view.dispatch({
                    changes: {
                      from: selection.from,
                      to: selection.to,
                      insert: refText,
                    },
                    selection: { anchor: selection.from + refText.length },
                  });

                  onToastRef.current?.(tRef.current('editor.imageSaved', { filename: res.filename }), 'success');

                  // Notify parent to refresh the workspace file tree and auto-expand the image folder
                  onImagePastedRef.current?.(res.relativePath);
                } catch (err: any) {
                  console.error('Save image error:', err);
                  onToastRef.current?.(tRef.current('editor.imageError', { error: err?.message || err }), 'error');
                }
              });
              return true;
            }
          }
        }

        // 3. Check for rich text or table paste (HTML tables, bold, italic, code, quotes, headings, links, lists)
        const parsed = tryParseClipboardRichText(clipboardData);
        if (parsed) {
          event.preventDefault();
          const selection = view.state.selection.main;
          view.dispatch({
            changes: {
              from: selection.from,
              to: selection.to,
              insert: parsed.markdown,
            },
            selection: { anchor: selection.from + parsed.markdown.length },
            userEvent: 'input.paste',
          });
          const toastMsg = parsed.isTable
            ? tRef.current('editor.tablePasted')
            : tRef.current('editor.richTextPasted');
          onToastRef.current?.(toastMsg, 'success');
          return true;
        }

        return false;
      },
    });

    // Auto-transform ![<text>](<image>) right before cursor when typing ')' into <img src="<image>" title="" alt="<text>" width="n"/>
    const tryTransformMarkdownImage = (view: EditorView, from: number, to: number): boolean => {
      const line = view.state.doc.lineAt(from);
      const textBefore = line.text.slice(0, from - line.from);
      const match = textBefore.match(/!\[([^\]]*)\]\(([^)]*)$/);
      if (!match) return false;

      const fullMatch = match[0];
      const altText = match[1];
      const rawSrc = match[2].trim().replace(/^<|>$/g, '');
      if (!rawSrc) return false;

      const matchStart = from - fullMatch.length;
      const cachedWidth = getCachedImageWidth(rawSrc);

      const tag = buildImageHtmlTag(rawSrc, altText, '', cachedWidth);

      view.dispatch({
        changes: {
          from: matchStart,
          to: to,
          insert: tag,
        },
        selection: { anchor: matchStart + tag.length },
      });

      // If width was not cached yet, asynchronously detect and inject width="n"
      if (!cachedWidth) {
        detectImageWidth(rawSrc, relativePath, workspacePathRef.current).then((detectedWidth) => {
          if (detectedWidth && viewRef.current) {
            const currentView = viewRef.current;
            const docText = currentView.state.doc.toString();
            const tagWithoutWidth = buildImageHtmlTag(rawSrc, altText, '', null);
            const tagWithWidth = buildImageHtmlTag(rawSrc, altText, '', detectedWidth);
            const idx = docText.indexOf(tagWithoutWidth);
            if (idx !== -1) {
              currentView.dispatch({
                changes: {
                  from: idx,
                  to: idx + tagWithoutWidth.length,
                  insert: tagWithWidth,
                },
              });
            }
          }
        });
      }

      return true;
    };

    const imageTransformHandler = EditorView.inputHandler.of((view, from, to, text) => {
      if (text === ')') {
        return tryTransformMarkdownImage(view, from, to);
      }
      return false;
    });

    const savedSession = getFileSessionState(relativePath, workspacePath);
    const initialSelection = savedSession
      ? clampSelectionToDoc(content.length, savedSession.anchor, savedSession.head)
      : { anchor: 0, head: 0 };

    const startState = EditorState.create({
      doc: content,
      selection: initialSelection,
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
        imageTransformHandler,
        EditorView.domEventHandlers({
          keydown: (e, view) => {
            const currentSettings = settingsRef.current;
            const keybindings = currentSettings?.keybindings;

            // Save shortcut
            const saveShortcut = getKeybinding('saveFile', keybindings);
            if (matchKeybinding(e, saveShortcut)) {
              e.preventDefault();
              e.stopPropagation();
              onSaveRef.current();
              return true;
            }

            // Formatting shortcuts
            const formattingActions: KeybindingAction[] = [
              'formatBold',
              'formatItalic',
              'formatInlineCode',
              'formatCodeBlock',
              'formatStrikethrough',
              'formatLink',
              'formatHeading1',
              'formatHeading2',
              'formatHeading3',
              'formatQuote',
              'formatBulletList',
              'formatNumberedList',
              'formatTaskList',
            ];

            for (const action of formattingActions) {
              const shortcut = getKeybinding(action, keybindings);
              if (shortcut && (matchKeybinding(e, shortcut) || (action === 'formatItalic' && matchKeybinding(e, 'Ctrl+I')))) {
                e.preventDefault();
                e.stopPropagation();
                return executeFormattingCommand(view, action);
              }
            }

            return false;
          },
        }),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          {
            key: 'Tab',
            run: (view) => {
              // If there is an active selection (multi-line or range), indent selected lines
              if (view.state.selection.ranges.some((r) => !r.empty)) {
                return indentMore(view);
              }
              const pos = view.state.selection.main.head;
              const line = view.state.doc.lineAt(pos);
              const textBefore = line.text.slice(0, pos - line.from);
              // If cursor is at start of line or in leading whitespace, indent the line
              if (/^\s*$/.test(textBefore)) {
                return indentMore(view);
              }
              // Otherwise, insert 2 spaces at cursor position
              view.dispatch(
                view.state.update(view.state.replaceSelection('  '), {
                  scrollIntoView: true,
                  userEvent: 'input',
                })
              );
              return true;
            },
            shift: indentLess,
          },
          {
            key: ')',
            run: (view) => {
              const selection = view.state.selection.main;
              if (selection.empty) {
                return tryTransformMarkdownImage(view, selection.from, selection.to);
              }
              return false;
            },
          },
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
            onChangeRef.current(newDoc);
          }
          if (update.selectionSet || update.docChanged) {
            const sel = update.state.selection.main;
            const line = update.state.doc.lineAt(sel.head);
            const col = sel.head - line.from + 1;
            if (isActiveTabRef.current) {
              onCursorChangeRef.current?.(line.number, col);
            }
            const topPos = isVisibleRef.current
              ? update.view.lineBlockAtHeight(update.view.scrollDOM.scrollTop).from
              : savedTopVisiblePosRef.current;
            if (isVisibleRef.current) {
              savedTopVisiblePosRef.current = topPos;
            }
            saveEditorSessionState(relativePath, workspacePath, {
              anchor: sel.anchor,
              head: sel.head,
              line: line.number,
              col,
              editorScrollTop: isVisibleRef.current
                ? update.view.scrollDOM.scrollTop
                : savedScrollTopRef.current,
              topVisiblePos: topPos,
            });
          }
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });

    viewRef.current = view;

    // Sync initial/restored cursor position immediately with StatusBar and Preview when active
    if (isActiveTabRef.current) {
      const restoredLine = startState.doc.lineAt(initialSelection.head);
      onCursorChangeRef.current?.(
        restoredLine.number,
        initialSelection.head - restoredLine.from + 1
      );
    }

    const restoredScroll = savedSession?.editorScrollTop || 0;
    const restoredTopPos = savedSession?.topVisiblePos || 0;
    savedScrollTopRef.current = restoredScroll;
    savedTopVisiblePosRef.current = restoredTopPos;
    isInitialMountRestoreRef.current = Boolean(savedSession);

    const scroller = view.scrollDOM;
    const handleScroll = () => {
      if (!isVisibleRef.current || isRestoringScrollRef.current) return;
      savedScrollTopRef.current = scroller.scrollTop;
      const topPos = view.lineBlockAtHeight(scroller.scrollTop).from;
      savedTopVisiblePosRef.current = topPos;
      saveEditorSessionState(relativePath, workspacePath, {
        editorScrollTop: scroller.scrollTop,
        topVisiblePos: topPos,
      });
    };
    scroller.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      const sel = view.state.selection.main;
      const line = view.state.doc.lineAt(sel.head);
      const topPos = isVisibleRef.current
        ? view.lineBlockAtHeight(scroller.scrollTop).from
        : savedTopVisiblePosRef.current;
      saveEditorSessionState(relativePath, workspacePath, {
        anchor: sel.anchor,
        head: sel.head,
        line: line.number,
        col: sel.head - line.from + 1,
        editorScrollTop: isVisibleRef.current ? scroller.scrollTop : savedScrollTopRef.current,
        topVisiblePos: topPos,
      });
      scroller.removeEventListener('scroll', handleScroll);
      view.destroy();
      viewRef.current = null;
    };
  }, [relativePath, workspacePath]);

  // Preserve & restore scroll/cursor seamlessly across tab activation and view mode changes
  useEffect(() => {
    const view = viewRef.current;
    const wasVisible = wasVisibleRef.current;
    const prevMode = prevViewModeRef.current;
    wasVisibleRef.current = isVisible;
    prevViewModeRef.current = viewMode;

    if (!view) return;

    if (!isVisible) {
      if (view.scrollDOM.scrollTop > 0) {
        savedScrollTopRef.current = view.scrollDOM.scrollTop;
      }
      if (view.hasFocus) {
        view.contentDOM.blur();
      }
      return;
    }

    // Always sync StatusBar / Preview line immediately when this tab becomes active
    if (isActiveTab) {
      const sel = view.state.selection.main;
      const line = view.state.doc.lineAt(sel.head);
      onCursorChangeRef.current?.(line.number, sel.head - line.from + 1);
    }

    const isFreshSessionRestore = isInitialMountRestoreRef.current;
    isInitialMountRestoreRef.current = false;

    // Width reflow happens only when toggling between full-width Editor and half-width Split
    const widthChanged =
      prevMode !== undefined &&
      prevMode !== viewMode &&
      (prevMode === 'editor' || viewMode === 'editor') &&
      (prevMode === 'split' || viewMode === 'split');

    const targetScroll = savedScrollTopRef.current;
    const targetTopPos = savedTopVisiblePosRef.current;
    const needsScrollRestore =
      isFreshSessionRestore ||
      widthChanged ||
      Math.abs(view.scrollDOM.scrollTop - targetScroll) > 2;

    if (!needsScrollRestore) {
      // Live tab switch in the same layout: scrollDOM already holds the exact measured pixel position!
      if (!wasVisible) {
        view.contentDOM.focus({ preventScroll: true });
      }
      return;
    }

    if (targetScroll <= 0 && targetTopPos <= 0) {
      if (!wasVisible) {
        view.contentDOM.focus({ preventScroll: true });
      }
      return;
    }

    let cancelled = false;
    isRestoringScrollRef.current = true;

    view.requestMeasure({
      read: () => view.scrollDOM?.clientHeight || 0,
      write: () => {
        if (cancelled || viewRef.current !== view || !view.scrollDOM || view.scrollDOM.clientHeight <= 0) {
          isRestoringScrollRef.current = false;
          return;
        }

        if (widthChanged && targetTopPos > 0 && targetTopPos <= view.state.doc.length) {
          view.dispatch({
            effects: EditorView.scrollIntoView(targetTopPos, { y: 'start' }),
          });
          savedScrollTopRef.current = view.scrollDOM.scrollTop;
        } else if (targetScroll > 0) {
          view.scrollDOM.scrollTop = targetScroll;
          // If reopening a closed tab with wrapped text, verify line anchor on next measure
          if (isFreshSessionRestore && targetTopPos > 0 && targetTopPos <= view.state.doc.length) {
            requestAnimationFrame(() => {
              if (!cancelled && viewRef.current === view && view.scrollDOM) {
                view.scrollDOM.scrollTop = targetScroll;
                isRestoringScrollRef.current = false;
              }
            });
            return;
          }
        }

        if (!wasVisible) {
          view.contentDOM.focus({ preventScroll: true });
        }
        isRestoringScrollRef.current = false;
      },
    });

    return () => {
      cancelled = true;
      isRestoringScrollRef.current = false;
    };
  }, [isVisible, isActiveTab, viewMode, relativePath, workspacePath]);

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

  // Sync external content update if doc changed from outside (e.g. image consolidation), preserving cursor
  useEffect(() => {
    const view = viewRef.current;
    if (view && content !== view.state.doc.toString()) {
      const prevSel = view.state.selection.main;
      const nextSel = clampSelectionToDoc(content.length, prevSel.anchor, prevSel.head);
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
        selection: nextSel,
      });
    }
  }, [content]);

  // Jump to target line if provided (e.g. from search navigation or TOC)
  useEffect(() => {
    if (targetLine && targetLine > 0 && viewRef.current) {
      const view = viewRef.current;
      const totalLines = view.state.doc.lines;
      const validLine = Math.min(Math.max(1, targetLine), totalLines);
      const line = view.state.doc.line(validLine);
      view.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
      });
      if (isVisibleRef.current) {
        view.focus();
      }
      requestAnimationFrame(() => {
        if (viewRef.current === view && view.scrollDOM && isVisibleRef.current) {
          savedScrollTopRef.current = view.scrollDOM.scrollTop;
          saveEditorSessionState(relativePath, workspacePath, {
            anchor: line.from,
            head: line.from,
            line: validLine,
            col: 1,
            editorScrollTop: view.scrollDOM.scrollTop,
          });
        }
      });
    }
  }, [targetLine, targetLineKey, relativePath, workspacePath]);

  return (
    <div
      className={`editor-pane ${isActiveTab ? 'tab-active' : 'tab-hidden'}`}
      aria-hidden={!isVisible}
      ref={containerRef}
    />
  );
};
