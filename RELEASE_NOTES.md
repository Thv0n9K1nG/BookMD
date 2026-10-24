# Release Notes — BookMD v0.1.5

**BookMD v0.1.5** introduces an interactive **Hierarchical Directory Tree Picker** for image folders, a comprehensive **Custom Keybinding System** with real-time shortcut recording, and fixes the Table of Contents navigation in Preview mode to preserve view mode while zooming to target sections.

---

## 🚀 What's New & Improvements (Changelog)

### 🌲 Interactive Hierarchical Directory Tree Picker
- **True Tree View Selection**: Replaced the previous flat list with an intuitive, expandable/collapsible directory tree structure.
- **Visual Depth & Controls**: Clearly displays nested folders with indentation, animated chevron toggles, subfolder count badges, and full path hints.
- **Smart Auto-Expansion & Search Filtering**: Searching folders in the tree automatically highlights matches and unfolds ancestor directories.
- **Bulk Navigation Controls**: Added "Mở rộng tất cả (Expand All)" and "Thu gọn (Collapse All)" actions to effortlessly browse deep workspace trees.
- **Dedicated Root Workspace Selector**: When selecting the image naming base directory, a dedicated Root node allows easily configuring naming to start from top-level workspace subfolders.
- **Subfolder Creator & Quick Presets**: Quickly create new subfolders directly in the tree view or jump using preset pills (`img`, `assets/images`, etc.).

### ⌨️ Comprehensive Keybinding Customization System
- **Dedicated Keybindings Tab**: Added a brand-new **"Phím tắt (Keybindings)"** tab in Settings with real-time search, category grouping, and reset buttons.
- **Markdown Formatting Shortcuts**:
  - **In đậm (Bold)**: `Ctrl+B` (wraps or unwraps `**...**`)
  - **Mã nội dòng (Inline Code)**: `Ctrl+\`` (wraps or unwraps `` `...` ``)
  - **In nghiêng (Italic)**: `Ctrl+I` (`*...*`)
  - **Khối mã nguồn (Code Block)**: `Ctrl+Shift+C` (```` ```...``` ````)
  - **Gạch ngang (Strikethrough)**: `Ctrl+Shift+X` (`~~...~~`)
  - **Chèn liên kết (Link)**: `Ctrl+K` (`[text](url)`)
  - **Tiêu đề (Headings H1-H3)**: `Ctrl+1`, `Ctrl+2`, `Ctrl+3`
  - **Khối trích dẫn (Blockquote)**: `Ctrl+Shift+Q` (`> `)
  - **Danh sách (Lists)**: Bullet (`Ctrl+Shift+U`), Numbered (`Ctrl+Shift+O`), Task List with checkboxes (`Ctrl+Shift+T`)
