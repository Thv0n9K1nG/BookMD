# BookMD

> Một không gian ghi chú Markdown nhẹ, nhanh và ưu tiên filesystem dành cho việc xây dựng kho kiến thức kỹ thuật.

BookMD được thiết kế cho những trường hợp ghi chú kỹ thuật được chia thành nhiều file Markdown nhỏ, cần tìm kiếm xuyên suốt một workspace, quản lý hình ảnh có tổ chức và vẫn giữ toàn bộ dữ liệu dưới dạng file thông thường trên filesystem.

## Mục tiêu

BookMD tập trung vào bốn việc:

- Viết và xem trước Markdown.
- Quản lý workspace dưới dạng cây thư mục/file.
- Tìm kiếm nhanh trên toàn bộ workspace.
- Quản lý hình ảnh được dán trực tiếp vào Markdown.
- Xuất Markdown sang PDF.

BookMD không nhằm trở thành một ứng dụng cộng tác, dịch vụ ghi chú đám mây hay một bản sao đầy đủ của các ứng dụng knowledge-management lớn.

## Nguyên tắc

- **Filesystem-first:** filesystem là nguồn dữ liệu chính.
- **Local-first:** dữ liệu của người dùng nằm trên máy người dùng.
- **Đơn giản:** ưu tiên ít tính năng nhưng hoạt động tốt.
- **Nhanh:** tránh render hoặc xử lý toàn bộ workspace khi không cần thiết.
- **Technical-note oriented:** UX ưu tiên code, lệnh terminal, cấu trúc thư mục và tra cứu.
- **Không khóa dữ liệu:** Markdown và hình ảnh vẫn có thể được sử dụng bởi các công cụ khác.

## Trạng thái

BookMD đang trong quá trình phát triển. API, giao diện và cấu trúc nội bộ có thể thay đổi trong giai đoạn đầu.

## Tài liệu

- [Yêu cầu sản phẩm](docs/01-product-requirements.md)
- [Yêu cầu chức năng](docs/02-functional-requirements.md)
- [Kiến trúc](docs/03-architecture.md)
- [Workspace và mô hình dữ liệu](docs/04-workspace-and-data-model.md)
- [Quản lý hình ảnh](docs/05-image-management.md)
- [IPC API](docs/06-ipc-api.md)
- [Thiết kế giao diện](docs/07-ui-design.md)
- [Lộ trình phát triển](docs/08-development-roadmap.md)
- [Đóng góp](CONTRIBUTING.md)
- [Chính sách bảo mật](SECURITY.md)

## Giấy phép

BookMD được phát hành theo giấy phép MIT. Xem [LICENSE](LICENSE).
