import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";
const EMBED_DIM = 1536;
const EMBED_MODEL = "google/gemini-embedding-001";

function fcKey() {
  const k = process.env.FIRECRAWL_API_KEY;
  if (!k) throw new Error("FIRECRAWL_API_KEY not configured");
  return k;
}
function aiKey() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY not configured");
  return k;
}

async function ensureAdmin(supabase: ReturnType<typeof requireSupabaseAuth> extends never ? never : any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Admin access required");
}

// ─── Start a full-site crawl ──────────────────────────────────────────────
export const startCrawl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        url: z.string().url().default("https://www.paruluniversity.ac.in"),
        limit: z.number().min(1).max(5000).default(2000),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    const res = await fetch(`${FIRECRAWL_BASE}/crawl`, {
      method: "POST",
      headers: { Authorization: `Bearer ${fcKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: data.url,
        limit: data.limit,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Firecrawl start failed [${res.status}]: ${t}`);
    }
    const json = (await res.json()) as { id?: string; success?: boolean };
    if (!json.id) throw new Error("Firecrawl did not return a job id");

    const { data: job, error } = await supabaseAdmin
      .from("crawl_jobs")
      .insert({
        firecrawl_job_id: json.id,
        source_url: data.url,
        status: "crawling",
        started_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { jobId: job.id, firecrawlId: json.id };
  });

// ─── Pull next batch from Firecrawl, embed, store ─────────────────────────
async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${aiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts, dimensions: EMBED_DIM }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embed failed [${res.status}]: ${t}`);
  }
  const j = (await res.json()) as { data: { embedding: number[] }[] };
  return j.data.map((d) => d.embedding);
}

async function sha256(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const syncCrawl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    const { data: job, error: jErr } = await supabaseAdmin
      .from("crawl_jobs")
      .select("*")
      .eq("id", data.jobId)
      .single();
    if (jErr || !job) throw new Error("Job not found");
    if (job.status === "completed" || job.status === "failed") {
      return { done: true, status: job.status, pagesScraped: job.pages_scraped, pagesEmbedded: job.pages_embedded };
    }

    // Fetch one page of crawl results
    const cursor = job.next_cursor as string | null;
    const url = cursor || `${FIRECRAWL_BASE}/crawl/${job.firecrawl_job_id}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${fcKey()}` } });
    if (!res.ok) {
      const t = await res.text();
      await supabaseAdmin.from("crawl_jobs").update({ status: "failed", error: `Status ${res.status}: ${t}` }).eq("id", job.id);
      throw new Error(`Firecrawl status failed: ${t}`);
    }
    const payload = (await res.json()) as {
      status: string;
      total?: number;
      completed?: number;
      next?: string | null;
      data?: Array<{ markdown?: string; metadata?: { title?: string; description?: string; sourceURL?: string; url?: string; statusCode?: number } }>;
    };

    const pages = payload.data ?? [];
    let newCount = 0;
    let embeddedCount = 0;

    // Process in chunks of 10 to stay under embedding token limits
    for (let i = 0; i < pages.length; i += 10) {
      const chunk = pages
        .slice(i, i + 10)
        .filter((p) => p.markdown && (p.metadata?.sourceURL || p.metadata?.url));

      const records = await Promise.all(
        chunk.map(async (p) => {
          const pageUrl = (p.metadata!.sourceURL || p.metadata!.url) as string;
          const md = (p.markdown || "").slice(0, 30000); // cap per-doc
          return {
            url: pageUrl,
            title: p.metadata?.title?.slice(0, 500) || null,
            description: p.metadata?.description?.slice(0, 1000) || null,
            markdown: md,
            content_hash: await sha256(md),
          };
        }),
      );
      if (records.length === 0) continue;

      // Embed (truncate text for embedding to ~8000 chars)
      const embedTexts = records.map((r) => `${r.title ?? ""}\n\n${r.markdown}`.slice(0, 8000));
      let embeddings: number[][] = [];
      try {
        embeddings = await embedBatch(embedTexts);
      } catch (e) {
        console.error("Embedding chunk failed:", e);
      }

      const upsertRows = records.map((r, idx) => ({
        ...r,
        embedding: embeddings[idx] ? (embeddings[idx] as unknown as string) : null,
      }));

      const { error: upErr, count } = await supabaseAdmin
        .from("scraped_pages")
        .upsert(upsertRows, { onConflict: "url", count: "exact" });
      if (upErr) {
        console.error("Upsert failed:", upErr);
      } else {
        newCount += count ?? upsertRows.length;
        embeddedCount += embeddings.length;
      }
    }

    const isDone = !payload.next && (payload.status === "completed" || payload.status === "scraping");
    const stillCrawling = payload.status === "scraping" && !payload.next;

    const status = payload.next
      ? "syncing"
      : payload.status === "completed"
        ? "completed"
        : stillCrawling
          ? "crawling"
          : "syncing";

    await supabaseAdmin
      .from("crawl_jobs")
      .update({
        status,
        next_cursor: payload.next ?? null,
        pages_discovered: payload.total ?? job.pages_discovered,
        pages_scraped: (job.pages_scraped ?? 0) + newCount,
        pages_embedded: (job.pages_embedded ?? 0) + embeddedCount,
      })
      .eq("id", job.id);

    return {
      done: status === "completed",
      status,
      pagesScraped: (job.pages_scraped ?? 0) + newCount,
      pagesEmbedded: (job.pages_embedded ?? 0) + embeddedCount,
      total: payload.total ?? job.pages_discovered,
      hasNext: !!payload.next,
    };
  });

// ─── Generate FAQ entries from scraped pages using Gemini ─────────────────
export const generateFaqsFromPages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ jobId: z.string().uuid(), batchSize: z.number().min(1).max(20).default(5) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    // Pull pages that haven't been FAQ-processed yet — use an offset based on job.faqs_generated
    const { data: job } = await supabaseAdmin.from("crawl_jobs").select("*").eq("id", data.jobId).single();
    if (!job) throw new Error("Job not found");

    const offset = job.faqs_generated ?? 0;
    const { data: pages } = await supabaseAdmin
      .from("scraped_pages")
      .select("url, title, markdown")
      .order("scraped_at", { ascending: true })
      .range(offset, offset + data.batchSize - 1);

    if (!pages || pages.length === 0) {
      await supabaseAdmin.from("crawl_jobs").update({ status: "completed" }).eq("id", data.jobId);
      return { done: true, generated: 0 };
    }

    let generated = 0;
    for (const page of pages) {
      const prompt = `Given this Parul University page, extract up to 3 high-value student FAQ entries (question/answer pairs). If the page has no useful student-facing info, return an empty array.

URL: ${page.url}
TITLE: ${page.title ?? ""}
CONTENT:
${page.markdown.slice(0, 6000)}

Respond ONLY with JSON: {"faqs":[{"question":"...","answer":"...","keywords":["..."],"category":"..."}]}. Keywords are 3-6 lowercase search terms. Category is one of: admissions, exams, fees, hostel, library, placement, scholarship, academics, transport, general.`;

      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${aiKey()}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You extract structured FAQ data from university web pages. Output strict JSON only." },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          }),
        });
        if (!res.ok) continue;
        const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const content = j.choices?.[0]?.message?.content;
        if (!content) continue;
        const parsed = JSON.parse(content) as { faqs?: { question: string; answer: string; keywords?: string[]; category?: string }[] };
        for (const f of parsed.faqs ?? []) {
          if (!f.question || !f.answer) continue;
          await supabaseAdmin.from("faqs").insert({
            question: f.question.slice(0, 300),
            answer: f.answer.slice(0, 2000),
            keywords: (f.keywords ?? []).slice(0, 10).map((k) => k.toLowerCase().slice(0, 50)),
            category: (f.category ?? "general").slice(0, 50),
            created_by: context.userId,
          });
          generated++;
        }
      } catch (e) {
        console.error("FAQ gen failed for", page.url, e);
      }
    }

    await supabaseAdmin
      .from("crawl_jobs")
      .update({
        faqs_generated: (job.faqs_generated ?? 0) + pages.length,
        status: pages.length < data.batchSize ? "completed" : "generating_faqs",
      })
      .eq("id", data.jobId);

    return { done: pages.length < data.batchSize, generated, processed: pages.length };
  });

// ─── Job status ───────────────────────────────────────────────────────────
export const getCrawlJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data: job, error } = await supabaseAdmin.from("crawl_jobs").select("*").eq("id", data.jobId).single();
    if (error) throw new Error(error.message);
    return { job };
  });

export const listCrawlJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await supabaseAdmin
      .from("crawl_jobs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return { jobs: data ?? [] };
  });

export const scrapedStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { count: pages } = await supabaseAdmin.from("scraped_pages").select("*", { count: "exact", head: true });
    const { count: embedded } = await supabaseAdmin
      .from("scraped_pages")
      .select("*", { count: "exact", head: true })
      .not("embedding", "is", null);
    const { count: faqs } = await supabaseAdmin.from("faqs").select("*", { count: "exact", head: true });
    return { pages: pages ?? 0, embedded: embedded ?? 0, faqs: faqs ?? 0 };
  });

// ─── Helper for RAG used by chat ──────────────────────────────────────────
export async function ragSearch(query: string, topK = 4) {
  try {
    const e = await embedBatch([query.slice(0, 4000)]);
    const { data, error } = await supabaseAdmin.rpc("match_scraped_pages", {
      query_embedding: e[0] as unknown as string,
      match_count: topK,
    });
    if (error) return [];
    return (data ?? []) as Array<{ id: string; url: string; title: string | null; markdown: string; similarity: number }>;
  } catch (e) {
    console.error("ragSearch failed:", e);
    return [];
  }
}
