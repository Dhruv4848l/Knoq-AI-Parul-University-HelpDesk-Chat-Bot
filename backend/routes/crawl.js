import express from "express";
import z from "zod";
import crypto from "crypto";
import CrawlJob from "../models/CrawlJob.js";
import ScrapedPage from "../models/ScrapedPage.js";
import Faq from "../models/Faq.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { embedTexts, extractFaqs } from "../services/gemini.js";

const router = express.Router();
const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";

const fcKey = () => {
  const k = process.env.FIRECRAWL_API_KEY;
  if (!k) throw new Error("FIRECRAWL_API_KEY not configured");
  return k;
};

const sha256 = (s) => {
  return crypto.createHash('sha256').update(s).digest('hex');
};

// Start a crawl job
router.post("/start", requireAuth, requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      url: z.string().url().default("https://www.paruluniversity.ac.in"),
      limit: z.number().min(1).max(5000).default(2000),
    });
    
    const data = schema.parse(req.body || {});

    // Call Firecrawl API
    const response = await fetch(`${FIRECRAWL_BASE}/crawl`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${fcKey()}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        url: data.url,
        limit: data.limit,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Firecrawl start failed: ${text}` });
    }

    const json = await response.json();
    if (!json.id) {
      return res.status(500).json({ error: "Firecrawl did not return a job id" });
    }

    const job = await CrawlJob.create({
      firecrawlJobId: json.id,
      sourceUrl: data.url,
      status: "crawling",
      startedBy: req.user._id,
    });

    res.json({ jobId: job._id.toString(), firecrawlId: json.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Start crawl error:", error);
    res.status(500).json({ error: error.message || "Error starting crawl" });
  }
});

// Sync crawl results
router.post("/sync", requireAuth, requireAdmin, async (req, res) => {
  try {
    const schema = z.object({ jobId: z.string() });
    const { jobId } = schema.parse(req.body);

    const job = await CrawlJob.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.status === "completed" || job.status === "failed") {
      return res.json({ 
        done: true, 
        status: job.status, 
        pagesScraped: job.pagesScraped, 
        pagesEmbedded: job.pagesEmbedded 
      });
    }

    // Fetch from Firecrawl
    const url = job.nextCursor || `${FIRECRAWL_BASE}/crawl/${job.firecrawlJobId}`;
    const response = await fetch(url, { 
      headers: { Authorization: `Bearer ${fcKey()}` } 
    });

    if (!response.ok) {
      const text = await response.text();
      job.status = "failed";
      job.error = `Status ${response.status}: ${text}`;
      await job.save();
      return res.status(response.status).json({ error: job.error });
    }

    const payload = await response.json();
    const pages = payload.data ?? [];
    
    let newCount = 0;
    let embeddedCount = 0;

    // Process in chunks
    for (let i = 0; i < pages.length; i += 10) {
      const chunk = pages
        .slice(i, i + 10)
        .filter((p) => p.markdown && (p.metadata?.sourceURL || p.metadata?.url));

      const records = await Promise.all(
        chunk.map(async (p) => {
          const pageUrl = (p.metadata.sourceURL || p.metadata.url);
          const md = (p.markdown || "").slice(0, 30000);
          return {
            url: pageUrl,
            title: p.metadata?.title?.slice(0, 500) || null,
            description: p.metadata?.description?.slice(0, 1000) || null,
            markdown: md,
            contentHash: sha256(md),
          };
        })
      );

      if (records.length === 0) continue;

      // Embed texts
      const embedTextsArgs = records.map((r) => `${r.title ?? ""}\n\n${r.markdown}`.slice(0, 8000));
      let embeddings = [];
      try {
        embeddings = await embedTexts(embedTextsArgs);
      } catch (e) {
        console.error("Embedding chunk failed:", e);
      }

      // Upsert to DB
      for (let idx = 0; idx < records.length; idx++) {
        const record = records[idx];
        const embedding = embeddings[idx] || null;

        const result = await ScrapedPage.findOneAndUpdate(
          { url: record.url },
          { ...record, embedding, tokenCount: record.markdown.length },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        newCount++;
        if (embedding) embeddedCount++;
      }
    }

    const isDone = !payload.next && (payload.status === "completed" || payload.status === "scraping");
    const stillCrawling = payload.status === "scraping" && !payload.next;

    const status = payload.next
      ? "syncing"
      : payload.status === "completed"
        ? "completed"
        : stillCrawling
          ? "crawling"
          : "syncing";

    job.status = status;
    job.nextCursor = payload.next ?? null;
    job.pagesDiscovered = payload.total ?? job.pagesDiscovered;
    job.pagesScraped += newCount;
    job.pagesEmbedded += embeddedCount;
    await job.save();

    res.json({
      done: status === "completed",
      status,
      pagesScraped: job.pagesScraped,
      pagesEmbedded: job.pagesEmbedded,
      total: job.pagesDiscovered,
      hasNext: !!payload.next,
    });
  } catch (error) {
    console.error("Sync crawl error:", error);
    res.status(500).json({ error: error.message || "Error syncing crawl" });
  }
});

// Generate FAQs from pages
router.post("/generate-faqs", requireAuth, requireAdmin, async (req, res) => {
  try {
    const schema = z.object({ 
      jobId: z.string(), 
      batchSize: z.number().min(1).max(20).default(5) 
    });
    const data = schema.parse(req.body);

    const job = await CrawlJob.findById(data.jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const offset = job.faqsGenerated ?? 0;
    const pages = await ScrapedPage.find()
      .sort({ scrapedAt: 1 })
      .skip(offset)
      .limit(data.batchSize);

    if (!pages || pages.length === 0) {
      job.status = "completed";
      await job.save();
      return res.json({ done: true, generated: 0 });
    }

    let generated = 0;
    for (const page of pages) {
      try {
        const parsed = await extractFaqs(page.url, page.title, page.markdown);
        
        for (const f of parsed.faqs ?? []) {
          if (!f.question || !f.answer) continue;
          
          await Faq.create({
            question: f.question.slice(0, 300),
            answer: f.answer.slice(0, 2000),
            keywords: (f.keywords ?? []).slice(0, 10).map((k) => k.toLowerCase().slice(0, 50)),
            category: (f.category ?? "general").slice(0, 50),
            createdBy: req.user._id,
          });
          generated++;
        }
      } catch (e) {
        console.error("FAQ gen failed for", page.url, e);
      }
    }

    job.faqsGenerated += pages.length;
    job.status = pages.length < data.batchSize ? "completed" : "generating_faqs";
    await job.save();

    res.json({ done: pages.length < data.batchSize, generated, processed: pages.length });
  } catch (error) {
    console.error("Generate FAQs error:", error);
    res.status(500).json({ error: "Error generating FAQs" });
  }
});

// Get single job
router.post("/job", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { jobId } = req.body;
    const job = await CrawlJob.findById(jobId).lean();
    if (!job) return res.status(404).json({ error: "Job not found" });
    
    res.json({ job: { ...job, id: job._id.toString(), started_at: job.startedAt, pages_scraped: job.pagesScraped, pages_embedded: job.pagesEmbedded, faqs_generated: job.faqsGenerated, pages_discovered: job.pagesDiscovered } });
  } catch (error) {
    res.status(500).json({ error: "Error fetching job" });
  }
});

// List jobs
router.get("/jobs", requireAuth, requireAdmin, async (req, res) => {
  try {
    const jobs = await CrawlJob.find().sort({ startedAt: -1 }).limit(20).lean();
    const mappedJobs = jobs.map(j => ({
      ...j,
      id: j._id.toString(),
      started_at: j.startedAt,
      pages_scraped: j.pagesScraped,
      pages_embedded: j.pagesEmbedded,
      faqs_generated: j.faqsGenerated,
      pages_discovered: j.pagesDiscovered
    }));
    res.json({ jobs: mappedJobs });
  } catch (error) {
    res.status(500).json({ error: "Error fetching jobs" });
  }
});

// Get stats
router.get("/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const pages = await ScrapedPage.countDocuments();
    const embedded = await ScrapedPage.countDocuments({ embedding: { $ne: null } });
    const faqs = await Faq.countDocuments();
    
    res.json({ pages, embedded, faqs });
  } catch (error) {
    res.status(500).json({ error: "Error fetching stats" });
  }
});

export default router;
