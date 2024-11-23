# Bài tập lớn Kiến trúc phần mềm - CASE STUDY 2
## Mô tả Version cũ
### Giới thiệu
Đây là một chương trình có nhiệm vụ chuyển file ảnh tiếng Anh sang một file `pdf` tiếng Việt. Các bước xử lý lần lượt bao gồm: chuyển đổi ảnh sang text, dịch tiếng Anh sang tiếng Việt, chuyển đổi nội dung text thành file `pdf`.
### Cấu trúc file
| File | Chức năng |
|--|:--|
| utils/ocr.js | Chuyển đổi ảnh sang text |
| utils/translate.js | Dịch tiếng Anh sang tiếng Việt |
| utils/pdf.js | Chuyển đổi text sang PDF |
---
## Mô tả Version mới
Cải tiến trong chương trình: dựa trên `Pipes and Filters pattern`, sử dụng [RabbitMQ](https://www.rabbitmq.com/) để thêm 3 worker phục vụ cho từng bước xử lý, giúp hệ thống có thể dễ dàng scale cho từng bước xử lý. Hệ thống cũng sử dụng `express.js` tạo API `/upload-rabbitmq` trong `app.js` để chạy chương trình.
### Cấu trúc file
| File | Chức năng |
|--|:--|
| utils/ocr.js | Chuyển đổi ảnh sang text |
| utils/translate.js | Dịch tiếng Anh sang tiếng Việt |
| utils/pdf.js | Chuyển đổi text sang PDF |
| worker/wo.js | Worker cho xử lý ocr |
| worker/wt.js | Worker cho xử lý translate |
| worker/wp.js | Worker cho xử lý pdf |
| app.js | Chạy host trên cổng 3000 |

(Ngoài ra còn có `frontend/index.html` và folder `test/` để test hiệu năng)
### Hướng dẫn cài đặt
Yêu cầu cài đặt trước:  
 - [tesseract](https://tesseract-ocr.github.io/tessdoc/Installation.html) trên hệ điều hành của bạn  
 - [RabbitMQ](https://www.rabbitmq.com/) trên máy tính hoặc sử dụng [Docker](https://www.docker.com/) để tạo môi trường
   
Trường hợp sử dụng Docker
```sh
# Chạy RabbitMQ với Docker
# Vào terminal chính của Docker, chạy lệnh:
$ docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:management
# Sau đó chạy RabbitMQ Management trên `http://localhost:15672`
```
Trong dự án
```sh
# Cài đặt các gói liên quan
$ npm install
# Tạo folder cho output
$ mkdir output
# Chạy các worker
$ cd worker
$ node wo.js
$ node wt.js
$ node wp.js
# Khởi chạy ứng dụng
$ node app.js
# Sau đó sử dụng Postman hoặc Insomnia để test API `http://localhost:3000/upload`
```

## Test
### Mô tả
Sử dụng [Locust](https://locust.io/) để chạy test
### Cấu trúc file
| File | Chức năng |
|--|:--|
| test/Dockerfile | xây dựng Docker image |
| test/locustfile.py | Tạo Image |
| test/sample.png | File ảnh để test |
### Hướng dẫn chạy test
```sh
# Tạo image ở Docker
$ cd test
$ docker build -t locust-image .
# Mở image bên Docker để chạy Container
$ docker run -p 8089:8089 -v "test:/test" locust-image
# Sau đó chạy Locust trên `http://localhost:8089`
```
### Một số kết quả test
 - 
Với Version cũ, 