# Yêu cầu chức năng

## 1. Workspace

### FR-001 — Mở workspace

Người dùng phải có thể chọn một thư mục trên filesystem để mở làm workspace.

### FR-002 — Hiển thị cây thư mục

BookMD phải hiển thị các file và thư mục trong workspace dưới dạng cây phân cấp.

### FR-003 — Tạo file

Người dùng phải có thể tạo file trong workspace.

### FR-004 — Tạo thư mục

Người dùng phải có thể tạo thư mục trong workspace.

### FR-005 — Đổi tên

Người dùng phải có thể đổi tên file hoặc thư mục.

Nếu tên mới gây xung đột với một entry đã tồn tại tại cùng vị trí, thao tác phải bị từ chối và hiển thị cảnh báo.

### FR-006 — Xóa

Người dùng phải có thể xóa file hoặc thư mục theo cơ chế an toàn phù hợp với hệ điều hành.

### FR-007 — Theo dõi filesystem

Thay đổi được tạo từ bên ngoài BookMD nên được phản ánh vào cây workspace mà không yêu cầu người dùng reload thủ công.

## 2. Markdown

### FR-008 — Mở Markdown

BookMD phải mở được các file Markdown thông dụng.

### FR-009 — Chỉnh sửa Markdown

BookMD phải cung cấp trình soạn thảo Markdown hỗ trợ code và syntax highlighting phù hợp.

### FR-010 — Lưu

Người dùng phải có thể lưu thay đổi vào chính file Markdown trên filesystem.

### FR-011 — Preview

BookMD phải cung cấp chế độ xem trước Markdown.

Preview phải tránh việc render lại toàn bộ nội dung không cần thiết khi có thể.

### FR-012 — Chế độ giao diện

BookMD nên hỗ trợ:

- Editor;
- Preview;
- Split view.

### FR-013 — Tabs

Người dùng có thể mở nhiều file và chuyển đổi giữa chúng.

## 3. Search

### FR-014 — Tìm kiếm workspace

Người dùng phải có thể tìm kiếm nội dung trên toàn bộ workspace.

### FR-015 — Search result

Mỗi kết quả phải hiển thị tối thiểu:

- file;
- dòng;
- đoạn nội dung chứa pattern.

### FR-016 — Điều hướng

Người dùng có thể chọn kết quả để mở file và đi tới vị trí tương ứng.

### FR-017 — Công cụ tìm kiếm

Phiên bản ban đầu ưu tiên sử dụng `ripgrep` (`rg`) thay vì tự xây dựng search engine riêng.

## 4. Hình ảnh

### FR-018 — Paste image

Người dùng phải có thể paste hình ảnh trực tiếp vào Markdown editor.

### FR-019 — Image directory

Người dùng có thể cấu hình thư mục dùng để lưu hình ảnh.

Nếu không có cấu hình riêng, BookMD sử dụng thư mục hình ảnh mặc định theo quy tắc của workspace/file.

### FR-020 — Image naming

Tên hình ảnh tự động phải tuân theo:

```text
<path-context>_<markdown-file>_<image-index>.<extension>
```

Trong đó `image-index` là thứ tự hình ảnh được tạo/paste thuộc file Markdown đó.

### FR-021 — Image ownership

Mỗi hình ảnh do BookMD quản lý thuộc về đúng một file Markdown.

BookMD không coi hình ảnh này là tài nguyên dùng chung giữa nhiều Markdown file.

### FR-022 — Markdown reference

Sau khi lưu hình ảnh, BookMD phải tự động chèn reference tương đối vào Markdown file.

### FR-023 — Rename Markdown và image

Khi đổi tên hoặc di chuyển Markdown file, BookMD phải có khả năng đổi tên/di chuyển các image thuộc file đó để giữ convention.

Nếu thao tác gây xung đột tên hoặc đường dẫn, BookMD phải cảnh báo và không tự động ghi đè.

## 5. PDF

### FR-024 — Xuất PDF

Người dùng phải có thể xuất Markdown hiện tại thành PDF.

### FR-025 — Đồng nhất preview

PDF nên sử dụng cùng pipeline Markdown/rendering với preview ở mức có thể, nhằm giảm khác biệt giữa hai kết quả.

## 6. UX

### FR-026 — Command Palette

BookMD nên cung cấp command palette cho các thao tác thường dùng.

### FR-027 — Keyboard shortcuts

Các thao tác thường dùng nên có shortcut.

### FR-028 — Context menu

File tree nên hỗ trợ context menu cho các thao tác liên quan đến file/folder.

## 7. Hiệu năng

### FR-029 — Không load toàn workspace vào editor

Chỉ nội dung cần thiết của file đang mở mới được đưa vào editor/render pipeline.

### FR-030 — Search không block UI

Quá trình search workspace không được làm treo giao diện.

### FR-031 — Không render lại không cần thiết

Thay đổi cục bộ trong editor nên dẫn đến xử lý cục bộ khi kiến trúc renderer cho phép.
