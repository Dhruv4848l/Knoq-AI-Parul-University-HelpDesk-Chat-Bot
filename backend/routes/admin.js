import express from "express";
import ChatLog from "../models/ChatLog.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

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
