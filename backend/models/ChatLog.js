import mongoose from "mongoose";

const chatLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      enum: ["faq", "ai", "error", "fallback", "cache", "map"],
      default: "ai",
    },
  },
  { timestamps: true }
);

chatLogSchema.index({ userId: 1, createdAt: -1 });

const ChatLog = mongoose.model("ChatLog", chatLogSchema);
export default ChatLog;
