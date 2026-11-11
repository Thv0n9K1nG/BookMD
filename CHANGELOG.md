# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.13] - 2026-11-11

### Added
- **Integrated Backup Tool (`BackupModal`) for Maximum Data Safety**:
  - Added a dedicated, full-featured Backup Tool to safeguard notes and code against accidental loss, filesystem corruption, or unintentional deletions.
  - **3 Backup Scopes**:
    1. **Toàn bộ Workspace**: Safely clones the entire active workspace directory.
    2. **Thư mục tùy chọn**: Pick any folder inside or outside the workspace via native folder dialog.
    3. **File tùy chọn**: Pick any single markdown document or technical note (defaults to the currently active file).
  - **Flexible Destination Folder**: Choose any destination folder (local directory, external drive, or cloud sync folder) with automatic last-used path remembering.
  - **Smart Name Collision Handling**:
    - `auto_rename` (Default & Recommended): Automatically appends incrementing numbers `(1)`, `(2)` if an item with the same name already exists in the destination, completely preventing data loss.
    - `timestamp`: Automatically appends ISO-like timestamps `_YYYYMMDD_HHMMSS`.
    - `overwrite`: Explicitly allows replacing older copies if desired.
  - **Recursive Loop Guard**: Backend strictly verifies that the destination folder is not inside the source directory being copied, preventing infinite recursive expansion.
  - **Fast Build Exclusions**: Automatically skips heavy build directories (`node_modules`, `target`, `dist`, `.git`, `venv`, etc.) by default for instant backups.
  - **Instant Verification**: Completed backups provide a 1-click "Mở thư mục sao lưu" button (reveals in OS Explorer) and "Sao chép đường dẫn".
- **Unified "Tools" Header Dropdown Menu (`ToolsDropdown`)**:
  - Replaced the single "Xuất PDF" button in the titlebar with an extensible **Tools (Công cụ)** dropdown menu.
  - Seamlessly houses both **Xuất PDF** and the new **Sao lưu Dữ liệu (Backup Tool)**.
  - Designed as an extensible dropdown component for easily incorporating future tools.

## [0.1.12] - 2026-11-11

### Added
- **Mandatory User Confirmation Modal for File & Folder Deletion**:
  - Introduced a dedicated, high-visibility `ConfirmDeleteModal` for all delete operations across the application, completely replacing browser-native dialogs.
  - Fail-safe design: The "Hủy bỏ" (Cancel) button is focused by default on modal display, ensuring that accidental `Enter` or `Space` keypresses safely dismiss the prompt without deleting anything.
  - `Escape` key and outside clicks safely cancel immediately.
  - Shows clear item metadata: type icon (file or directory), complete relative path, and folder-specific warnings when deleting directories.
  - Reassurance notice: Informs users that deleted items are safely moved to the OS Recycle Bin (`Thùng rác hệ thống`) via `trash::delete`, allowing full restoration if needed.

### Fixed
- **Fixed File & Folder Disappearing Bug in On-Demand Lazy Directory Expansion**:
  - Resolved an issue where expanded directories in the sidebar file explorer suddenly collapsed or lost their child contents when interacting with files externally (e.g. in Windows Explorer, Git commands) or during document auto-saves.
  - Root cause: Filesystem watcher events (`fs-change`) previously reloaded the workspace using a shallow 1-depth tree, wiping out in-memory children for subdirectories at depth $\ge 2$.
  - Implemented `mergeTreePreservingChildren` algorithm: seamlessly preserves all previously loaded child branches while incorporating updated filesystem changes.
  - Automated re-hydration: Background refreshes automatically re-read child entries for all actively expanded folders (`expandedFoldersRef`).
  - Auto-healing lazy loader: If an expanded folder has unpopulated children, it triggers an on-demand background read without collapsing the folder.
  - Workspace expansion persistence: The list of expanded folder paths is persisted in `localStorage` per workspace, restoring tree state upon reopening.

