import ScrapedPage from "../models/ScrapedPage.js";
import BrochurePage from "../models/BrochurePage.js";
import { embedTexts } from "./gemini.js";

// Cosine similarity helper
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Helper for RAG used by chat
export async function ragSearch(query, topK = 4) {
  try {
    // 1. Check if there are brochure pages
    const hasBrochure = await BrochurePage.exists();

    if (hasBrochure) {
      console.log(`[RAG Search] Brochure pages found. Performing semantic search for query: "${query}"`);
      
      let queryEmbedding = null;
      try {
        const embeddings = await embedTexts([query.substring(0, 4000)]);
        queryEmbedding = embeddings[0];
      } catch (err) {
        console.error("[RAG Search] Embedding query failed:", err);
      }

      if (queryEmbedding) {
        // Fetch all brochure pages with their embeddings
        const pages = await BrochurePage.find({ embedding: { $exists: true, $ne: [] } }).lean();
        
        // Calculate similarity
        const matches = pages.map(p => ({
          ...p,
          similarity: cosineSimilarity(queryEmbedding, p.embedding)
        }));

        // Sort by similarity descending
        matches.sort((a, b) => b.similarity - a.similarity);

        // Take top K
        const topMatches = matches.slice(0, topK);

        console.log(`[RAG Search] Found ${topMatches.length} matching brochure pages.`);

        return topMatches.map(m => ({
          id: m._id.toString(),
          url: `brochure://${m.pdfName}#page=${m.pageNumber}`,
          title: `${m.pdfName} (Page ${m.pageNumber})`,
          markdown: m.text,
          similarity: m.similarity,
          pdfName: m.pdfName,
          pageNumber: m.pageNumber
        }));
      }

      // Regex fallback if embeddings fail
      console.warn("[RAG Search] Falling back to text regex search on brochure pages.");
      const escapeRegex = (str) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escapedQuery = escapeRegex(query);
      const words = query.split(/\s+/)
        .map(w => escapeRegex(w))
        .filter(w => w.length > 3)
        .slice(0, 5);
      const regexQuery = words.length > 0 ? words.join("|") : escapedQuery;

      const matches = await BrochurePage.find({
        text: { $regex: regexQuery, $options: "i" }
      })
      .limit(topK)
      .lean();

      return matches.map(m => ({
        id: m._id.toString(),
        url: `brochure://${m.pdfName}#page=${m.pageNumber}`,
        title: `${m.pdfName} (Page ${m.pageNumber})`,
        markdown: m.text,
        similarity: 0.8,
        pdfName: m.pdfName,
        pageNumber: m.pageNumber
      }));
    }

    // 2. Fall back to ScrapedPage search if no brochure is uploaded
    console.log("[RAG Search] No brochure found. Falling back to scraped web pages...");
    let queryEmbedding = null;
    try {
      const embeddings = await embedTexts([query.substring(0, 4000)]);
      queryEmbedding = embeddings[0];
    } catch (err) {
      console.error("[RAG Search] Embedding query failed for scraped page fallback:", err);
    }

    // MongoDB Atlas Vector Search requires specific configuration on the cluster.
    // If Atlas Vector Search ($vectorSearch) is set up, use it:
    /*
    if (queryEmbedding) {
      const matches = await ScrapedPage.aggregate([
        {
          $vectorSearch: {
            index: "vector_index", // Name of the Atlas Vector Search index
            path: "embedding",
            queryVector: queryEmbedding,
            numCandidates: topK * 10,
            limit: topK
          }
        },
        {
          $project: {
            url: 1,
            title: 1,
            markdown: 1,
            score: { $meta: "vectorSearchScore" }
          }
        }
      ]);

      if (matches && matches.length > 0) {
        return matches.map(m => ({
          id: m._id.toString(),
          url: m.url,
          title: m.title,
          markdown: m.markdown,
          similarity: m.score
        }));
      }
    }
    */

    // Fallback text search for ScrapedPage
    const escapeRegex = (str) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const escapedQuery = escapeRegex(query);
    const words = query.split(/\s+/)
      .map(w => escapeRegex(w))
      .filter(w => w.length > 3)
      .slice(0, 5);
    const regexQuery = words.length > 0 ? words.join("|") : escapedQuery;
    
    const matches = await ScrapedPage.find({
      $or: [
        { title: { $regex: regexQuery, $options: "i" } },
        { markdown: { $regex: regexQuery, $options: "i" } }
      ]
    })
    .limit(topK)
    .lean();

    return matches.map(m => ({
      id: m._id.toString(),
      url: m.url,
      title: m.title,
      markdown: m.markdown,
      similarity: 0.8 // Dummy score for fallback
    }));
  } catch (e) {
    console.error("ragSearch failed:", e);
    return [];
  }
}
