const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

function createPDF(text, filePath) {
    return new Promise((resolve, reject) => {
        try {
            // Đảm bảo thư mục chứa file tồn tại
            const outputDir = path.dirname(filePath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const doc = new PDFDocument();
            const writeStream = fs.createWriteStream(filePath);

            doc.pipe(writeStream);
            doc.font("../font/Roboto-Regular.ttf")
                .fontSize(14)
                .text(text, 100, 100);
            doc.end();

            // Xử lý khi ghi xong
            writeStream.on("finish", () => {
                console.log(`[PDF] File đã được tạo: ${filePath}`);
                resolve(filePath);
            });

            writeStream.on("error", (err) => {
                console.error("[PDF] Lỗi khi ghi file:", err);
                reject(err);
            });
        } catch (error) {
            console.error("[PDF] Lỗi khi tạo PDF:", error);
            reject(error);
        }
    });
}

module.exports = {
    createPDF,
};