## [0.1.11] - 2026-11-09

### Fixed
- **Instant Workspace Opening & Lazy Directory Expansion (Critical Fix for Large Projects)**:
  - Fixed a critical performance issue where opening large workspaces containing deep directories or massive numbers of files (e.g. decompiled APKs, JREs, build artifacts, dataset folders) caused BookMD to freeze ("Not Responding") for 10+ minutes with 10% CPU usage.
  - Replaced unbounded recursive filesystem traversal with **On-Demand Lazy Directory Expansion**: opening a workspace now scans only the top level and immediate subfolders in **1 to 5 milliseconds**.
  - Subdirectories are loaded asynchronously on-demand (`directory_read`) only when clicked/expanded in the file tree, mirroring the architecture of VS Code.
  - Added comprehensive ignore filters for heavy non-source directories (`node_modules`, `target`, `dist`, `build`, `out`, `bin`, `obj`, `venv`, `.venv`, `__pycache__`, `.gradle`, `.idea`, `.vscode`, etc.) across tree scanning, filesystem watcher events, and search indexing.
  - Added safety limits of 2,000 entries per directory and 15,000 files per search to guarantee zero freezing on any disk structure.

## [0.1.10] - 2026-11-09

### Added
- **Mermaid.js Diagram Rendering**:
  - Full native rendering for ```` ```mermaid ```` code blocks into interactive vector SVG diagrams directly in the Markdown preview pane.
  - Supports flowcharts (`graph TD` / `flowchart LR`), sequence diagrams, state diagrams, class diagrams, entity-relationship diagrams, Gantt charts, git graphs, and mindmaps.
  - Zero-latency, flicker-free image and diagram reconciliation using `morphdom` (unchanged Mermaid diagrams remain cached in memory during typing elsewhere in the document).
  - Theme-aware styling: automatically syncs diagram theme between dark and light modes.
  - Right-click context menu and one-click copy button on diagrams to copy raw Mermaid source code.
  - Seamless PDF export: Mermaid diagrams render directly into sharp vector SVGs during print / PDF generation.
- **Preserved Rich Formatting in Pasted Table Cells**:
  - Table paste now faithfully preserves and translates all inline formatting inside table cells (`<th>` and `<td>`), including:
    - Bold (`<b>`, `<strong>`, `font-weight: bold / >= 600`) -> `**text**`
    - Italic (`<i>`, `<em>`, `font-style: italic`) -> `*text*`
    - Bold + Italic -> `***text***`
    - Inline code (`<code>`, `<kbd>`, `<tt>`) -> `` `text` ``
    - Links (`<a href="...">`) -> `[text](url)`
    - Strikethrough (`<s>`, `<del>`, `<strike>`) -> `~~text~~`
    - Line breaks (`<br>`) and paragraphs (`<p>`, `<div>`) separated cleanly
    - Automatic escaping of pipe symbols `|` inside cell text or code (`\|`) to prevent breaking Markdown table columns.

## [0.1.9] - 2026-11-01

### Added
- **Full Rich-Text to Markdown Clipboard Paste**:
  - Automatically converts rich HTML clipboard data from browsers, Word, Google Docs, Notion, and web pages into clean Markdown.
  - Full support for bold (`**text**`), italic (`*text*`), inline code (``code``), code blocks (```lang), blockquotes (`> `), headings (`#` to `######`), text links (`[text](url)`), ordered & unordered lists (with nested levels), strikethrough (`~~text~~`), and tables.
  - Smart VS Code clipboard detection preserves raw code snippets without unwanted token parsing.
- **Collapsible & Refined Settings Hints**:
  - Redesigned image handling settings annotations into clean, compact descriptions with interactive collapsible callouts ("Xem chi tiết cách hoạt động").
  - Clear visual demarcation for session-scoped lifetime and document-local defaults without visual clutter.

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
