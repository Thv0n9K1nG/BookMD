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
