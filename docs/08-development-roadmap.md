# Lộ trình phát triển

## Nguyên tắc

Roadmap ưu tiên hoàn thiện một core nhỏ nhưng ổn định trước khi thêm tính năng.

Không coi mọi ý tưởng tương lai là commitment.

## Phase 0 — Foundation

- [x] Khởi tạo Tauri
- [x] Khởi tạo React + TypeScript
- [x] Thiết lập Rust backend
- [x] Thiết lập IPC cơ bản
- [x] Thiết lập cấu trúc source
- [x] Thiết lập lint/format cơ bản

## Phase 1 — Workspace

- [x] Open workspace
- [x] File tree
- [x] Open file
- [x] Create file
- [x] Create folder
- [x] Rename
- [x] Delete
- [x] File watcher
- [x] Xử lý conflict

## Phase 2 — Markdown

- [x] CodeMirror
- [x] Markdown parser
- [x] Syntax highlighting
- [x] Preview
- [x] Editor/Preview/Split
- [x] Save
- [x] Tabs
- [x] Unsaved state

## Phase 3 — Search

- [x] Tích hợp `rg`
- [x] Search UI
- [x] Search result model
- [x] Jump to line
- [x] Highlight result
- [x] Xử lý search không block UI

## Phase 4 — Image management

- [x] Paste image
- [x] Detect image data
- [x] Image folder configuration
- [x] Naming convention
- [x] Image index
- [x] Relative Markdown reference
- [x] Rename Markdown → rename owned images
- [x] Move Markdown → update image context
- [x] Conflict handling

## Phase 5 — PDF

- [x] Markdown → HTML
- [x] CSS cho export
- [x] HTML → PDF
- [x] Export dialog
- [x] Kiểm tra hình ảnh/relative path

## Phase 6 — UX polish

- [x] Command palette
- [x] Keyboard shortcuts
- [x] Context menus
- [x] Dark/light theme
- [x] Settings
- [x] Recent files
- [x] UI performance tuning

## Phase 7 — Release

- [x] Windows packaging
- [x] Linux packaging nếu phù hợp
- [x] macOS packaging nếu phù hợp
- [x] README hoàn chỉnh
- [x] Screenshots
- [x] Demo GIF/video
- [x] Release notes

## Ngoài roadmap ban đầu

Các ý tưởng sau chỉ được xem xét khi core đã ổn định:

- backlinks;
- wikilinks;
- tags;
- metadata indexing;
- graph;
- plugin system;
- AI;
- cloud sync;
- collaboration.

Không thêm các tính năng này chỉ để tăng số lượng feature.
