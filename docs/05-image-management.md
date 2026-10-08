# Quản lý hình ảnh

## 1. Mục tiêu

BookMD tự động hóa việc lưu hình ảnh được paste vào Markdown nhưng vẫn giữ cấu trúc file dễ hiểu và có thể quản lý bằng filesystem.

Một hình ảnh được BookMD tạo ra từ một Markdown document thuộc về chính document đó.

## 2. Image destination

BookMD hỗ trợ lựa chọn thư mục hình ảnh.

### Trường hợp 1 — Người dùng cấu hình image folder

Người dùng chọn một thư mục làm nơi lưu image.

Ví dụ:

```text
Workspace/
├── Docker/
├── Kubernetes/
└── assets/
    └── images/
```

Image có thể được lưu vào:

```text
assets/images/
```

### Trường hợp 2 — Không cấu hình

BookMD sử dụng thư mục image mặc định theo workspace/file configuration đã được xác định bởi implementation.

Mục tiêu là behavior phải ổn định và dễ dự đoán.

## 3. Naming convention

Tên file được tạo theo:

```text
<path-context>_<markdown-file>_<image-index>.<extension>
```

### `path-context`

Là context đường dẫn của Markdown file tính từ workspace root, được chuyển thành chuỗi phù hợp cho filename.

Ví dụ:

```text
Workspace/
└── Kubernetes/
    └── Nodes/
        └── WorkerNode.md
```

thì path context có thể là:

```text
Kubernetes_Nodes
```

### `markdown-file`

Tên file Markdown không bao gồm extension.

```text
WorkerNode.md
```

→

```text
WorkerNode
```

### `image-index`

Là số thứ tự image thuộc file Markdown đó.

Ví dụ một file có 5 image:

```text
1
2
3
4
5
```

## 4. Ví dụ

### Markdown và image cùng context

```text
Kubernetes/
├── Pod.md
└── images/
```

Các image của `Pod.md`:

```text
Kubernetes_Pod_1.png
Kubernetes_Pod_2.png
Kubernetes_Pod_3.png
```

### Markdown nằm trong thư mục con

```text
Kubernetes/
└── Nodes/
    └── WorkerNode.md
```

Image:

```text
Kubernetes_Nodes_WorkerNode_1.png
Kubernetes_Nodes_WorkerNode_2.png
```

## 5. Image index

Image index đại diện cho thứ tự image được tạo/paste thuộc Markdown document.

BookMD phải duy trì ownership rõ ràng của image.

Không được giả định rằng hai Markdown file sẽ dùng chung một image do BookMD quản lý.

## 6. Chèn Markdown reference

Sau khi image được lưu, BookMD chèn đường dẫn tương đối vào Markdown.

Ví dụ:

```markdown
![Worker node](../assets/images/Kubernetes_Nodes_WorkerNode_1.png)
```

Đường dẫn phải được tính từ vị trí của Markdown file đến image thực tế.

## 7. Paste workflow

```text
User paste image
       │
       ▼
Detect image data
       │
       ▼
Determine current Markdown file
       │
       ▼
Determine image destination
       │
       ▼
Determine image index
       │
       ▼
Generate filename
       │
       ▼
Check destination
       │
       ├── conflict → notify user
       │
       └── available
              │
              ▼
          Save image
              │
              ▼
       Insert Markdown reference
```

## 8. Rename Markdown

Nếu:

```text
Kubernetes/Nodes/WorkerNode.md
```

được đổi thành:

```text
Kubernetes/Nodes/Worker.md
```

các image thuộc document có thể được đổi tên tương ứng:

```text
Kubernetes_Nodes_WorkerNode_1.png
```

→

```text
Kubernetes_Nodes_Worker_1.png
```

Nếu việc đổi tên gây conflict, BookMD phải cảnh báo và không tự động overwrite.

## 9. Move Markdown

Nếu Markdown file được di chuyển sang context khác, path context của image thay đổi.

Ví dụ:

```text
Kubernetes/WorkerNode.md
```

→

```text
Kubernetes/Nodes/WorkerNode.md
```

có thể dẫn đến:

```text
Kubernetes_WorkerNode_1.png
```

→

```text
Kubernetes_Nodes_WorkerNode_1.png
```

Việc di chuyển image thực tế phụ thuộc vào image directory configuration.

## 10. Không tự động quản lý image ngoài ownership

BookMD không được tự ý rename hoặc delete image chỉ vì nó giống tên image của một Markdown khác.

Chỉ image được xác định là thuộc document đang thao tác mới nằm trong phạm vi automatic image management.

## 11. Extension

BookMD phải giữ extension phù hợp với định dạng ảnh thực tế.

Ví dụ:

```text
.png
.jpg
.jpeg
.webp
```

Không nên chỉ dựa vào extension do người dùng cung cấp nếu MIME/type của dữ liệu có thể xác định chính xác hơn.
