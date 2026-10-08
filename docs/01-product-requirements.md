# Yêu cầu sản phẩm

## 1. Tổng quan

BookMD là ứng dụng desktop dùng để xây dựng và tra cứu kho kiến thức kỹ thuật được lưu trực tiếp trên filesystem.

Ý tưởng cốt lõi là thay vì viết một tài liệu Markdown khổng lồ, người dùng có thể chia kiến thức thành nhiều file nhỏ, tổ chức bằng thư mục và tìm kiếm xuyên suốt toàn bộ workspace.

## 2. Bối cảnh và vấn đề

Các tài liệu học kỹ thuật có xu hướng tăng kích thước theo thời gian. Khi một tài liệu trở nên quá lớn, việc render toàn bộ nội dung sau mỗi thay đổi có thể làm trải nghiệm chỉnh sửa kém mượt.

Mặt khác, kiến thức kỹ thuật thường có cấu trúc tự nhiên theo chủ đề:

```text
TryHackMe/
├── Docker/
├── Kubernetes/
├── Web/
└── Linux/
```

Một workspace như vậy cần khả năng:

- mở và chỉnh sửa từng file;
- nhìn thấy toàn bộ cấu trúc thư mục;
- tìm một khái niệm trên toàn workspace;
- nhảy trực tiếp tới vị trí kết quả;
- chèn ảnh mà không phải tự quản lý tên và đường dẫn;
- xuất nội dung thành tài liệu có thể chia sẻ.

## 3. Đối tượng sử dụng

BookMD hướng tới người dùng ghi chú kỹ thuật, đặc biệt là:

- sinh viên;
- người tự học công nghệ;
- lập trình viên;
- người học cybersecurity;
- người xây dựng tài liệu kỹ thuật cá nhân.

## 4. Mục tiêu

### 4.1 Mục tiêu chính

1. Cung cấp trải nghiệm chỉnh sửa Markdown nhanh.
2. Cho phép một workspace phản ánh trực tiếp filesystem.
3. Cung cấp tìm kiếm nhanh trên toàn workspace.
4. Tự động hóa việc lưu và đặt tên hình ảnh.
5. Giữ dữ liệu ở định dạng mở, dễ sao lưu và quản lý bằng Git.
6. Có giao diện hiện đại nhưng không đánh đổi tài nguyên và hiệu năng.

### 4.2 Tiêu chí thành công

BookMD được xem là đạt mục tiêu khi người dùng có thể:

1. mở một thư mục làm workspace;
2. tạo/chỉnh sửa/xóa/đổi tên file và thư mục;
3. mở một Markdown file và chỉnh sửa mà không phải render toàn bộ workspace;
4. tìm một từ khóa trên toàn bộ workspace;
5. click kết quả và đi tới đúng file/vị trí;
6. paste một hình ảnh và nhận được file ảnh cùng Markdown reference tự động;
7. xuất Markdown thành PDF.

## 5. Nguyên tắc sản phẩm

### Filesystem-first

Filesystem là nguồn dữ liệu chính. BookMD không yêu cầu database để lưu nội dung Markdown hoặc hình ảnh.

### Local-first

BookMD hoạt động với dữ liệu cục bộ. Không yêu cầu tài khoản, server hoặc dịch vụ cloud để sử dụng các chức năng cốt lõi.

### Lightweight

BookMD chỉ giải quyết những vấn đề trực tiếp liên quan tới việc viết và tra cứu technical notes.

### Hiệu năng

BookMD không nên xử lý toàn bộ workspace hoặc toàn bộ tài liệu khi chỉ một phần nhỏ thay đổi.

### Tương thích

File Markdown và hình ảnh phải tiếp tục có thể mở bằng công cụ khác nếu BookMD không còn được sử dụng.

## 6. Ngoài phạm vi

Các tính năng sau không thuộc mục tiêu ban đầu:

- đồng bộ cloud;
- cộng tác thời gian thực;
- tài khoản người dùng;
- server backend;
- mạng xã hội;
- hệ thống plugin;
- AI assistant;
- graph knowledge base;
- database làm nguồn dữ liệu chính;
- WYSIWYG editor phức tạp;
- hệ thống quản lý phiên bản riêng.

Những tính năng này chỉ được xem xét nếu có nhu cầu thực tế rõ ràng trong tương lai.

## 7. Quan điểm về dữ liệu

Một workspace BookMD về cơ bản chỉ là:

```text
Workspace/
├── *.md
├── images/
├── other assets/
└── folders/
```

BookMD là giao diện thông minh trên cấu trúc đó, không phải nơi sở hữu một định dạng dữ liệu độc quyền.
