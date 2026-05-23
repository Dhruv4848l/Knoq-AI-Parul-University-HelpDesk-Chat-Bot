import express from "express";
import z from "zod";
import Faq from "../models/Faq.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

const faqSchema = z.object({
  question: z.string().min(3).max(300),
  answer: z.string().min(3).max(2000),
  keywords: z.array(z.string().min(1).max(50)).max(15),
  category: z.string().min(1).max(50).default("general"),
});

// Get all FAQs (authenticated users)
router.get("/", requireAuth, async (req, res) => {
  try {
    const faqs = await Faq.find().sort({ updatedAt: -1 }).lean();
    
    // Rename _id to id for frontend compatibility
    const mappedFaqs = faqs.map(f => ({
      ...f,
      id: f._id.toString()
    }));
    
    res.json(mappedFaqs);
  } catch (error) {
    res.status(500).json({ error: "Error fetching FAQs" });
  }
});

// Create new FAQ (Admin only)
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = faqSchema.parse(req.body);
    
    const newFaq = await Faq.create({
      ...data,
      createdBy: req.user._id
    });
    
    res.status(201).json({ ok: true, id: newFaq._id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Error creating FAQ" });
  }
});

// Update FAQ (Admin only)
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = faqSchema.parse(req.body);
    
    const updatedFaq = await Faq.findByIdAndUpdate(
      req.params.id,
      { ...data },
      { new: true }
    );
    
    if (!updatedFaq) {
      return res.status(404).json({ error: "FAQ not found" });
    }
    
    res.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Error updating FAQ" });
  }
});

// Delete FAQ (Admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const deletedFaq = await Faq.findByIdAndDelete(req.params.id);
    
    if (!deletedFaq) {
      return res.status(404).json({ error: "FAQ not found" });
    }
    
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Error deleting FAQ" });
  }
});

export default router;
