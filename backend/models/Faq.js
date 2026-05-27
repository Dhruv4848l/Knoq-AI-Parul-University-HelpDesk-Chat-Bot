import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      maxlength: 300,
    },
    answer: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    keywords: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      default: "general",
      maxlength: 50,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Text index for keyword search
faqSchema.index({ keywords: 1 });
faqSchema.index({ category: 1 });

const Faq = mongoose.model("Faq", faqSchema);
export default Faq;
