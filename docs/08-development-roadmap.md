# Lộ trình phát triển

## Nguyên tắc

Roadmap ưu tiên hoàn thiện một core nhỏ nhưng ổn định trước khi thêm tính năng.

Không coi mọi ý tưởng tương lai là commitment.

## Phase 0 — Foundation

- [ ] Khởi tạo Tauri
- [ ] Khởi tạo React + TypeScript
- [ ] Thiết lập Rust backend
- [ ] Thiết lập IPC cơ bản
- [ ] Thiết lập cấu trúc source
- [ ] Thiết lập lint/format cơ bản

## Phase 1 — Workspace

- [ ] Open workspace
- [ ] File tree
- [ ] Open file
- [ ] Create file
- [ ] Create folder
- [ ] Rename
- [ ] Delete
- [ ] File watcher
- [ ] Xử lý conflict

## Phase 2 — Markdown

- [ ] CodeMirror
- [ ] Markdown parser
- [ ] Syntax highlighting
- [ ] Preview
- [ ] Editor/Preview/Split
- [ ] Save
- [ ] Tabs
- [ ] Unsaved state

## Phase 3 — Search

- [ ] Tích hợp `rg`
- [ ] Search UI
- [ ] Search result model
- [ ] Jump to line
- [ ] Highlight result
- [ ] Xử lý search không block UI

## Phase 4 — Image management

- [ ] Paste image
- [ ] Detect image data
- [ ] Image folder configuration
- [ ] Naming convention
- [ ] Image index
- [ ] Relative Markdown reference
- [ ] Rename Markdown → rename owned images
- [ ] Move Markdown → update image context
- [ ] Conflict handling

## Phase 5 — PDF

- [ ] Markdown → HTML
- [ ] CSS cho export
- [ ] HTML → PDF
- [ ] Export dialog
- [ ] Kiểm tra hình ảnh/relative path

## Phase 6 — UX polish

- [ ] Command palette
- [ ] Keyboard shortcuts
- [ ] Context menus
- [ ] Dark/light theme
- [ ] Settings
- [ ] Recent files
- [ ] UI performance tuning

## Phase 7 — Release

- [ ] Windows packaging
- [ ] Linux packaging nếu phù hợp
- [ ] macOS packaging nếu phù hợp
- [ ] README hoàn chỉnh
- [ ] Screenshots
- [ ] Demo GIF/video
- [ ] Release notes

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
