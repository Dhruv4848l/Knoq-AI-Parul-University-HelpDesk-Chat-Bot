import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

// ═══════════════════════════════════════════════════════════════════════════
//  MULTI-KEY ROTATION — automatically switch keys on 429 rate limit
// ═══════════════════════════════════════════════════════════════════════════
const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,  // future-proof: add more keys easily
].filter(Boolean);                // remove undefined/empty

console.log(`[AI] Loaded ${GEMINI_KEYS.length} Gemini API key(s)`);

// Create a GenAI instance for each key
const genAIInstances = GEMINI_KEYS.map(key => new GoogleGenerativeAI(key));

// Track which key to try first (round-robin on success, skip on 429)
let currentKeyIndex = 0;

function getNextKeyIndex(current) {
  return (current + 1) % genAIInstances.length;
}

export async function chatCompletion(messages, systemPrompt, temperature = 0.3, maxTokens = 500) {
  if (GEMINI_KEYS.length === 0) {
    throw new Error("AI service is not configured. Please contact the admin.");
  }

  // Models to try (highest quota first)
  const models = ["gemini-2.0-flash", "gemini-2.5-flash"];

  let history = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
  const currentMessage = history.pop().parts[0].text;
  while (history.length > 0 && history[0].role === 'model') {
    history.shift();
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  let lastError = null;

  // Try each KEY → each MODEL → up to 2 attempts
  for (let keyTry = 0; keyTry < genAIInstances.length; keyTry++) {
    const keyIdx = (currentKeyIndex + keyTry) % genAIInstances.length;
    const genAI = genAIInstances[keyIdx];
    const keyLabel = `Key-${keyIdx + 1}`;

    for (const modelName of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`[AI] ${keyLabel} retry ${attempt + 1} for ${modelName} after 3s...`);
            await sleep(3000);
          }
          console.log(`[AI] ${keyLabel} → ${modelName}...`);
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt,
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          });

          const chat = model.startChat({ history: [...history] });
          const result = await chat.sendMessage(currentMessage);
          // Success! Remember this key for next call
          currentKeyIndex = keyIdx;
          return result.response.text();
        } catch (err) {
          lastError = err;
          const msg = err.message || '';
          const is429 = msg.includes("429") || msg.includes("quota") || msg.includes("rate");
          const isRetryable = is429 || msg.includes("503") || msg.includes("overloaded") || msg.includes("high demand");
          console.error(`[AI] ${keyLabel} ${modelName} (attempt ${attempt + 1}) failed: ${msg.substring(0, 150)}`);

          if (!isRetryable) throw err;

          // If it's a 429 on daily quota, skip to next key immediately
          if (is429 && msg.includes("PerDay")) {
            console.log(`[AI] ${keyLabel} daily quota exhausted. Switching to next key...`);
            break; // break attempt loop, try next model or key
          }
        }
      }
    }
    console.log(`[AI] ${keyLabel} all models exhausted. Trying next key...`);
  }

  throw lastError || new Error("All AI keys and models are temporarily unavailable. Please try again.");
}

export async function embedTexts(texts) {
  try {
    if (GEMINI_KEYS.length === 0) {
      console.warn("No GEMINI API keys set. Cannot embed texts.");
      return texts.map(() => new Array(768).fill(0)); // Dummy embedding
    }

    // Use the current preferred key for embeddings
    const genAI = genAIInstances[currentKeyIndex];
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    
    const embeddings = [];
    for (const text of texts) {
      const result = await model.embedContent(text);
      const embedding = result.embedding.values;
      
      // Truncate to 768 dims for fast in-memory cosine similarity
      embeddings.push(embedding.slice(0, 768));
    }
    
    return embeddings;
  } catch (error) {
    console.error("Gemini Embedding Error:", error);
    throw error;
  }
}

export async function extractFaqs(url, title, markdown) {
  const prompt = `Given this Parul University page, extract up to 3 high-value student FAQ entries (question/answer pairs). If the page has no useful student-facing info, return an empty array.

URL: ${url}
TITLE: ${title || ""}
CONTENT:
${markdown.substring(0, 6000)}

Respond ONLY with JSON: {"faqs":[{"question":"...","answer":"...","keywords":["..."],"category":"..."}]}. Keywords are 3-6 lowercase search terms. Category is one of: admissions, exams, fees, hostel, library, placement, scholarship, academics, transport, general.`;

  try {
    if (GEMINI_KEYS.length === 0) {
      if (process.env.DEEPSEEK_API_KEY) {
        console.log("[AI Routing] No Gemini keys for FAQ extraction. Routing to DeepSeek...");
        return await callDeepSeekJSON(prompt);
      }
      throw new Error("Gemini API key is not configured.");
    }

    const genAI = genAIInstances[currentKeyIndex];
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("FAQ Extraction Error:", error);
    
    if (process.env.DEEPSEEK_API_KEY) {
      try {
        console.log(`[DeepSeek Fallback] Attempting fallback for FAQ extraction due to error: ${error.message || error}`);
        return await callDeepSeekJSON(prompt);
      } catch (deepseekError) {
        console.error("DeepSeek FAQ Extraction Fallback Error:", deepseekError);
      }
    }
    
    throw error;
  }
}

// ─── DeepSeek API Helpers (OpenAI Compatible) ─────────────────────────────

async function callDeepSeek(messages, systemPrompt, temperature = 0.3, maxTokens = 500) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DeepSeek API Key is not configured.");
  }

  const formattedMessages = [];
  if (systemPrompt) {
    formattedMessages.push({ role: "system", content: systemPrompt });
  }
  formattedMessages.push(...messages);

  console.log("[DeepSeek API] Dispatching Chat Completion...");
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: formattedMessages,
      temperature: temperature,
      max_tokens: maxTokens,
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("DeepSeek response format mismatch or empty choice array.");
  }

  console.log("[DeepSeek API] Completed Chat Completion successfully.");
  return text;
}

async function callDeepSeekJSON(prompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DeepSeek API Key is not configured.");
  }

  console.log("[DeepSeek API] Dispatching JSON Content Generation...");
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("DeepSeek response format mismatch or empty choice array.");
  }

  return JSON.parse(text);
}
