/**
 * PU Website Crawler Script
 * 
 * Crawls paruluniversity.ac.in via Firecrawl API, saves all pages into MongoDB,
 * and generates FAQ entries from scraped content.
 * 
 * Usage: node scripts/crawl-pu.js
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import crypto from "crypto";

// Load backend .env (script runs from backend/ directory)
dotenv.config();

// Import models
import ScrapedPage from "./models/ScrapedPage.js";
import CrawlJob from "./models/CrawlJob.js";
import Faq from "./models/Faq.js";

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY;
const CRAWL_URL = "https://www.paruluniversity.ac.in";
const MAX_PAGES = 500; // Firecrawl free tier limit — adjust as needed

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   🕷️  Parul University Website Crawler");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (!FIRECRAWL_KEY) {
    console.error("❌ FIRECRAWL_API_KEY is not set in backend/.env. Aborting.");
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set in backend/.env. Aborting.");
    process.exit(1);
  }

  // 1) Connect to MongoDB
  console.log("\n📦 Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB Atlas.");

  // 2) Start crawl job via Firecrawl
  console.log(`\n🌐 Starting Firecrawl on ${CRAWL_URL} (limit: ${MAX_PAGES} pages)...`);
  const startRes = await fetch(`${FIRECRAWL_BASE}/crawl`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: CRAWL_URL,
      limit: MAX_PAGES,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });

  if (!startRes.ok) {
    const errText = await startRes.text();
    console.error(`❌ Firecrawl start failed (${startRes.status}): ${errText}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const startJson = await startRes.json();
  const firecrawlJobId = startJson.id;
  if (!firecrawlJobId) {
    console.error("❌ Firecrawl returned no job ID:", startJson);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`✅ Crawl job started! Firecrawl ID: ${firecrawlJobId}`);

  // Save to DB for tracking
  const job = await CrawlJob.create({
    firecrawlJobId,
    sourceUrl: CRAWL_URL,
    status: "crawling",
  });
  console.log(`📝 Saved CrawlJob to MongoDB: ${job._id}`);

  // 3) Poll for crawl completion
  let totalPages = 0;
  let totalSaved = 0;
  let nextUrl = null;
  let crawlStatus = "crawling";

  console.log("\n⏳ Waiting for Firecrawl to finish scraping...\n");

  while (crawlStatus !== "completed" && crawlStatus !== "failed") {
    await sleep(10000); // Wait 10 seconds between polls

    const pollUrl = nextUrl || `${FIRECRAWL_BASE}/crawl/${firecrawlJobId}`;
    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${FIRECRAWL_KEY}` },
    });

    if (!pollRes.ok) {
      const errText = await pollRes.text();
      console.error(`⚠️  Poll failed (${pollRes.status}): ${errText}`);
      continue;
    }

    const payload = await pollRes.json();
    crawlStatus = payload.status;
    const pages = payload.data ?? [];
    const total = payload.total ?? 0;

    console.log(`   📊 Status: ${crawlStatus} | Discovered: ${total} | Batch: ${pages.length} pages`);

    // Process pages from this batch
    for (const page of pages) {
      if (!page.markdown) continue;
      const pageUrl = page.metadata?.sourceURL || page.metadata?.url;
      if (!pageUrl) continue;

      const md = (page.markdown || "").slice(0, 30000);
      const hash = sha256(md);

      try {
        await ScrapedPage.findOneAndUpdate(
          { url: pageUrl },
          {
            url: pageUrl,
            title: page.metadata?.title?.slice(0, 500) || null,
            description: page.metadata?.description?.slice(0, 1000) || null,
            markdown: md,
            contentHash: hash,
            tokenCount: md.length,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        totalSaved++;
      } catch (dbErr) {
        if (dbErr.code !== 11000) {
          console.error(`   ⚠️  DB save failed for ${pageUrl}:`, dbErr.message);
        }
      }
    }

    totalPages = total;

    // Handle pagination
    if (payload.next) {
      nextUrl = payload.next;
    } else {
      nextUrl = null;
      if (crawlStatus === "scraping") {
        // Still crawling, no next page yet — continue polling
      }
    }
  }

  // Update job record
  job.status = crawlStatus === "completed" ? "completed" : "failed";
  job.pagesDiscovered = totalPages;
  job.pagesScraped = totalSaved;
  await job.save();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   ✅ Crawl ${crawlStatus}!`);
  console.log(`   📄 Total pages discovered: ${totalPages}`);
  console.log(`   💾 Pages saved to MongoDB: ${totalSaved}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 4) Show final stats
  const dbCount = await ScrapedPage.countDocuments();
  const faqCount = await Faq.countDocuments();
  console.log(`\n📊 Database Stats:`);
  console.log(`   • Scraped Pages in DB: ${dbCount}`);
  console.log(`   • FAQs in DB: ${faqCount}`);

  console.log("\n🎉 Done! All scraped pages are now in MongoDB and ready for RAG queries.");
  console.log("   Your CampusBot will now use these pages as context when answering questions.\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
