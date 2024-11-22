// const express = require("express");
// const multer = require("multer");
// const { v4: uuidv4 } = require("uuid");
// const amqplib = require("amqplib");
// const fs = require("fs");
// const path = require("path");

// const app = express();
// const upload = multer({ dest: "uploads/" });

// app.post("/upload", upload.single("image"), async (req, res) => {
//     const file = req.file;

//     if (!file) {
//         return res.status(400).send("Không có file được upload.");
//     }

//     const taskId = uuidv4();
//     const message = { filePath: file.path, taskId };

//     try {
//         const connection = await amqplib.connect("amqp://localhost");
//         const channel = await connection.createChannel();

//         await channel.assertQueue("ocr_queue", { durable: true });

//         console.log(`[Server] Gửi task ${taskId} đến 'ocr_queue'`);
//         channel.sendToQueue("ocr_queue", Buffer.from(JSON.stringify(message)));

//         // Lắng nghe kết quả từ queue 'response_queue'
//         await channel.assertQueue("response_queue", { durable: true });

//         channel.consume(
//             "response_queue",
//             async (msg) => {
//                 console.log("[Server] Đã nhận được message từ response_queue.");
        
//                 const response = JSON.parse(msg.content.toString());
//                 // console.log(`[Server] Nội dung message: ${JSON.stringify(response)}`);
        
//                 if (response.taskId === taskId) {
//                     console.log(`[Server] Task ID khớp: ${taskId}`);
        
//                     const pdfBuffer = Buffer.from(response.pdfBuffer, "base64");
        
//                     // Lưu file PDF tạm thời
//                     const tempPdfPath = path.resolve(__dirname, `output/${taskId}.pdf`);
//                     fs.writeFileSync(tempPdfPath, pdfBuffer);
        
//                     console.log(`[Server] File PDF tạm thời đã được tạo: ${tempPdfPath}`);
        
//                     // Thiết lập header để tải file PDF
//                     res.set({
//                         "Content-Type": "application/pdf",
//                         "Content-Disposition": `attachment; filename="${taskId}.pdf"`,
//                         "Content-Length": pdfBuffer.length,
//                     });
        
//                     // Gửi file PDF tới client
//                     res.send(pdfBuffer);
        
//                     console.log("[Server] Đã gửi file PDF tới client.");
        
//                     // Xóa file PDF sau khi gửi
//                     fs.unlink(tempPdfPath, (err) => {
//                         if (err) {
//                             console.error(`[Server] Lỗi khi xóa file PDF: ${tempPdfPath}`, err);
//                         } else {
//                             console.log(`[Server] Đã xóa file PDF: ${tempPdfPath}`);
//                         }
//                     });
        
//                     // Xác nhận message đã được xử lý
//                     channel.ack(msg);
//                     console.log(`[Server] Đã xác nhận message từ task: ${taskId}`);
        
//                     // Hủy tiêu thụ sau khi hoàn thành xử lý
//                     await channel.cancel("response_consumer");
//                     connection.close();
//                 } else {
//                     console.log(`[Server] Task ID không khớp. Bỏ qua message.`);
//                     channel.ack(msg);
//                 }
//             },
//             { noAck: false, consumerTag: "response_consumer" } // Thêm consumerTag để quản lý việc hủy tiêu thụ
//         );
        
        
//     } catch (error) {
//         console.error("[Server] Lỗi gửi task:", error);
//         return res.status(500).send("Lỗi máy chủ.");
//     }
// });

// // Khởi động server
// const PORT = 3000;
// app.listen(PORT, () => console.log(`Server chạy trên cổng ${PORT}`));

const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const amqplib = require("amqplib");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("image"), async (req, res) => {
    const file = req.file;

    if (!file) {
        return res.status(400).send("Không có file được upload.");
    }

    const taskId = uuidv4();
    const message = { filePath: file.path, taskId };

    try {
        const connection = await amqplib.connect("amqp://localhost");
        const channel = await connection.createChannel();

        await channel.assertQueue("ocr_queue", { durable: true });

        console.log(`[Server] Gửi task ${taskId} đến 'ocr_queue'`);
        channel.sendToQueue("ocr_queue", Buffer.from(JSON.stringify(message)));

        // Lắng nghe kết quả từ queue 'response_queue'
        await channel.assertQueue("response_queue", { durable: true });

        channel.consume(
            "response_queue",
            async (msg) => {
                console.log("[Server] Đã nhận được message từ response_queue.");

                const response = JSON.parse(msg.content.toString());

                const pdfBuffer = Buffer.from(response.pdfBuffer, "base64");

                // Lưu file PDF tạm thời
                const tempPdfPath = path.resolve(__dirname, `output/${response.taskId}.pdf`);
                fs.writeFileSync(tempPdfPath, pdfBuffer);

                console.log(`[Server] File PDF tạm thời đã được tạo: ${tempPdfPath}`);

                // Thiết lập header để tải file PDF
                res.set({
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="${response.taskId}.pdf"`,
                    "Content-Length": pdfBuffer.length,
                });

                // Gửi file PDF tới client
                res.send(pdfBuffer);

                console.log("[Server] Đã gửi file PDF tới client.");

                // Xóa file PDF sau khi gửi
                fs.unlink(tempPdfPath, (err) => {
                    if (err) {
                        console.error(`[Server] Lỗi khi xóa file PDF: ${tempPdfPath}`, err);
                    } else {
                        console.log(`[Server] Đã xóa file PDF: ${tempPdfPath}`);
                    }
                });

                // Xác nhận message đã được xử lý
                channel.ack(msg);
                console.log(`[Server] Đã xác nhận message từ task: ${response.taskId}`);

                // Hủy tiêu thụ sau khi hoàn thành xử lý
                await channel.cancel("response_consumer");
                connection.close();
            },
            { noAck: false, consumerTag: "response_consumer" } // Thêm consumerTag để quản lý việc hủy tiêu thụ
        );
    } catch (error) {
        console.error("[Server] Lỗi gửi task:", error);
        return res.status(500).send("Lỗi máy chủ.");
    }
});

// Khởi động server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server chạy trên cổng ${PORT}`));