- **System & Navigation Shortcuts**:
  - **Lưu file**: `Ctrl+S`
  - **Mở file Markdown**: `Ctrl+O`
  - **Mở thư mục Workspace**: `Ctrl+Shift+W`
  - **Đóng/mở Sidebar**: `Ctrl+Shift+B` (moved from `Ctrl+B` to avoid conflict with Bold)
  - **Bật/tắt Mục lục (TOC)**: `Ctrl+Shift+M`
  - **Tìm kiếm Workspace**: `Ctrl+Shift+F`
  - **Bảng lệnh nhanh (Command Palette)**: `Ctrl+Shift+P`
  - **Chuyển chế độ xem (Editor/Split/Preview)**: `Ctrl+\`
  - **Xuất PDF A4**: `Ctrl+Shift+E`
- **Interactive Shortcut Recording**: Click on any shortcut badge, press your desired key combination, and BookMD instantly validates, maps, and persists it. Press `Escape` to cancel.
- **Dynamic Synchronization**: Customized keybindings immediately propagate across the CodeMirror editor, Command Palette badges, and global shortcuts.

### 🎯 Preview Mode Table of Contents (TOC) Navigation Fix
- **Preserved Preview View Mode**: Resolved the issue where clicking any heading in the TOC while in Preview mode forcefully switched the application into Split mode.
- **Smooth Section Scroll & Focus**: Navigating headings in Preview mode now remains strictly in Preview mode, smoothly scrolling to the header and illuminating it with active section zoom feedback.

---

# Release Notes — BookMD v0.1.4

**BookMD v0.1.4** delivers our signature, brand-defining **Advanced Image Handling System** with hierarchical hyphenated naming formulas, naming base directory selection, relative vs. absolute reference options, and a quick-access header button. It also brings full text selection & copy support in the Markdown Preview pane, balanced blockquote layout, and refined debounced auto-save controls.

---

## 🚀 What's New & Improvements (Changelog)

### 🖼️ Advanced Image Handling System (Signature Feature)
- **Hierarchical Hyphenated Naming Convention**:
  - Image assets are now systematically named using the clean, predictable formula:  
    `<subfolder>-<subfolder>-...-<document-name>_<index>.<extension>`
  - If a Markdown file is directly under the workspace or selected base folder, it cleanly names as:  
    `<document-name>_<index>.<extension>`
  - Image numbers strictly increment per document (`_1.png`, `_2.png`, etc.) avoiding collision across files.
- **Custom Naming Base Directory**:
  - Added a dedicated setting allowing users to select which folder hierarchy naming starts from downwards.
  - Ideal for monorepos or multi-topic workspaces (e.g., folders previously opened as standalone workspaces) where you want image names scoped under that sub-folder rather than the global workspace root.
- **Relative vs. Absolute Reference Syntax**:
  - Configurable in Settings: choose between **Relative Paths** (default, e.g. `../../assets/images/...`) for maximal portable markdown notes across GitHub/Obsidian/MarkText, or **Absolute Paths** (e.g. `C:/PROJECT/...`).
- **Dedicated Image Handling Titlebar Icon & Settings Tab**:
  - Added a dedicated **Image Handling** button (`ImageIcon`) right next to the Settings button in the top titlebar for instant 1-click access.
  - Reorganized the Settings Modal into clean tabs: **"Xử lý hình ảnh (Image Handling)"** and **"Cài đặt chung (General)"**, complete with interactive folder pickers, folder creation, and live naming formula demonstrations.

### 📝 Full Text Selection & Copy in Preview Pane
- **I-Beam Cursor & Native Text Selection**: Enabled `user-select: text` and `cursor: text` across all rendered markdown preview elements (headings, body paragraphs, tables, blockquotes, lists).
- **One-Click Code Block Copying**: Code fences now include a quick-copy icon button with visual confirmation.
- **Context Menu Integration**: Right-clicking selected text within the preview pane allows quick copying to the system clipboard.

### 💬 Refined Blockquote Callout Styling
- Fixed vertical alignment and text offset in Markdown blockquotes.
- Quote identifier bars and callout tags are cleanly proportioned and vertically centered, keeping focus directly on quoted text.

### ⚡ Debounced Auto-Save & Clean Notifications
- **Debounced Auto-Save Engine**: Auto-save now operates on a reliable debounce timer, eliminating rapid-fire saves during fast typing.
- **Configurable Auto-Save Interval**: Added customizable auto-save interval settings in milliseconds.
- **Single Save Notification**: Eliminated duplicate "Lưu file thành công" toast notifications when saving manually (`Ctrl+S`).

---

# Release Notes — BookMD v0.1.3

**BookMD v0.1.3** introduces seamless single-file opening via Windows Explorer and CLI, native multithreaded workspace search with 3-line context snippets, smart image dimensions on paste and auto-transformation, a dedicated New Folder button with custom Prompt modals, and isolated A4 PDF export with UI cleanups.

---

## 🚀 What's New & Bug Fixes (Changelog)

### 📄 Seamless Single-File Opening & Single-Instance Coordination
- **File Association & CLI Launch**: Resolved the issue where double-clicking a `.md` file in Windows Explorer or launching via command line (`bookmd path/to/file.md`) would ignore the target file and open the previously stored workspace. BookMD now detects launch arguments immediately and opens the requested document.
- **Smart Workspace Adoption**: Opening a document outside the active workspace automatically sets its parent directory as the workspace root. Sibling notes and relative image folders (`assets/`, `img/`) work right out of the box. If the file already belongs to the current workspace, it opens directly into a new tab without reloading the tree.
- **Single-Instance IPC Coordination**: Integrated `tauri-plugin-single-instance`. Launching a document while BookMD is already running automatically focuses the existing window and opens the file in a new tab without creating duplicate app processes.
- **Drag & Drop Support**: Drag and drop any `.md` file onto the BookMD window to open it instantly.
- **Dedicated Open File Actions**: Added `Ctrl+O` keyboard shortcut, top titlebar button, Command Palette command, and Welcome screen buttons for opening single Markdown files.

### 🔎 Native Ripgrep Workspace Search with 3-Line Context
- **Rust-Powered Fast Search**: High-performance multi-threaded text search across the entire workspace.
- **3-Line Context Snippets**: Search results display total matches and are organized per file, showing 1 line before, the matching line with highlighted search keywords, and 1 line after.
- **Smooth Modal Scrolling**: Fixed search result scrolling container height, mousewheel event forwarding, persistent custom scrollbars, and keyboard arrow navigation.

### 🖼️ Natural Image Dimensions & Markdown Syntax Auto-Transform
- **Auto-Measured Width on Paste**: Pasting images from clipboard saves the asset and generates standard `<img src="..." title="" alt="" width="N"/>` tags with the image's natural dimensions automatically computed.
- **Instant Syntax Transformation**: Typing markdown image syntax `![alt](url)` automatically converts into clean `<img .../>` tags as soon as the closing parenthesis `)` is completed.

### 📁 Sidebar Enhancements & Modern Prompt Modals
- **Dedicated New Folder Button**: Added a dedicated "New Folder" button alongside "New File" in the FileTree toolbar.
- **Custom `PromptModal` UI**: Replaced native browser `window.prompt()` popups with a modern, glassmorphic modal dialog with OS filename validation (preventing forbidden characters `< > : " / \ | ? *`), smart filename selection excluding `.md` extensions, and Enter/Esc keyboard shortcuts.
- **Full Sidebar Collapse (0px)**: Removed duplicate sidebar collapse buttons. Toggling sidebar (`Ctrl+B` or top-left titlebar button) now completely collapses the sidebar to 0px width, maximizing editor and preview space.

