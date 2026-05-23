import mongoose from "mongoose";

const scrapedPageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      unique: true,
    },
    title: { type: String, default: null },
    description: { type: String, default: null },
    markdown: {
      type: String,
      required: true,
    },
    contentHash: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      default: null,
    },
    tokenCount: { type: Number, default: null },
    scrapedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const ScrapedPage = mongoose.model("ScrapedPage", scrapedPageSchema);
export default ScrapedPage;
