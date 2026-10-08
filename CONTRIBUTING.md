# Đóng góp cho BookMD

Cảm ơn bạn đã quan tâm tới BookMD.

BookMD là một dự án mã nguồn mở tập trung vào một mục tiêu nhỏ: tạo ra một workspace Markdown kỹ thuật nhẹ, nhanh và ưu tiên filesystem.

## Trước khi đóng góp

Hãy đọc:

- [Yêu cầu sản phẩm](docs/01-product-requirements.md)
- [Yêu cầu chức năng](docs/02-functional-requirements.md)
- [Kiến trúc](docs/03-architecture.md)

Đặc biệt, hãy kiểm tra xem thay đổi có làm tăng scope của BookMD vượt khỏi mục tiêu ban đầu hay không.

## Issue

Issue nên mô tả:

- vấn đề;
- cách tái hiện;
- hành vi hiện tại;
- hành vi mong muốn;
- môi trường nếu liên quan.

## Pull Request

PR nên:

- có phạm vi nhỏ và rõ;
- giải thích lý do thay đổi;
- cập nhật tài liệu nếu behavior thay đổi;
- không thêm dependency nếu không cần;
- không chứa secrets;
- không thay đổi behavior ngoài phạm vi PR.

## Code style

Frontend:

- TypeScript;
- component nhỏ;
- tránh state global nếu không cần;
- ưu tiên accessibility.

Backend:

- Rust formatting;
- xử lý lỗi rõ ràng;
- tránh panic cho lỗi runtime thông thường;
- filesystem operation phải kiểm tra lỗi.

## Nguyên tắc quan trọng

Filesystem là source of truth.

Không thêm database hoặc service backend chỉ để giải quyết một vấn đề mà filesystem và một abstraction nhỏ có thể giải quyết.

## Commit

Có thể sử dụng commit message rõ ràng, ví dụ:

```text
feat: add workspace file tree
fix: handle image path on markdown rename
refactor: simplify search result model
docs: update image naming rules
```