### 🖨️ Isolated A4 PDF Export & Cancel Fix
- **Isolated Iframe Printing**: Documents are rendered into a dedicated, print-optimized A4 layout inside an isolated iframe, ensuring zero BookMD IDE chrome appears in the printed PDF. Full support for Vietnamese UTF-8 typography, code blocks, tables, and images.
- **Cancel Dialog Fix**: Fixed an issue where canceling the print dialog required pressing Cancel twice due to uncancelled fallback timers. Printing is now strictly guarded to trigger once.

---

# Release Notes — BookMD v0.1.2

**BookMD v0.1.2** introduces synchronized split-mode zoom & focus, secure external link handling via the OS default browser, and eliminates initial workspace load errors on fresh installations.

---

## 🚀 What's New & Bug Fixes (Changelog)

### 🧭 Resilient Workspace Startup & Clean Onboarding
- **Zero-Error First Launch**: Removed hardcoded developer workspace paths that previously triggered `FILE NOT FOUND (os error 2)` alerts on machines without `c:\PROJECT\BookMD`.
- **Smart Workspace Persistence**: Persists the active workspace path in `localStorage` and smoothly restores it on startup. If a previously opened folder was moved or deleted, BookMD gracefully resets and shows the Welcome screen without popping up alarming error toasts.
- **Clean Fallback Prompts**: Cleaned up internal dialog fallbacks to prevent pre-filling local paths.

