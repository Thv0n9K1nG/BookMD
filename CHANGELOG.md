# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.8] - 2026-10-31

### Added
- **Dedicated Open Workspace Button**:
  - Added an intuitive "Mở thư mục / Workspace..." button (`FolderOpenIcon`) in the top titlebar directly next to the "Mở file Markdown..." button.
- **Smart Table Paste to Markdown**:
  - Automatically detects tabular clipboard data from web pages, Microsoft Excel, Google Sheets, Microsoft Word, or TSV data.
  - Surgically converts tables into clean GitHub-flavored Markdown tables.
  - Plain-text extraction within table cells prevents unwanted conversion of rich text elements (bold, italic, etc.).
- **Status Bar App Version Display**:
  - Added current app version badge (e.g. `v0.1.8`) permanently visible at the bottom right corner of the status bar.

### Changed
- **Default Image Naming Based on Active Markdown File**:
  - Image naming base directory setting now defaults directly to the active Markdown file being written (`<tên_file>_<số>.png`) without prepending workspace parent folders.
  - Preserved option to select workspace root (`/`) or specific parent directories when full folder context prefixing is needed.

## [0.1.7] - 2026-10-30

### Added
- **Editor Tab & Indentation**:
  - Full keyboard `Tab` and `Shift+Tab` indentation support in CodeMirror 6 editor.
  - Multi-line block indentation, single-line paragraph indent ("thụt đầu dòng"), and in-text tab spacing without losing focus.
- **Markdown Footnotes Support**:
  - Native rendering of Markdown footnotes (`[^1]` and `[^1]: Footnote text`) via `markdown-it-footnote`.
  - Seamless in-document bidirectional jumping between footnote references and footnote items with smooth scrolling.
  - Dedicated footnote styling for dark mode, light mode, and high-fidelity PDF export.

### Changed
- **Session-Scoped Image Directory & Naming Base Settings**:
  - Image directory and naming base directory settings are now session-scoped and automatically reset upon opening a new workspace or launching a new session.
  - Default image destination changed from workspace-root `assets/images` to `images/` placed directly inside the folder of the active Markdown file being edited.
  - Updated Settings UI annotations and placeholders to clearly explain session-scoped behaviors.
- **Italic Formatting Keybinding**:
  - Default shortcut updated to `Ctrl+Shift+I` to avoid browser/webview accelerator conflicts, while retaining `Ctrl+I` fallback.

## [0.1.6] - 2026-10-27

### Added
- **KaTeX LaTeX Math Expressions**:
  - Full support for inline `$math$` and display block `$$\nmath\n$$` formulas.
  - Offline, high-performance KaTeX styling in both live preview and PDF export.
- **Unicode & Vietnamese Diacritic Anchor Links**:
  - Unicode-aware slug generation (`\p{L}\p{N}`) preserving Vietnamese accented letters (`ô`, `ơ`, `ư`, `á`, `đ`, etc.).
  - Multi-strategy anchor lookup supporting URI-encoded and unaccented fallback matches.

### Fixed
- **Image Re-rendering & Flashing**:
  - Replaced destructive preview DOM replacements with `morphdom` reconciliation.
  - Image nodes (`<img>`) with identical sources are preserved intact in memory while typing in the editor, completely eliminating flicker and jitter.

## [0.1.0] - 2026-10-09

### Added
- **Core Backend (Tauri v2 + Rust)**:
  - Workspace management (`open_workspace`, `get_workspace_tree`).
  - File operations (`read_file`, `write_file`, `create_file`, `rename_file`, `delete_file`).
  - Real-time filesystem watcher (`notify` crate) with 300ms debouncing.
  - Full-text search engine powered by `grep-searcher` and `grep-regex` (ripgrep algorithms).
  - Image paste handler (`save_pasted_image`) with SHA-256 deduplication and slugged naming.
  - Image document rename sync (`rename_images_for_document`).
  - PDF export pipeline with custom print layout styles.
- **Frontend Workspace (React 19 + TypeScript + Vite)**:
  - Workspace sidebar with tree explorer and collapse/expand controls.
  - Multi-tab management with unsaved status indicators.
  - CodeMirror 6 markdown editor with syntax highlighting, search/replace, line numbers, and active line.
  - Live split-view & preview renderer with markdown-it GFM styling.
  - Workspace search modal (`Ctrl+K`) with instant file jumping.
  - Command palette (`Ctrl+P`) with fuzzy command search.
  - Context menus on files and directories.
  - Dark and Light themes with settings persistence.
  - Toast notification system and status bar.
- **Packaging & CI/CD**:
  - Tauri bundle configurations for Windows (NSIS, MSI), Linux (deb, AppImage), and macOS (dmg).
  - GitHub Actions release pipeline (`.github/workflows/release.yml`).
  - GitHub Actions CI validation pipeline (`.github/workflows/ci.yml`).
  - Complete project documentation and UI screenshots.
