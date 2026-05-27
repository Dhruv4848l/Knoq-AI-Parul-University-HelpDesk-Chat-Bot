import express from "express";
import z from "zod";
import Faq from "../models/Faq.js";
import ChatLog from "../models/ChatLog.js";
import CampusRoute from "../models/CampusRoute.js";
import { requireAuth } from "../middleware/auth.js";
import { ragSearch } from "../services/rag.js";
import { chatCompletion } from "../services/gemini.js";
import { getSemanticCachedResponse, saveToSemanticCache } from "../services/semanticCache.js";
import { resolveDistance } from "../services/googleMaps.js";

const router = express.Router();

// ─── Fuzzy text search helper ─────────────────────────────────────────────
// Generates a regex that tolerates 1-2 character typos by making each char
// optional or allowing wildcards. Works for short queries like "btech" "hostle"
function buildFuzzyTokens(query) {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')          // strip punctuation
    .split(/\s+/)
    .filter(w => w.length >= 3);      // only words ≥3 chars
}

function scoreChunk(chunkAnswer, searchTokens) {
  const lower = chunkAnswer.toLowerCase();
  let score = 0;
  for (const token of searchTokens) {
    if (lower.includes(token)) {
      score += 3; // exact token match
    } else {
      // Fuzzy: allow 1-char difference (check if removing any 1 char from 
      // the token still matches)
      for (let i = 0; i < token.length; i++) {
        const fuzzy = token.slice(0, i) + token.slice(i + 1);
        if (fuzzy.length >= 3 && lower.includes(fuzzy)) {
          score += 1;
          break;
        }
      }
    }
  }
  return score;
}

