# Bài tập lớn Kiến trúc phần mềm - CASE STUDY 2
## Thành viên nhóm:
|Tên thành viên|
|--|
| Nguyễn Duy Đức |
| Nguyễn Tiến Quân |
| Trần Đức Tâm |
---
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
### Cải tiến
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
# Lưu ý: Có thể chạy rất nhiều worker song song, ví dụ: node wo.js hoặc wt.js hoặc wp.js tùy vào số request ở queue nào đang nhiều
# Khởi chạy ứng dụng
$ node app.js
# Sau đó sử dụng Postman hoặc Insomnia để test API `http://localhost:3000/upload-rabbitmq`
```
---
## Test
### Mô tả
Sử dụng [Locust](https://locust.io/) để chạy test  
Đầu vào là [file ảnh](https://trantam31.github.io/text2pdf-ktpm/test/sample.png) (dung lượng 372KB).  
Đầu ra là file pdf (dung lượng 10.5KB).  
(Lưu ý: [Kết quả test](https://trantam31.github.io/text2pdf-ktpm/) làm trên máy có cấu hình Intel Core i5-1240P, RAM 8GB)  
### Cấu trúc file test
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
### Quá trình test và so sánh hiệu năng
Kết quả test xem [tại đây](https://trantam31.github.io/text2pdf-ktpm/)
 - Với [version cũ](https://trantam31.github.io/text2pdf-ktpm/showtestresult/oldversion): hệ thống không còn chạy khi số người truy cập cùng 1 lúc là 47 người. Tổng số response fail là 42/188 request. Thời gian phản hồi từ 3000ms-6000ms.  
    &#8594; Có thể thấy hệ thống không chịu được tải, rất dễ sập và thời gian phản hồi khá lâu
 - Với version mới dùng RabbitMQ:
     - [Lần 1](https://trantam31.github.io/text2pdf-ktpm/showtestresult/1o1t1p100user): với mỗi bước xử lý chỉ chạy 1 worker, chạy 100 users. Tổng số response fail là 0/159 request. Thời gian phản hồi tăng dần tuyến tính theo số lượng người truy cập  
        &#8594; Do các request được đưa vào queue chờ xử lý [(ảnh trong RabbitMQ Manager khi dừng test)](https://trantam31.github.io/text2pdf-ktpm/showtestresult/Rbmqver1.png) nên tuy số lỗi rất nhỏ và không thể sập nhưng thời gian phản hồi rất lâu. Qua hình ảnh này có thể thấy ở ocr_queue có rất nhiều lượt đang chờ được xử lý, nên ở lần test tiếp theo, số lượng ocr worker sẽ tăng lên 5.
     -  [Lần 2](https://trantam31.github.io/text2pdf-ktpm/showtestresult/5o2t2p100users): với 5 ocr worker 2 translate worker 2 pdf worker, chạy 100 users. Tổng số response fail là 1/442 request. Thời gian phản hồi có thể duy trì được ở mức < 4000ms khi có khoảng 40 người truy cập cùng lúc, nhưng sau đó thì lại tăng dần tuyến tính  
        &#8594; Có thể thấy khi tăng các worker thời gian xử lý đã giảm, và tổng request được gửi đi cũng tăng lên [(ảnh trong RabbitMQ Manager khi dừng test)](https://trantam31.github.io/text2pdf-ktpm/showtestresult/Rbmqver2.png). Vậy là việc chạy thêm các worker đã hiệu quả rõ rệt.
     -  [Lần 3](https://trantam31.github.io/text2pdf-ktpm/showtestresult/10o3t3p100users): với 10 ocr worker 3 translate worker 3 pdf worker, chạy 100 users. Tổng số response fail là 0/555 request. Thời gian phản hồi có thể duy trì được ở mức < 4000ms khi có khoảng 50 người truy cập cùng lúc, nhưng sau đó thì lại tăng dần tuyến tính  
        &#8594; Có thể thấy khi tăng các worker thời gian xử lý đã tiếp tục giảm, và tổng request được gửi đi cũng tăng lên, và số request đợi ở ocr_queue khi dừng test cũng giảm đi [(ảnh trong RabbitMQ Manager khi dừng test)](https://trantam31.github.io/text2pdf-ktpm/showtestresult/Rbmqver3.png). Lần test tiếp theo, sẽ lại tăng ocr worker lên.
     -  [Lần 4](https://trantam31.github.io/text2pdf-ktpm/showtestresult/15o1t1p100users): với 15 ocr worker 1 translate worker 1 pdf worker, chạy 100 users. Tổng số response fail là 3/600 request. Thời gian phản hồi có thể duy trì được ở mức < 4000ms khi có khoảng 70 người truy cập cùng lúc, nhưng sau đó thì lại tăng dần tuyến tính  
        &#8594; Có thể thấy khi tăng các worker thời gian xử lý đã tiếp tục giảm, và tổng request được gửi đi cũng tăng lên, và số request đợi ở ocr_queue khi dừng test cũng giảm đi [(ảnh trong RabbitMQ Manager khi dừng test)](https://trantam31.github.io/text2pdf-ktpm/showtestresult/Rbmqver4.png). Như vậy, có thể thấy, việc tăng các worker đã giúp giảm thời gian phản hồi và gần như không sập. Ở lần test tiếp theo, sẽ tăng lượng người truy cập cùng lúc lên là 600 users.
     - [Lần 5](https://trantam31.github.io/text2pdf-ktpm/showtestresult/15o2t2p600users): với 15 ocr worker 2 translate worker 2 pdf worker, chạy 600 users, lượng tăng 1s là 10 users/s. Tổng số response fail là 20/755 request. Thời gian phản hồi có thể duy trì được ở mức < 4000ms khi có khoảng 70 người truy cập cùng lúc, nhưng sau đó thì lại tăng dần tuyến tính  
        &#8594; Qua lần test này có thể thấy có vẻ hệ thống sẽ không thể sập, tuy nhiên thì thời gian phản hồi không nhỏ. Cách giảm thời gian phản hồi chắc chắn sẽ là tăng lượng worker lên, đặc biệt là ocr worker, do đây là bước xử lý ảnh khá nặng, là nút cổ chai (bottleneck) của hệ thống.  
 - Ngoài ra, đây là kết quả test với 1 request đơn giản để so sánh tốc độ phản hồi của 2 version:
    - Với version cũ: [qua ảnh này](https://trantam31.github.io/text2pdf-ktpm/showtestresult/testApiOldVer.png) ta thấy thời gian phản hồi là 1.23s/1 request.
    - Với version mới: [qua ảnh này](https://trantam31.github.io/text2pdf-ktpm/showtestresult/testApiRabbitMqVer.png) ta thấy thời gian phản hồi là 775ms/1 request.  
      &#8594; Có thể thấy thời gian để xử lý 1 request giảm khá rõ.
### Kết luận
Từ kết quả test, có thể thấy việc áp dụng `Pipes and Filters pattern`, `Message Queue` bằng [RabbitMQ](https://www.rabbitmq.com/) đã giúp hệ thống không bị sập, thời gian phản hồi giảm và có thể dễ dàng scale khi hệ thống trở nên phức tạp.
