import express from "express";
import z from "zod";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const prefsSchema = z.object({
  branch: z.string().max(80).optional().nullable(),
  semester: z.string().max(20).optional().nullable(),
  hostel: z.string().max(120).optional().nullable(),
});

// Get current profile
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("fullName email branch semester hostel");
    res.json({ profile: user });
  } catch (error) {
    res.status(500).json({ error: "Error fetching profile" });
  }
});

// Update profile preferences
router.post("/", requireAuth, async (req, res) => {
  try {
    const data = prefsSchema.parse(req.body);
    
    await User.findByIdAndUpdate(req.user._id, {
      branch: data.branch || null,
      semester: data.semester || null,
      hostel: data.hostel || null,
    });
    
    res.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Error updating profile" });
  }
});

export default router;
