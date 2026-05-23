import express from "express";
import z from "zod";
import Faq from "../models/Faq.js";
import ChatLog from "../models/ChatLog.js";
import { requireAuth } from "../middleware/auth.js";
import { ragSearch } from "../services/rag.js";
import { chatCompletion } from "../services/gemini.js";
import { getSemanticCachedResponse, saveToSemanticCache } from "../services/semanticCache.js";
import { resolveDistance } from "../services/googleMaps.js";

const router = express.Router();

// ─── Free mode: basic in-memory FAQ only, no logging, no AI ───────────────
const FREE_FAQS = [
  { k: ["exam", "exams", "schedule", "datesheet"], a: "End-semester exams begin Dec 5, 2026. The full datesheet is published on the Exam Cell board and student portal one week before exams start." },
  { k: ["hostel", "accommodation", "rent"], a: "Annual hostel fee is ₹68,000 (shared) or ₹92,000 (single). Includes mess, electricity, and Wi-Fi." },
  { k: ["admission", "deadline", "apply"], a: "UG admissions close July 15. PG admissions close August 10. Late applications attract a ₹2,000 fee until July 25." },
  { k: ["library", "hours", "timings"], a: "Central Library: 8 AM – 11 PM (Mon–Sat), 10 AM – 6 PM (Sun). 24/7 during exam weeks." },
  { k: ["placement", "job", "recruitment"], a: "Placement season starts Aug 20. Register on the T&P portal and complete pre-placement training." },
  { k: ["fee", "fees"], a: "For specific fee breakdowns, please sign in with your @paruluniversity.ac.in account for detailed answers." },
];

function findFree(query) {
  const q = query.toLowerCase();
  const hit = FREE_FAQS.find((f) => f.k.some((kw) => q.includes(kw)));
  return hit?.a ?? null;
}

const freeSchema = z.object({ question: z.string().min(1).max(500) });

