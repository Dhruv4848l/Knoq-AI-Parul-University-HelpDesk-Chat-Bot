import mongoose from "mongoose";

const semanticCacheSchema = new mongoose.Schema({
  question: { type: String, required: true, unique: true },
  answer: { type: String, required: true },
  embedding: { type: [Number], required: true }, // 1536-dimensional vector
  createdAt: { type: Date, default: Date.now }
});

const SemanticCache = mongoose.model("SemanticCache", semanticCacheSchema);
export default SemanticCache;
