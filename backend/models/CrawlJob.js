import mongoose from "mongoose";

const crawlJobSchema = new mongoose.Schema(
  {
    firecrawlJobId: { type: String, default: null },
    sourceUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "pending",
      enum: [
        "pending",
        "crawling",
        "syncing",
        "embedding",
        "generating_faqs",
        "completed",
        "failed",
      ],
    },
    pagesDiscovered: { type: Number, default: 0 },
    pagesScraped: { type: Number, default: 0 },
    pagesEmbedded: { type: Number, default: 0 },
    faqsGenerated: { type: Number, default: 0 },
    nextCursor: { type: String, default: null },
    error: { type: String, default: null },
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    startedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const CrawlJob = mongoose.model("CrawlJob", crawlJobSchema);
export default CrawlJob;
