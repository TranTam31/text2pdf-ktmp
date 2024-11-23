const amqplib = require("amqplib");
const { translate } = require("../utils/translate");

async function startWorker() {
    const connection = await amqplib.connect("amqp://localhost");
    const channel = await connection.createChannel();

    await channel.assertQueue("translate_queue", { durable: true });
    await channel.assertQueue("pdf_queue", { durable: true });

    channel.prefetch(1);
    console.log("[Worker Translate] Đang lắng nghe trên queue 'translate_queue'");

    channel.consume("translate_queue", async (msg) => {
        const { taskId, text } = JSON.parse(msg.content.toString());
        try {
            console.log(`[Worker Translate] Dịch văn bản: ${text}`);
            const translatedText = await translate(text);
            console.log(`[Worker Translate] Hoàn thành dịch, gửi kết quả sang 'pdf_queue'`);
            channel.sendToQueue(
                "pdf_queue",
                Buffer.from(JSON.stringify({ taskId, translatedText }))
            );

            channel.ack(msg);
        } catch (error) {
            console.error("[Worker Translate] Lỗi xử lý dịch:", error);
            channel.nack(msg, false, false);
        }
    });
}

startWorker();
