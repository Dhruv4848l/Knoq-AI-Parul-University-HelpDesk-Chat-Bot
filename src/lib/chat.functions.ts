import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ragSearch } from "./crawl.functions";

// ─── Free mode: basic in-memory FAQ only, no logging, no AI ───────────────
const FREE_FAQS = [
  { k: ["exam", "exams", "schedule", "datesheet"], a: "End-semester exams begin Dec 5, 2026. The full datesheet is published on the Exam Cell board and student portal one week before exams start." },
  { k: ["hostel", "accommodation", "rent"], a: "Annual hostel fee is ₹68,000 (shared) or ₹92,000 (single). Includes mess, electricity, and Wi-Fi." },
  { k: ["admission", "deadline", "apply"], a: "UG admissions close July 15. PG admissions close August 10. Late applications attract a ₹2,000 fee until July 25." },
  { k: ["library", "hours", "timings"], a: "Central Library: 8 AM – 11 PM (Mon–Sat), 10 AM – 6 PM (Sun). 24/7 during exam weeks." },
  { k: ["placement", "job", "recruitment"], a: "Placement season starts Aug 20. Register on the T&P portal and complete pre-placement training." },
  { k: ["fee", "fees"], a: "For specific fee breakdowns, please sign in with your @paruluniversity.ac.in account for detailed answers." },
];

function findFree(query: string): string | null {
  const q = query.toLowerCase();
  const hit = FREE_FAQS.find((f) => f.k.some((kw) => q.includes(kw)));
  return hit?.a ?? null;
}

export const chatFree = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ question: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    const a = findFree(data.question);
    if (a) return { reply: a, source: "faq" as const };
    return {
      reply:
        "I only share basic public information in free mode. Sign in with your @paruluniversity.ac.in email to ask anything about campus life and get AI-powered answers.",
      source: "fallback" as const,
    };
  });

// ─── Authed mode: DB FAQs → Lovable AI → chat_logs ────────────────────────
const MessagesSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(20),
});

export const chatAuthed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => MessagesSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const last = data.messages[data.messages.length - 1].content;

    // 1) Try DB FAQ keyword match
    const { data: faqs } = await supabase.from("faqs").select("answer, keywords, question");
    const q = last.toLowerCase();
    const faqHit = faqs?.find((f: { keywords: string[] }) => f.keywords?.some((kw: string) => q.includes(kw.toLowerCase())));

    let reply: string;
    let source: "faq" | "ai" | "error";

    if (faqHit) {
      reply = faqHit.answer;
      source = "faq";
    } else {
      // 2) RAG: pull top scraped pages
      const matches = await ragSearch(last, 4);
      const context_blocks = matches
        .map((m, i) => `[Source ${i + 1}] ${m.title ?? m.url}\nURL: ${m.url}\n${m.markdown.slice(0, 2000)}`)
        .join("\n\n---\n\n");

      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) {
        reply = "AI service is not configured. Please contact the admin.";
        source = "error";
      } else {
        const sys = `You are CampusBot, the official AI helpdesk for Parul University. Answer using ONLY the SOURCES below when relevant. Cite source numbers like [1], [2]. Be concise (3-6 sentences), warm, and factual. If the sources don't cover the question, answer from general knowledge of Parul University and say "(general info)". If outside campus scope, politely redirect.

SOURCES:
${context_blocks || "(no indexed pages yet — answer from general knowledge of Parul University)"}`;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "system", content: sys }, ...data.messages],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });
        if (!res.ok) {
          if (res.status === 429) reply = "We're getting a lot of questions — please try again in a moment.";
          else if (res.status === 402) reply = "AI credits exhausted. Please contact the admin.";
          else reply = "Sorry, I couldn't reach the AI service.";
          source = "error";
        } else {
          const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          reply = json.choices?.[0]?.message?.content?.trim() || "I'm not sure about that — please contact the admin office.";
          source = "ai";
        }
      }
    }

    // 3) Log
    await supabase.from("chat_logs").insert({ user_id: userId, question: last, answer: reply, source });

    return { reply, source };
  });

// ─── Admin FAQ CRUD ────────────────────────────────────────────────────────
const FaqSchema = z.object({
  question: z.string().min(3).max(300),
  answer: z.string().min(3).max(2000),
  keywords: z.array(z.string().min(1).max(50)).max(15),
  category: z.string().min(1).max(50).default("general"),
});

export const upsertFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid().optional(), faq: FaqSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { error } = await supabase.from("faqs").update(data.faq).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("faqs").insert({ ...data.faq, created_by: userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("faqs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listChatLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chat_logs")
      .select("id, question, answer, source, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { logs: data ?? [] };
  });