### 🌐 Secure External Link Delegation (No WebView Hijacking)
- **Default OS Browser Delegation**: Fixed a critical WebView behavior where clicking markdown or HTML links (`http://`, `https://`, `mailto:`, `tel:`) would navigate the app WebView itself away to that website. External links now open seamlessly in your system's default browser (Chrome, Edge, Firefox, etc.) via `@tauri-apps/plugin-opener`.
- **In-Document Heading Jump**: Clicking anchor links (`#section-anchor`) smoothly scrolls to the exact heading within the preview pane. Headings automatically receive normalized anchor slug IDs.
- **Relative Document Navigation**: Clicking relative links pointing to other markdown files (e.g., `[Overview](guide.md)`) automatically opens them into an active editor tab.

### 🔍 Split-Mode Synchronized Focus & Section Zoom
- **Source-Line Mapping**: Markdown block tokens (paragraphs, headings, lists, code fences) are mapped in real time to their corresponding line numbers in CodeMirror.
- **Active Section Auto-Focus & Smooth Scroll**: In Split View (`Editor + Preview`), as you type or navigate lines in the editor, the Preview pane automatically centers on the active section being written.
- **Visual Zoom Feedback**: The active section in the Preview is highlighted with a subtle magnification (`transform: scale(1.006)`), an accent indicator bar, and ambient illumination, making it immediately clear where you are editing.
- **Jitter Prevention**: Smart viewport detection avoids unnecessary scroll jumps while typing continuously within the same paragraph.

### 🧪 Automated Testing & Reliability
- Added automated unit tests for preview line-mapping, heading ID slug generation, and relative document path resolution (`test/previewFeatures.test.ts`).
- Passed all Frontend (`7/7` Vitest) and Backend (`4/4` Cargo) test suites.

---

# Release Notes — BookMD v0.1.1

Bản cập nhật **v0.1.1** tập trung sửa chữa triệt để hệ thống xử lý hình ảnh (Image Handling), tối ưu hóa trải nghiệm dán ảnh (clipboard paste), tự động đồng bộ cây thư mục theo thời gian thực và bổ sung tính năng Mục lục (Table of Contents).

---

## 🚀 Điểm mới & Sửa lỗi quan trọng (Changelog)

### 🖼️ Khắc phục toàn diện xử lý hình ảnh (Image Handling & Rendering)
- **Render ảnh mượt mà trên Preview**: Kích hoạt giao thức Tauri Asset Protocol (`protocol-asset`) và giải quyết chính xác đường dẫn tương đối của ảnh theo thư mục tài liệu hiện hành hoặc root workspace.
- **Áp dụng tức thì cài đặt thư mục ảnh (Zero-delay Settings)**: Khắc phục lỗi closure trong CodeMirror khiến ảnh paste bị gán nhầm vào thư mục mặc định cũ. Giờ đây thay đổi cài đặt thư mục ảnh (ví dụ: `img` thay vì `assets/images`) được áp dụng ngay lập tức mà không cần khởi động lại ứng dụng.
- **Tự động mở rộng & Cập nhật cây thư mục (Auto-expand & Tree Refresh)**: Khi dán ảnh vào tài liệu, thư mục chứa ảnh sẽ tự động được làm mới và bung mở ngay lập tức trong thanh sidebar, giúp người dùng nhìn thấy ảnh mới tạo mà không còn bỡ ngỡ.
- **Lắng nghe Filesystem Watcher thời gian thực**: Tích hợp sự kiện `fs-change` từ Rust backend giúp cây thư mục tự động cập nhật mọi thay đổi từ bên ngoài (File Explorer) với bộ đệm khử rung (debounce).

### 📑 Mục lục tiêu đề (Table of Contents — TOC)
- Hỗ trợ chuyển đổi nhanh giữa tab **Thư mục (Files)** và tab **Mục lục (TOC)** trong sidebar (`Ctrl + Shift + O`).
- Tự động bóc tách phân cấp tiêu đề H1–H6 từ tài liệu Markdown hiện hành, cho phép nhấp để cuộn và nhảy tức thì tới dòng nội dung tương ứng.

### 🎨 Tinh chỉnh giao diện & Cấu hình
- Sử dụng CodeMirror Compartments giúp thay đổi Theme, Font Size, Line Numbers, Word Wrap mượt mà mà không làm mất trạng thái soạn thảo.
- Cập nhật bộ icon ứng dụng độ phân giải cao (`.ico`, `.icns`, `.png`).
- Bổ sung bộ kiểm thử tự động (Unit Test suite) cho cả Frontend (Vitest) và Backend (Rust cargo test).

