const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const amqplib = require("amqplib");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const upload = multer({ dest: "uploads/" });
app.use(
    cors({
        origin: "*",
    })
);

app.post("/upload-rabbitmq", upload.single("image"), async (req, res) => {
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

        await channel.assertQueue("response_queue", { durable: true });

        channel.consume(
            "response_queue",
            async (msg) => {
                console.log("[Server] Đã nhận được message từ response_queue.");
                const response = JSON.parse(msg.content.toString());
                const pdfBuffer = Buffer.from(response.pdfBuffer, "base64");
                const tempPdfPath = path.resolve(__dirname, `output/${response.taskId}.pdf`);
                fs.writeFileSync(tempPdfPath, pdfBuffer);
                console.log(`[Server] File PDF tạm thời đã được tạo: ${tempPdfPath}`);

                res.set({
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="${response.taskId}.pdf"`,
                    "Content-Length": pdfBuffer.length,
                });

                res.send(pdfBuffer);
                console.log("[Server] Đã gửi file PDF tới client.");
                fs.unlink(tempPdfPath, (err) => {
                    if (err) {
                        console.error(`[Server] Lỗi khi xóa file PDF: ${tempPdfPath}`, err);
                    } else {
                        console.log(`[Server] Đã xóa file PDF: ${tempPdfPath}`);
                    }
                });

                channel.ack(msg);
                console.log(`[Server] Đã xác nhận message từ task: ${response.taskId}`);

                await channel.cancel("response_consumer");
                connection.close();
            },
            { noAck: false, consumerTag: "response_consumer" }
        );
    } catch (error) {
        console.error("[Server] Lỗi gửi task:", error);
        return res.status(500).send("Lỗi máy chủ.");
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server chạy trên cổng ${PORT}`));
