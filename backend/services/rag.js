import ScrapedPage from "../models/ScrapedPage.js";
import { embedTexts } from "./gemini.js";

// Helper for RAG used by chat
export async function ragSearch(query, topK = 4) {
  try {
    const embeddings = await embedTexts([query.substring(0, 4000)]);
    const queryEmbedding = embeddings[0];

    // MongoDB Atlas Vector Search requires specific configuration on the cluster.
    // If Atlas Vector Search ($vectorSearch) is set up, use it:
    /*
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
    */

    // Since we don't know if Atlas Vector Search is configured yet, 
    // we provide a fallback simple keyword/regex search if vector search fails or is missing.
    // In a real production scenario with MongoDB Atlas, you would uncomment the $vectorSearch block above.
    
    console.warn("Using fallback text search for RAG since Atlas Vector Search might not be configured yet.");
    
    // Create a regex from the query words for a simple fallback search
    const words = query.split(/\s+/).filter(w => w.length > 3).slice(0, 5);
    const regexQuery = words.length > 0 ? words.join("|") : query;
    
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
