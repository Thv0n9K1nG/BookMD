# IPC API

## 1. Mục tiêu

IPC API là boundary giữa React frontend và Rust backend.

API phải:

- nhỏ;
- rõ trách nhiệm;
- có input/output xác định;
- trả lỗi có cấu trúc;
- không phụ thuộc trực tiếp vào UI.

Tên API dưới đây là thiết kế định hướng, không phải cam kết về tên hàm cuối cùng.

## 2. Workspace

### `workspace.open`

Mở workspace.

```text
input:
  path

output:
  WorkspaceInfo
```

### `workspace.tree`

Lấy cây file/folder.

```text
output:
  FileEntry[]
```

## 3. Filesystem

### `file.read`

```text
input:
  relativePath

output:
  content
```

### `file.write`

```text
input:
  relativePath
  content

output:
  success
```

### `file.create`

```text
input:
  relativePath
  kind

output:
  FileEntry
```

### `file.rename`

```text
input:
  source
  destination

output:
  success
```

### `file.delete`

```text
input:
  relativePath

output:
  success
```

## 4. Search

### `search.query`

```text
input:
  pattern
  options

output:
  SearchResult[]
```

Một `SearchResult` nên chứa:

```text
SearchResult
├── file
├── line
├── column (nếu có)
├── matchedText
└── context
```

Search backend ban đầu sử dụng `rg`.

## 5. Image

### `image.save`

```text
input:
  markdownFile
  imageData
  options

output:
  ImageResult
```

`ImageResult` nên chứa:

```text
ImageResult
├── path
├── relativePath
├── filename
└── markdownReference
```

### `image.renameForDocument`

Được sử dụng khi Markdown document đổi tên hoặc vị trí.

## 6. Export

### `export.pdf`

```text
input:
  markdownFile
  destination
  options

output:
  outputPath
```

## 7. Error model

Lỗi nên được phân loại thay vì trả về chuỗi tùy ý.

Ví dụ:

```text
FILE_NOT_FOUND
FILE_ALREADY_EXISTS
PERMISSION_DENIED
INVALID_PATH
WORKSPACE_NOT_OPEN
IMAGE_CONFLICT
SEARCH_FAILED
EXPORT_FAILED
```

Frontend dựa trên error code để quyết định cách hiển thị.

## 8. Nguyên tắc IPC

Không expose một API kiểu:

```text
executeArbitraryShellCommand(...)
```

chỉ để giảm công sức implement.

Backend chỉ nên expose các operation mà BookMD thực sự cần.

Điều này giúp giảm attack surface và làm API dễ kiểm soát hơn.