---

# Release Notes — BookMD v0.1.0

Chào mừng bạn đến với bản phát hành đầu tiên của **BookMD (v0.1.0)**!

BookMD là một không gian ghi chú kỹ thuật Markdown nhẹ, siêu nhanh, local-first và ưu tiên trực tiếp filesystem dành cho lập trình viên, kỹ sư hệ thống và người làm kỹ thuật.

---

## 🌟 Tính Năng Nổi Bật

### 1. Kiến trúc Local-First & Filesystem-First
- Không database bí mật hay format độc quyền — toàn bộ tài liệu là các file `.md` và thư mục thông thường trên ổ cứng của bạn.
- Tự do đồng bộ qua Git, Syncthing, Dropbox hoặc backup theo cách bạn muốn.
- Giám sát thay đổi file theo thời gian thực (realtime filesystem watcher).

### 2. Trình soạn thảo & Preview mượt mà
- Tích hợp **CodeMirror 6** hiện đại, phản hồi tức thì cả với các tài liệu dài.
- 3 chế độ xem linh hoạt: **Editor Only**, **Split View (Song song)**, và **Preview Only**.
- Hỗ trợ đầy đủ cú pháp GitHub Flavored Markdown (GFM), syntax highlighting code block đa ngôn ngữ, bảng, checklist, quote.

### 3. Tìm kiếm toàn văn siêu tốc (ripgrep IPC)
- Tìm kiếm từ khóa và regex xuyên suốt toàn bộ workspace trong vài mili-giây.
- Xem trước dòng khớp lệnh, số dòng và mở file đến đúng vị trí mong muốn.
- Hỗ trợ lọc theo tên file và đường dẫn thư mục.

### 4. Quản lý hình ảnh tự động & thông minh
- Dán ảnh chụp màn hình trực tiếp từ clipboard (`Ctrl + V`).
- Tự động lưu ảnh vào thư mục cấu hình (mặc định: `assets/images/`) với tên file theo quy chuẩn `{doc_slug}-{index}-{hash}.png`.
- Tự động băm SHA-256 để chống trùng lặp dữ liệu ảnh trong cùng thư mục.
- Tự động cập nhật đường dẫn hình ảnh khi đổi tên tài liệu Markdown.

### 5. Xuất PDF chuyên nghiệp
- Xuất tài liệu Markdown ra PDF nguyên bản với font chữ kỹ thuật sắc nét, code block có viền tinh gọn và ngắt trang hợp lý.

### 6. Trải nghiệm người dùng cao cấp (UX Polish)
- **Command Palette** (`Ctrl + P` / `Ctrl + Shift + P`) truy cập nhanh tất cả thao tác trong ứng dụng.
- **Search Modal** (`Ctrl + K`) tra cứu nhanh chóng.
- Hệ thống **Tabs** đa tài liệu với chỉ báo file chưa lưu (`dirty dot`).
- **Context Menus** trực quan trên cây thư mục (New Note, New Folder, Rename, Delete, Copy Path).
- Hỗ trợ cả **Dark Theme** và **Light Theme**, tùy chỉnh kích thước chữ, tự động lưu (auto-save).

---

## 📦 Các gói cài đặt (Packaging)

Bản phát hành cung cấp các gói cài đặt cho các hệ điều hành:
- **Windows**: Bộ cài đặt `BookMD-Setup-x64.exe` (NSIS) và `.msi`.
- **Linux**: Gói cài đặt `.deb` (Debian/Ubuntu) và `.AppImage` (Universal Linux).
- **macOS**: Gói `.dmg` tương thích Intel & Apple Silicon.

---

## 🛠️ Yêu cầu hệ thống

- **Hệ điều hành**: Windows 10/11 64-bit, Ubuntu 22.04+ (hoặc tương đương), macOS 11+
- **Dung lượng**: ~20MB RAM khi chạy, kích thước bộ cài < 15MB.
