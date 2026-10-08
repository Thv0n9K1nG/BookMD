# Thiết kế giao diện

## 1. Mục tiêu

BookMD cần có giao diện hiện đại và đẹp nhưng không được biến giao diện thành nguồn gây nặng cho ứng dụng.

Nguyên tắc:

- sạch;
- nhanh;
- dễ đọc;
- ưu tiên keyboard;
- phù hợp với technical notes;
- ít decoration không cần thiết.

## 2. Bố cục chính

```text
┌────────────────────────────────────────────────────────────┐
│ BookMD        Search...                         Settings    │
├───────────────┬────────────────────────────────────────────┤
│               │ Tabs                                       │
│ WORKSPACE     │ ┌────────────────────────────────────────┐ │
│               │ │ Editor / Preview                       │ │
│ ▾ Docker      │ │                                        │ │
│   image.md    │ │ # Kubernetes Pod                       │ │
│   network.md  │ │                                        │ │
│               │ │ ...                                    │ │
│ ▾ Kubernetes  │ │                                        │ │
│   Pod.md      │ │                                        │ │
│   Worker.md   │ │                                        │ │
│               │ │                                        │ │
│ ▾ Web         │ │                                        │ │
│               │ └────────────────────────────────────────┘ │
└───────────────┴────────────────────────────────────────────┘
```

## 3. Sidebar

Sidebar chứa:

- workspace;
- file tree;
- context menu;
- trạng thái workspace cơ bản.

Sidebar phải có thể:

- resize;
- collapse;
- mở lại.

## 4. Editor

Editor là khu vực trung tâm.

Ưu tiên:

- Markdown syntax;
- code syntax highlighting;
- line numbers tùy lựa chọn;
- word wrap tùy lựa chọn;
- keyboard shortcuts;
- tìm kiếm trong file.

## 5. Preview

Preview hiển thị Markdown đã render.

Nó phải hỗ trợ ít nhất:

- headings;
- paragraphs;
- lists;
- links;
- images;
- blockquotes;
- inline code;
- fenced code blocks;
- tables nếu parser hỗ trợ.

## 6. Search UI

Search workspace nên có giao diện gần với các IDE hiện đại.

Ví dụ:

```text
┌─────────────────────────────────────────┐
│ Search: kubelet                         │
├─────────────────────────────────────────┤
│ Kubernetes/Worker.md                    │
│ 42  Kubelet is an agent that runs...    │
│                                         │
│ Kubernetes/Pod.md                       │
│ 18  The kubelet ensures...              │
└─────────────────────────────────────────┘
```

Click kết quả phải:

1. mở file;
2. focus editor;
3. đi tới dòng;
4. highlight kết quả nếu có thể.

## 7. Command Palette

Shortcut mặc định có thể là:

```text
Ctrl/Cmd + Shift + P
```

Các command ví dụ:

```text
Open Workspace
New File
New Folder
Save
Search Workspace
Toggle Sidebar
Toggle Preview
Export PDF
Open Settings
Reveal in File Explorer
```

## 8. Context menu

File tree nên có:

```text
Open
New File
New Folder
Rename
Delete
Copy Path
Copy Relative Path
Reveal in Explorer
```

## 9. Theme

BookMD nên hỗ trợ dark/light theme.

Theme không được quyết định bằng logic rải rác trong component. Nên có một design-token layer để thay đổi giao diện nhất quán.

## 10. Animation

Animation nên:

- ngắn;
- có mục đích;
- không ảnh hưởng typing/search;
- không dùng animation cho mọi interaction.

Hiệu năng được ưu tiên cao hơn hiệu ứng.

## 11. Responsive behavior

BookMD là desktop app nên không cần tối ưu cho mobile.

Tuy nhiên UI phải thích ứng tốt với các kích thước cửa sổ desktop khác nhau.

## 12. Accessibility

Các thành phần interactive nên hỗ trợ:

- keyboard navigation;
- focus state;
- accessible labels;
- contrast hợp lý;
- shortcut không làm mất khả năng thao tác bằng chuột.

## 13. Nguyên tắc quan trọng

BookMD không cố mô phỏng Word.

Nó nên mang cảm giác của một công cụ kỹ thuật:

```text
IDE
 +
Markdown editor
 +
File manager
```

thay vì:

```text
Word processor
```