// Search public FAQ chunks with fuzzy matching
async function searchPublicData(query, limit = 5) {
  const publicFaqs = await Faq.find({ isPublic: true }).lean();
  const tokens = buildFuzzyTokens(query);
  if (tokens.length === 0) return [];

  const scored = publicFaqs
    .map(f => ({ ...f, score: scoreChunk(f.answer + ' ' + f.question, tokens) }))
    .filter(f => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

// ─── Free mode ────────────────────────────────────────────────────────────

const freeSchema = z.object({
  messages: z.array(
    z.object({ 
      role: z.enum(["user", "assistant"]), 
      content: z.string().min(1).max(2000) 
    })
  ).min(1).max(20),
});

router.post("/free", async (req, res) => {
  try {
    const data = freeSchema.parse(req.body);
    const lastMessage = data.messages[data.messages.length - 1].content;

    // Build combined search query from recent user messages (handles follow-ups)
    const recentUserMsgs = data.messages
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content)
      .join(" ");

    const relevantChunks = await searchPublicData(recentUserMsgs, 5);

    if (relevantChunks.length > 0) {
      const context = relevantChunks.map(c => c.answer).join("\n\n---\n\n");
      const sysPrompt = `You are Knoq-AI, the official AI helpdesk for Parul University (free mode). Answer ONLY using the SOURCES below. Be concise (2-4 sentences), accurate, and helpful. If the user has typos, understand what they meant. If the sources don't cover the question, say "I have limited info in free mode — sign in with your @paruluniversity.ac.in email for full AI access."

SOURCES:
${context}`;
      
      try {
        const reply = await chatCompletion(data.messages, sysPrompt);
        return res.json({ reply, source: "ai (public data)" });
      } catch (aiErr) {
        console.error("[Free Chat] AI error:", aiErr.message);
        return res.json({ reply: "Sorry, the AI service is temporarily unavailable. Please try again.", source: "error" });
      }
    }
    
    return res.json({
      reply: "I couldn't find specific information for that query in free mode. Sign in with your @paruluniversity.ac.in email to get full AI-powered answers with access to the complete knowledge base!",
      source: "fallback",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("[Free Chat] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Authed mode ──────────────────────────────────────────────────────────

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
    let matchedSources = [];

    // 1) Semantic Cache — instant response for repeat/similar queries
    const cachedReply = await getSemanticCachedResponse(last);
    if (cachedReply) {
      // Log & return immediately
      await ChatLog.create({ userId: user._id, question: last, answer: cachedReply, source: "cache" }).catch(() => {});
      return res.json({ reply: cachedReply, source: "cache" });
    }

    // 2) Navigation query detection
    const isDistanceQuery = /(distance|how far|how to reach|way from|walking time|route|location between|between.*and|and.*between|path|direction|navigate|walk to|go to|get to|suggest.*way|suggest.*path|suggest.*route|nearest|locate|where is|take me|guide me|show.*way|which way)/i.test(q);

    if (isDistanceQuery) {
      console.log(`[Chat Router] Navigation query detected: "${last}"`);
      
      const recentHistory = data.messages.slice(-6).map(m => `${m.role}: ${m.content}`).join("\n");
      
      const parsePrompt = `You are a Parul University campus location parser. Extract origin and destination from this conversation ONLY if BOTH are within PU campus (Vadodara, Gujarat, India).

Known PU landmarks: Admin Block, New Building (N-Block), Central Library, Engineering Block, PIT Block, PIET, Pharmacy Block, Boys Hostel, Girls Hostel, Main Gate, Management Block, PIMR, Campus Hospital, Canteen, Auditorium, Sports Ground, Computer Lab, Science Block, Arts Block, Law Block (L Block), Commerce Block, Medical Block, Dental Block, Agriculture Block, IT Block, Parking Area, Atal Bhavan, Sarojini Bhawan, Basketball Court, etc.

IMPORTANT: "L block" means "Law Block". Handle typos and abbreviations.
The user's latest message might be a FOLLOW-UP. Check EARLIER messages for context.

CONVERSATION:
${recentHistory}

RULES:
- Both locations on campus → {"origin":"...","destination":"...","isOnCampus":true}
- Either location off campus → {"origin":null,"destination":null,"isOnCampus":false}
- Cannot determine → {"origin":null,"destination":null,"isOnCampus":null}
- No markdown code blocks, just raw JSON.`;

      try {
        const parsed = JSON.parse(
          (await chatCompletion([{ role: "user", content: parsePrompt }], "Respond only with valid JSON."))
            .replace(/```json/g, "").replace(/```/g, "").trim()
        );

        if (parsed?.isOnCampus === true && parsed.origin && parsed.destination) {
          console.log(`[Chat Router] Landmarks: "${parsed.origin}" → "${parsed.destination}"`);
          
          // Flexible regex search in CampusRoute DB
          const buildFlexRegex = (name) => {
            const parts = name.split(/[^a-zA-Z0-9]+/).filter(Boolean);
            return new RegExp(parts.join('.*'), 'i');
          };
          
          const originRegex = buildFlexRegex(parsed.origin);
          const destRegex = buildFlexRegex(parsed.destination);
          
          const localRoute = await CampusRoute.findOne({
            $or: [
              { fromName: originRegex, toName: destRegex },
              { fromName: destRegex, toName: originRegex }
            ]
          });

          if (localRoute) {
            console.log("[Chat Router] Found route in local dataset.");
            reply = `📍 **Campus Navigation**\n\nThe walking distance between **${localRoute.fromName}** and **${localRoute.toName}** is approximately **${localRoute.distanceMeters} meters**.\n\n* 🚶‍♂️ **Estimated Walk Time**: ${localRoute.walkMinutes} minutes\n* 🗺️ **Routing Provider**: Parul University Official Dataset\n\n🧭 **Walking Directions**: ${localRoute.directionNatural}\n\nHave a pleasant walk across campus! 🏫`;
            source = "dataset";
          } else {
            console.log("[Chat Router] Not in local dataset. Using Google Maps.");
            const nav = await resolveDistance(parsed.origin, parsed.destination);
            const mapsOrigin = encodeURIComponent(`${parsed.origin}, Parul University, Vadodara, Gujarat, India`);
            const mapsDest = encodeURIComponent(`${parsed.destination}, Parul University, Vadodara, Gujarat, India`);
            const googleMapsLink = `https://www.google.com/maps/dir/?api=1&origin=${mapsOrigin}&destination=${mapsDest}&travelmode=walking`;

            reply = `📍 **Campus Navigation**\n\nThe walking distance between **${parsed.origin}** and **${parsed.destination}** is **${nav.distance}**.\n\n* 🚶‍♂️ **Estimated Walk Time**: ${nav.duration}\n* 🗺️ **Routing Provider**: ${nav.source}\n\n🗺️ [**View Route on Google Maps →**](${googleMapsLink})\n\nHave a pleasant walk across campus! 🏫`;
            source = "map";
          }
          
          saveToSemanticCache(last, reply).catch(() => {});
          await ChatLog.create({ userId: user._id, question: last, answer: reply, source }).catch(() => {});
          return res.json({ reply, source });

        } else if (parsed?.isOnCampus === false) {
          reply = "🚫 I can only provide navigation for locations **within the Parul University campus**. Please ask about campus buildings, hostels, or facilities!";
          source = "map";
          await ChatLog.create({ userId: user._id, question: last, answer: reply, source }).catch(() => {});
          return res.json({ reply, source });
        }
        // isOnCampus === null → fall through to standard AI
      } catch (parseError) {
        console.error("[Chat Router] Navigation parsing failed:", parseError.message);
        // Fall through to standard AI
      }
    }

    // 3) Search datasheet + FAQ database with fuzzy matching
    const recentUserMsgs = data.messages
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content)
      .join(" ");

    const datasheetHits = await searchPublicData(recentUserMsgs, 4);
    
    // Also try traditional FAQ keyword match
    const allFaqs = await Faq.find({ isPublic: { $ne: true } }, "question answer keywords").lean();
    const faqHit = allFaqs.find(f => f.keywords?.some(kw => q.includes(kw.toLowerCase())));

    // 4) RAG search on scraped pages / brochure
    const matches = await ragSearch(last, 3);
    const isBrochure = matches.some(m => m.url?.startsWith("brochure://"));

    // 5) Build combined context for AI
    let contextBlocks = [];

    // Add datasheet hits
    if (datasheetHits.length > 0) {
      datasheetHits.forEach((hit, i) => {
        contextBlocks.push(`[Datasheet ${i + 1}] ${hit.answer}`);
      });
    }

    // Add FAQ hit
    if (faqHit) {
      contextBlocks.push(`[FAQ] Q: ${faqHit.question}\nA: ${faqHit.answer}`);
    }

    // Add RAG hits
    matches.forEach((m, i) => {
      if (m.pageNumber) {
        contextBlocks.push(`[Source ${i + 1}] Brochure: ${m.pdfName}, Page: ${m.pageNumber}\n${m.markdown.substring(0, 2000)}`);
      } else {
        contextBlocks.push(`[Source ${i + 1}] ${m.title || m.url}\n${m.markdown.substring(0, 2000)}`);
      }
    });

    const allContext = contextBlocks.join("\n\n---\n\n");

    // Build student profile
    const prefLines = [];
    if (user.fullName) prefLines.push(`Name: ${user.fullName}`);
    if (user.branch) prefLines.push(`Program / Branch: ${user.branch}`);
    if (user.semester) prefLines.push(`Current semester: ${user.semester}`);
    if (user.hostel) prefLines.push(`Hostel block: ${user.hostel}`);
    
    const studentBlock = prefLines.length
      ? `\n\nSTUDENT PROFILE:\n${prefLines.join("\n")}`
      : "";

    let sys;
    if (isBrochure) {
      sys = `You are Knoq-AI, the official AI helpdesk for Parul University. Answer using the brochure and datasheet sources below. Cite page numbers as [Page X]. Be concise (3-6 sentences), warm, factual. Handle typos gracefully — if the user wrote "btech" they mean "B.Tech", "hostle" means "hostel", "CSE" means "Computer Science & Engineering", etc.${studentBlock}

SOURCES:
${allContext || "(no data available)"}`;
    } else {
      sys = `You are Knoq-AI, the official AI helpdesk for Parul University. Answer using the SOURCES below. Be concise (3-6 sentences), warm, factual. Cite [Datasheet N] or [Source N] when using specific data. Handle typos gracefully — "btech" = "B.Tech", "hostle" = "hostel", "CSE" = "Computer Science & Engineering", etc. If sources don't cover the question, answer from general PU knowledge and note "(general info)".${studentBlock}

SOURCES:
${allContext || "(no indexed data — answer from general knowledge of Parul University)"}`;
    }

    try {
      reply = await chatCompletion(data.messages, sys);
      source = isBrochure ? "brochure" : (datasheetHits.length > 0 ? "datasheet" : "ai");
      
      saveToSemanticCache(last, reply).catch(() => {});
    } catch (err) {
      console.error("[Authed Chat] AI error:", err.message);
      reply = "Sorry, I couldn't reach the AI service right now. Please try again in a moment.";
      source = "error";
    }
    
    // Log
    await ChatLog.create({ userId: user._id, question: last, answer: reply, source }).catch(() => {});

    matchedSources = matches.map(m => ({
      title: m.title,
      url: m.url,
      pageNumber: m.pageNumber,
      pdfName: m.pdfName
    }));

    return res.json({ reply, source, sources: matchedSources });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Chat authed error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Chat History ─────────────────────────────────────────────────────────
router.get("/history", requireAuth, async (req, res) => {
  try {
    const logs = await ChatLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    res.json({ logs });
  } catch (error) {
    console.error("Fetch chat history error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
