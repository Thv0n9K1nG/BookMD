# Workspace và mô hình dữ liệu

## 1. Workspace

Workspace là một thư mục do người dùng chọn.

Ví dụ:

```text
TryHackMe/
├── Docker/
│   ├── image.md
│   └── container.md
├── Kubernetes/
│   ├── Pod.md
│   └── WorkerNode.md
└── Web/
    └── SQLInjection.md
```

BookMD không yêu cầu workspace có cấu trúc cố định.

## 2. Relative path

Mọi đường dẫn nội bộ nên được biểu diễn tương đối với workspace root khi có thể.

Ví dụ:

```text
Kubernetes/Pod.md
```

thay vì lưu đường dẫn tuyệt đối như:

```text
C:\Users\User\Documents\TryHackMe\Kubernetes\Pod.md
```

Đường dẫn tuyệt đối chỉ được dùng khi cần tương tác với filesystem.

## 3. File model

Một file entry tối thiểu có thể được biểu diễn:

```text
FileEntry
├── name
├── relativePath
├── kind
└── metadata (tùy chọn)
```

`kind` tối thiểu:

- file;
- directory.

## 4. Markdown document

Markdown document về mặt dữ liệu chỉ là file `.md` trên filesystem.

BookMD không cần một bản copy thứ hai của nội dung.

## 5. Workspace configuration

Nếu cần lưu cấu hình riêng cho workspace, BookMD có thể sử dụng một thư mục metadata dành riêng, ví dụ:

```text
.thmnotes/
```

hoặc một tên phù hợp được quyết định trong implementation.

Cấu hình này không được trở thành nơi lưu nội dung Markdown.

## 6. Git compatibility

Workspace phải có thể sử dụng với Git mà không cần cơ chế đặc biệt.

Ví dụ:

```text
git init
git add .
git commit
```

BookMD không được yêu cầu database migration để khôi phục nội dung workspace.

## 7. Rename và move

Rename/move là filesystem operation.

Khi entry là Markdown file có image thuộc quyền sở hữu của nó, Image Manager phải được thông báo để xử lý image theo quy tắc trong tài liệu [Quản lý hình ảnh](05-image-management.md).

## 8. Không overwrite mặc định

Các thao tác tạo hoặc rename không được âm thầm ghi đè entry tồn tại.

Nếu destination đã tồn tại:

```text
Operation
   ↓
Conflict detected
   ↓
User notification
```

Quyết định overwrite, nếu được hỗ trợ trong tương lai, phải là hành động rõ ràng của người dùng.
