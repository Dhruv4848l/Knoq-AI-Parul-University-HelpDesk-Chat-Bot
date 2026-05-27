import express from "express";
import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ChatLog from "../models/ChatLog.js";
import BrochurePage from "../models/BrochurePage.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { embedTexts } from "../services/gemini.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer storage
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  }
});

// Get active brochure info
router.get("/brochure", requireAuth, requireAdmin, async (req, res) => {
  try {
    const totalPages = await BrochurePage.countDocuments();
    if (totalPages === 0) {
      return res.json({ active: false });
    }

    const samplePage = await BrochurePage.findOne().sort({ createdAt: -1 }).lean();
    res.json({
      active: true,
      pdfName: samplePage ? samplePage.pdfName : "Unknown",
      totalPages,
      uploadedAt: samplePage ? samplePage.createdAt : null,
    });
  } catch (error) {
    console.error("Error fetching brochure status:", error);
    res.status(500).json({ error: "Error fetching brochure status" });
  }
});

// Delete active brochure
router.delete("/brochure", requireAuth, requireAdmin, async (req, res) => {
  try {
    await BrochurePage.deleteMany({});
    
    // Clean old files in uploads directory
    try {
      const files = await fs.promises.readdir(uploadDir);
      for (const file of files) {
        await fs.promises.unlink(path.join(uploadDir, file));
      }
    } catch (e) {
      console.error("Failed to clean uploads directory:", e);
    }

    res.json({ success: true, message: "Brochure deleted successfully" });
  } catch (error) {
    console.error("Error deleting brochure:", error);
    res.status(500).json({ error: "Error deleting brochure" });
  }
});

// Upload and process PDF brochure
router.post("/brochure/upload", requireAuth, requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Please select a PDF file." });
    }

    const originalName = req.file.originalname;
    const filePath = req.file.path;
    const dataBuffer = fs.readFileSync(filePath);

    // 1. Wipe existing brochure pages in MongoDB (Update/Replace requirement)
    await BrochurePage.deleteMany({});

    // Clean other files in uploads directory to save space (keep only current)
    try {
      const files = await fs.promises.readdir(uploadDir);
      for (const file of files) {
        if (file !== req.file.filename) {
          await fs.promises.unlink(path.join(uploadDir, file));
        }
      }
    } catch (e) {
      console.error("Failed to clean older upload files:", e);
    }

    // 2. Parse PDF page-by-page
    const pagesText = [];
    const options = {
      pagerender: (pageData) => {
        return pageData.getTextContent().then((textContent) => {
          let lastY, text = "";
          for (let item of textContent.items) {
            if (lastY === item.transform[5] || !lastY) {
              text += item.str + " ";
            } else {
              text += "\n" + item.str + " ";
            }
            lastY = item.transform[5];
          }
          pagesText.push({
            pageNumber: pageData.pageIndex + 1,
            text: text.trim()
          });
          return text;
        });
      }
    };

    await pdf(dataBuffer, options);

    // Sort parsed pages by pageNumber to guarantee they are ordered
    pagesText.sort((a, b) => a.pageNumber - b.pageNumber);

    const validPages = pagesText.filter(p => p.text.length > 10);
    if (validPages.length === 0) {
      return res.status(400).json({ error: "No readable text found in the PDF. It might be scanned or image-only." });
    }

    // 3. Generate embeddings in batches of 5 to avoid rate-limiting
    const batchSize = 5;
    let embeddedCount = 0;

    for (let i = 0; i < validPages.length; i += batchSize) {
      const batch = validPages.slice(i, i + batchSize);
      const textsToEmbed = batch.map(b => `${originalName} Page ${b.pageNumber}\n\n${b.text}`.substring(0, 8000));
      
      let embeddings = [];
      try {
        embeddings = await embedTexts(textsToEmbed);
      } catch (embedError) {
        console.error(`Embedding batch starting at index ${i} failed. Using dummy embeddings.`, embedError);
        embeddings = batch.map(() => new Array(768).fill(0));
      }

      // Save each page document to database
      for (let j = 0; j < batch.length; j++) {
        const pageData = batch[j];
        const embedding = embeddings[j] || [];
        
        await BrochurePage.create({
          pdfName: originalName,
          pageNumber: pageData.pageNumber,
          totalPages: validPages.length,
          text: pageData.text,
          embedding: embedding
        });

        if (embedding) {
          embeddedCount++;
        }
      }
    }

    res.json({
      success: true,
      pdfName: originalName,
      totalPages: validPages.length,
      embeddedPages: embeddedCount,
      message: `Brochure processed successfully! ${validPages.length} pages extracted and ${embeddedCount} page embeddings created.`
    });

  } catch (error) {
    console.error("Error processing brochure PDF upload:", error);
    // Cleanup physical file on failure
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ error: error.message || "Error processing brochure PDF upload" });
  }
});

// Original route for chat-logs
router.get("/chat-logs", requireAuth, requireAdmin, async (req, res) => {
  try {
    const logs = await ChatLog.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
      
    // Rename _id to id, and createdAt to created_at for frontend compatibility
    const mappedLogs = logs.map(l => ({
      ...l,
      id: l._id.toString(),
      created_at: l.createdAt,
      user_id: l.userId
    }));
    
    res.json({ logs: mappedLogs });
  } catch (error) {
    console.error("Error fetching chat logs:", error);
    res.status(500).json({ error: "Error fetching chat logs" });
  }
});

export default router;
