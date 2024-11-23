const amqplib = require("amqplib");
const fs = require("fs");
const path = require("path");
const { createPDF } = require("../utils/pdf");

async function startWorker() {
    const connection = await amqplib.connect("amqp://localhost");
    const channel = await connection.createChannel();

    await channel.assertQueue("pdf_queue", { durable: true });
    await channel.assertQueue("response_queue", { durable: true });

    channel.prefetch(1);
    console.log("[Worker PDF] Đang lắng nghe trên queue 'pdf_queue'");
    channel.consume("pdf_queue", async (msg) => {
        const { taskId, translatedText } = JSON.parse(msg.content.toString());
        try {
            console.log(`[Worker PDF] Tạo PDF cho task: ${taskId}`);
            const pdfFilePath = path.resolve(__dirname, `../output/${taskId}.pdf`);
            await createPDF(translatedText, pdfFilePath);
            const pdfBuffer = fs.readFileSync(pdfFilePath);
            channel.sendToQueue(
                "response_queue",
                Buffer.from(JSON.stringify({ taskId, pdfBuffer: pdfBuffer.toString("base64") }))
            );

            console.log(`[Worker PDF] Hoàn thành PDF: ${pdfFilePath}`);
            channel.ack(msg);
        } catch (error) {
            console.error("[Worker PDF] Lỗi xử lý tạo PDF:", error);
            channel.nack(msg, false, false);
        }
    });
}

startWorker();
