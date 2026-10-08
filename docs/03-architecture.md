# Kiến trúc

## 1. Tổng quan

BookMD sử dụng kiến trúc desktop với frontend web và native backend:

```text
┌─────────────────────────────────────┐
│              Tauri                  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ React + TypeScript             │  │
│  │                               │  │
│  │ File Tree                     │  │
│  │ Editor                        │  │
│  │ Preview                       │  │
│  │ Search UI                     │  │
│  │ Settings                      │  │
│  └──────────────┬────────────────┘  │
│                 │ IPC               │
│  ┌──────────────▼────────────────┐  │
│  │ Rust backend                  │  │
│  │                               │  │
│  │ Workspace                     │  │
│  │ Filesystem                    │  │
│  │ Search                        │  │
│  │ Image management              │  │
│  │ File watcher                  │  │
│  │ Export                        │  │
│  └──────────────┬────────────────┘  │
└─────────────────┼───────────────────┘
                  │
                  ▼
            Local filesystem
```

## 2. Frontend

Frontend chịu trách nhiệm:

- giao diện;
- trạng thái UI;
- editor;
- preview;
- file tree presentation;
- search presentation;
- dialogs;
- command palette;
- keyboard interaction.

Frontend không nên trực tiếp chứa logic filesystem phức tạp.

## 3. Backend

Rust backend chịu trách nhiệm cho các tác vụ cần quyền và khả năng native:

- đọc/ghi filesystem;
- tạo/đổi tên/xóa file;
- theo dõi filesystem;
- chạy `rg`;
- quản lý image;
- xuất PDF;
- các tác vụ dài hoặc I/O-bound.

## 4. IPC

Frontend giao tiếp với backend thông qua Tauri IPC.

Nguyên tắc:

- API nhỏ;
- input/output có schema rõ ràng;
- không truyền dữ liệu lớn qua IPC nếu có thể xử lý trực tiếp ở phía phù hợp;
- lỗi phải có cấu trúc để UI có thể hiển thị chính xác.

## 5. Filesystem là source of truth

BookMD không sử dụng database làm nguồn dữ liệu chính cho Markdown hoặc image.

```text
Filesystem
    │
    ├── Markdown
    ├── Images
    └── Directories
```

Các metadata cache trong tương lai, nếu có, chỉ là dữ liệu phụ và phải có khả năng tái tạo.

## 6. Editor

Editor nên sử dụng CodeMirror 6 hoặc giải pháp tương đương có khả năng xử lý text editor hiệu quả.

Editor và Markdown preview là hai concern riêng:

```text
Markdown source
      │
      ├── Editor
      │
      └── Markdown parser → Preview
```

Không sử dụng DOM của preview làm nguồn dữ liệu để chỉnh sửa.

## 7. Search

BookMD ưu tiên `ripgrep` cho workspace-wide search.

```text
React Search UI
       │
       ▼
Tauri IPC
       │
       ▼
Rust search layer
       │
       ▼
      rg
       │
       ▼
Search results
```

Search layer chịu trách nhiệm chuyển kết quả của `rg` thành model ổn định cho frontend.

## 8. Filesystem watcher

Watcher theo dõi workspace để phát hiện:

- file created;
- file modified;
- file deleted;
- file renamed;
- directory created/deleted/renamed.

Watcher không nên tự động ghi đè thay đổi của người dùng.

## 9. Hiệu năng

Các nguyên tắc chính:

- chỉ mở file khi cần;
- tránh scan workspace nếu không cần;
- search chạy ngoài UI thread;
- preview có debounce/throttling phù hợp;
- cache chỉ khi nó tạo ra lợi ích đo được;
- không thêm database/indexer chỉ vì có thể.

## 10. Nguyên tắc dependency

Mỗi dependency mới cần có lý do rõ ràng.

BookMD ưu tiên:

- dependency nhỏ;
- thư viện ổn định;
- thư viện có giấy phép phù hợp;
- tránh nhiều abstraction chồng lên nhau.
