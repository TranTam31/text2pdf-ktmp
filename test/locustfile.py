from locust import HttpUser, task, between, events
import os
import time
from threading import Thread


@events.test_start.add_listener
def start_monitoring(environment, **kwargs):
    """
    Chạy một luồng riêng để theo dõi failures/s và dừng test nếu vượt ngưỡng.
    """
    stop_failure_rate = 5  # Ngưỡng failures/s để dừng test

    def monitor_failure_rate():
        prev_failures = 0  # Số lượng lỗi trước đó
        while True:
            time.sleep(1)  # Chờ 1 giây để tính toán tỷ lệ lỗi
            # Lấy tổng số lỗi từ stats
            current_failures = environment.runner.stats.total.num_failures
            # Tính failures/s
            failure_rate = current_failures - prev_failures
            prev_failures = current_failures  # Cập nhật số lỗi trước đó

            # Log giá trị failure/s để theo dõi
            print(f"Current failures/s: {failure_rate:.2f}")
            
            # Dừng nếu failure/s vượt ngưỡng
            if failure_rate > stop_failure_rate:
                print(f"Stopping test due to high failure rate: {failure_rate:.2f} failures/s")
                environment.runner.quit()
                break

    Thread(target=monitor_failure_rate, daemon=True).start()


class FileUploadUser(HttpUser):
    host = "http://host.docker.internal:3000"
    wait_time = between(1, 5)  # Thời gian chờ giữa các request

    def upload_file(self, endpoint, name):
        """Hàm dùng chung để upload file đến các endpoint"""
        # Tạo đường dẫn đầy đủ tới file
        image_path = "/test/sample.png"

        # Kiểm tra file
        if not os.path.exists(image_path):
            print(f"File {image_path} không tồn tại. Vui lòng kiểm tra.")
            return

        # Gửi file qua POST
        with open(image_path, "rb") as image_file:
            files = {"image": (os.path.basename(image_path), image_file, "image/png")}
            response = self.client.post(endpoint, files=files, name=name)
            
            # Log kết quả
            if response.status_code == 200:
                print(f"File uploaded successfully to {endpoint}!")
            else:
                print(f"Failed to upload file to {endpoint}. Status code: {response.status_code}")

    # dùng để gene ra image test api upload-rabbitmq

    # @task(1)
    # def upload_to_main_endpoint(self):
    #     self.upload_file("/upload-rabbitmq", name="POST /upload-rabbitmq")
    
    # dùng để gene ra image test api upload
    
    @task(1)
    def upload_to_main_endpoint(self):
        self.upload_file("/upload", name="POST /upload")