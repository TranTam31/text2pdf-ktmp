const amqplib = require("amqplib");
const fs = require("fs");
const path = require("path");
const ocr = require("../utils/ocr");

async function startWorker() {
    const connection = await amqplib.connect("amqp://localhost");
    const channel = await connection.createChannel();

    await channel.assertQueue("ocr_queue", { durable: true });
    await channel.assertQueue("translate_queue", { durable: true });

    channel.prefetch(1);
    console.log("[Worker OCR] Đang lắng nghe trên queue 'ocr_queue'");

    channel.consume("ocr_queue", async (msg) => {
        const { filePath, taskId } = JSON.parse(msg.content.toString());
        const absolutePath = path.resolve(__dirname, "..", filePath);

        try {
            console.log(`[Worker OCR] Xử lý OCR cho file: ${absolutePath}`);

            const text = await ocr.image2text(absolutePath);

            console.log(`[Worker OCR] OCR hoàn thành, gửi kết quả sang 'translate_queue'`);
            channel.sendToQueue(
                "translate_queue",
                Buffer.from(JSON.stringify({ taskId, text }))
            );

            fs.unlink(absolutePath, (err) => {
                if (err) {
                    console.error(`[Worker OCR] Lỗi khi xóa file ảnh: ${absolutePath}`, err);
                } else {
                    console.log(`[Worker OCR] Đã xóa file ảnh: ${absolutePath}`);
                }
            });

            channel.ack(msg);
        } catch (error) {
            console.error("[Worker OCR] Lỗi xử lý OCR:", error);
            channel.nack(msg, false, false);
        }
    });
}

startWorker();