router.post("/free", async (req, res) => {
  try {
    const data = freeSchema.parse(req.body);
    const a = findFree(data.question);
    
    if (a) {
      return res.json({ reply: a, source: "faq" });
    }
    
    return res.json({
      reply: "I only share basic public information in free mode. Sign in with your @paruluniversity.ac.in email to ask anything about campus life and get AI-powered answers.",
      source: "fallback",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Authed mode: DB FAQs → Gemini AI → chat_logs ────────────────────────
const authedSchema = z.object({
  messages: z.array(
    z.object({ 
      role: z.enum(["user", "assistant"]), 
      content: z.string().min(1).max(2000) 
    })
  ).min(1).max(20),
});

router.post("/authed", requireAuth, async (req, res) => {
  try {
    const data = authedSchema.parse(req.body);
    const user = req.user;
    const last = data.messages[data.messages.length - 1].content;
    const q = last.toLowerCase();

    let reply;
    let source;

    // 1) Consult Semantic Cache first (bypasses LLM computation for repeating or highly similar queries!)
    const cachedReply = await getSemanticCachedResponse(last);
    if (cachedReply) {
      reply = cachedReply;
      source = "cache";
    } else {
      // 2) Check if this is a distance or navigation query
      const isDistanceQuery = /(distance|how far|how to reach|way from|walking time|route|location between|between.*and|and.*between|path|direction|navigate|walk to|go to|get to|suggest.*way|suggest.*path|suggest.*route|nearest|locate|where is|take me|guide me|show.*way|which way)/i.test(q);
      
      let resolvedMap = false;

      if (isDistanceQuery) {
        console.log(`[Chat Router] Navigation query detected: "${last}". Parsing landmarks via AI...`);
        
        // Build conversation context so follow-up queries ("suggest me a path") can reference prior messages
        const recentHistory = data.messages.slice(-6).map(m => `${m.role}: ${m.content}`).join("\n");
        
        const parsePrompt = `You are a Parul University campus location parser. Extract the origin and destination from this conversation ONLY if BOTH locations are within the Parul University (PU) campus in Vadodara, Gujarat, India.

Known PU campus landmarks include (but are not limited to): Admin Block, New Building (N-Block), Central Library, Engineering Block, PIT Block, PIET, Pharmacy Block, Boys Hostel, Girls Hostel, Main Gate, Management Block, PIMR, Campus Hospital, Canteen, Auditorium, Sports Ground, Computer Lab, Science Block, Arts Block, Law Block, Commerce Block, Medical Block, Dental Block, Agriculture Block, IT Block, Parking Area, etc.

IMPORTANT: The user's latest message might be a FOLLOW-UP (e.g. "suggest me a path", "how do I get there?"). In that case, look at the EARLIER messages in the conversation to find the origin and destination that were discussed previously.

CONVERSATION HISTORY:
${recentHistory}

RULES:
- If BOTH origin and destination are Parul University campus locations (from current OR earlier messages), return: {"origin": "...", "destination": "...", "isOnCampus": true}
- If EITHER location is NOT on the Parul University campus (e.g. cities, external places, railway stations, airports, malls), return: {"origin": null, "destination": null, "isOnCampus": false}
- If you CANNOT determine two specific campus locations from the conversation, return: {"origin": null, "destination": null, "isOnCampus": null}
- Do NOT include markdown code block formatting in your output, just raw JSON.`;

        try {
          const parserResponseText = await chatCompletion(
            [{ role: "user", content: parsePrompt }],
            "You are a strict Parul University campus geocoding parser. Only extract locations within PU campus. Respond only with valid JSON."
          );

          const cleanJsonText = parserResponseText.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanJsonText);

          if (parsed && parsed.isOnCampus === true && parsed.origin && parsed.destination) {
            console.log(`[Chat Router] Parsed PU Campus Landmarks: "${parsed.origin}" to "${parsed.destination}"`);
            const nav = await resolveDistance(parsed.origin, parsed.destination);
            
            // Build a Google Maps directions URL scoped to PU campus with walking mode
            const mapsOrigin = encodeURIComponent(`${parsed.origin}, Parul University, Vadodara, Gujarat, India`);
            const mapsDest = encodeURIComponent(`${parsed.destination}, Parul University, Vadodara, Gujarat, India`);
            const googleMapsLink = `https://www.google.com/maps/dir/?api=1&origin=${mapsOrigin}&destination=${mapsDest}&travelmode=walking`;

            reply = `📍 **Campus Navigation**

The walking distance between **${parsed.origin}** and **${parsed.destination}** on the Parul University campus is **${nav.distance}**.

* 🚶‍♂️ **Estimated Walk Time**: ${nav.duration}
* 🗺️ **Routing Provider**: ${nav.source}

🧭 **Walking Directions**: Head out from **${parsed.origin}** and follow the main campus pathway towards **${parsed.destination}**. Look for campus signage boards along the route. The path is well-paved and pedestrian-friendly.

🗺️ [**View Route on Google Maps →**](${googleMapsLink})

Have a pleasant walk across campus! 🏫`;
            
            source = "map";
            resolvedMap = true;

            // Cache this navigation response semantically (fire-and-forget, non-blocking)
            saveToSemanticCache(last, reply).catch(e => console.error('[Semantic Cache] Background save failed:', e));
          } else if (parsed && parsed.isOnCampus === false) {
            // User asked about non-campus locations — politely redirect
            reply = "🚫 I can only provide walking distances and navigation details for locations **within the Parul University campus** in Vadodara. Please ask about campus buildings, hostels, blocks, or facilities and I'll be happy to help! 🏫";
            source = "map";
            resolvedMap = true;
          }
          // If isOnCampus is null (couldn't determine locations), fall through to standard AI
        } catch (parseError) {
          console.error("[Chat Router] Distance landmark parsing failed:", parseError);
        }
      }

      // 3) Standard FAQ / RAG AI Flow if not a map query (or if map query extraction failed)
      if (!resolvedMap) {
        // Try DB FAQ keyword match
        const faqs = await Faq.find({}, "question answer keywords").lean();
        const faqHit = faqs.find((f) => f.keywords.some((kw) => q.includes(kw.toLowerCase())));

        if (faqHit) {
          reply = faqHit.answer;
          source = "faq";
        } else {
          // RAG: pull top scraped pages
          const matches = await ragSearch(last, 4);
          const context_blocks = matches
            .map((m, i) => `[Source ${i + 1}] ${m.title ?? m.url}\nURL: ${m.url}\n${m.markdown.substring(0, 2000)}`)
            .join("\n\n---\n\n");

          const prefLines = [];
          if (user.fullName) prefLines.push(`Name: ${user.fullName}`);
          if (user.branch) prefLines.push(`Program / Branch: ${user.branch}`);
          if (user.semester) prefLines.push(`Current semester: ${user.semester}`);
          if (user.hostel) prefLines.push(`Hostel block: ${user.hostel}`);
          
          const studentBlock = prefLines.length
            ? `\n\nSTUDENT PROFILE (use to personalize: tailor exam dates to their semester, scope hostel info to their block, address them by first name occasionally):\n${prefLines.join("\n")}`
            : "";

          const sys = `You are Knoq-AI, the official AI helpdesk for Parul University. Answer using ONLY the SOURCES below when relevant. Cite source numbers like [1], [2]. Be concise (3-6 sentences), warm, and factual. If the sources don't cover the question, answer from general knowledge of Parul University and say "(general info)". If outside campus scope, politely redirect.${studentBlock}

SOURCES:
${context_blocks || "(no indexed pages yet — answer from general knowledge of Parul University)"}`;

          try {
            reply = await chatCompletion(data.messages, sys);
            source = "ai";
            
            // Save successful AI generation to semantic cache (fire-and-forget, non-blocking)
            saveToSemanticCache(last, reply).catch(e => console.error('[Semantic Cache] Background save failed:', e));
          } catch (err) {
            reply = err.message || "Sorry, I couldn't reach the AI service.";
            source = "error";
          }
        }
      }
    }

    // 4) Log Chat Transaction
    await ChatLog.create({
      userId: user._id,
      question: last,
      answer: reply,
      source
    });

    return res.json({ reply, source });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Chat authed error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
