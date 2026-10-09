# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
