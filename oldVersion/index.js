const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const ocr = require("./utils/ocr");
const { createPDF } = require("./utils/pdf");
const { translate } = require("./utils/translate");

const app = express();
const PORT = 3000;

app.use(
    cors({
        origin: "*",
    })
);

// Tạo thư mục lưu file upload nếu chưa tồn tại
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình Multer để lưu file ảnh
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `${timestamp}${ext}`);
    },
});
const upload = multer({ storage });

app.post("/upload", upload.single("image"), async (req, res) => {
    const filePath = req.file.path;
    console.log(`Uploaded file: ${filePath}`);

    try {
        const text = await ocr.image2text(filePath);
        console.log("OCR Text: ", text);

        // Dịch văn bản từ tiếng Anh sang tiếng Việt
        const viText = await translate(text);
        console.log("Translated Text: ", viText);

        // Tạo file PDF từ văn bản đã dịch
        const pdfFile = createPDF(viText);
        console.log("PDF File Created: ", pdfFile);

        const pdfPath = path.join(__dirname, "..", "output", "output.pdf");
        const MAX_WAIT_TIME = 15000;

        const interval = setInterval(() => {
            if (fs.existsSync(pdfPath)) {
                clearInterval(interval);

                res.download(pdfPath, "output.pdf", (err) => {
                    if (err) {
                        console.error("Error sending PDF:", err);
                        res.status(500).send("Error downloading the PDF.");
                    } else {
                        console.log("PDF sent successfully!");
                    }

                    // Xóa file PDF sau khi đã gửi cho người dùng
                    fs.unlink(pdfPath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error("Error deleting PDF file:", unlinkErr);
                        } else {
                            console.log("PDF file deleted successfully.");
                        }
                    });
                });
            }
        }, 500);

        setTimeout(() => {
            clearInterval(interval);
            if (!res.headersSent) {
                res.status(500).send("Processing timeout. Please try again later.");

                // Xóa file PDF nếu đã tạo nhưng không gửi được
                if (fs.existsSync(pdfPath)) {
                    fs.unlink(pdfPath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error("Error deleting timed-out PDF file:", unlinkErr);
                        } else {
                            console.log("Timed-out PDF file deleted successfully.");
                        }
                    });
                }
            }
        }, MAX_WAIT_TIME);

    } catch (error) {
        console.error("Error processing file:", error);

        res.status(500).send("An error occurred while processing the file.");
    } finally {
        // Xóa file ảnh sau khi đã xử lý
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
                console.error("Error deleting uploaded image file:", unlinkErr);
            } else {
                console.log("Uploaded image file deleted successfully.");
            }
        });
    }
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
