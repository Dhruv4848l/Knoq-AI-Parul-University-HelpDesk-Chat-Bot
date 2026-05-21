import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FAQS = [
  { q: "exam schedule", a: "End-semester exams begin Dec 5, 2026. The detailed datesheet is published on the Exam Cell notice board and the student portal one week before commencement." },
  { q: "hostel fee", a: "Annual hostel fee is ₹68,000 (shared room) or ₹92,000 (single). This includes mess, electricity and Wi-Fi. Pay via the Fee Portal before July 31." },
  { q: "admission deadline", a: "Undergraduate admissions close on July 15. PG admissions close on August 10. Late applications attract a ₹2,000 fee until July 25." },
  { q: "library hours", a: "Central Library: 8:00 AM – 11:00 PM (Mon–Sat), 10:00 AM – 6:00 PM (Sun). Reading halls stay open 24/7 during exam weeks." },
  { q: "scholarship", a: "Merit scholarships (up to 100% tuition) are awarded based on entrance rank. Need-based aid forms are available at the Dean of Students office." },
  { q: "wifi password", a: "Campus Wi-Fi (CollegeNet) uses your student portal credentials. For trouble, raise a ticket at helpdesk.college.edu or visit the IT Cell, Block C." },
  { q: "transcript", a: "Request transcripts via the Academic Section portal. Processing takes 5 working days. Cost: ₹200 per copy; international courier extra." },
  { q: "placement", a: "Placement season starts Aug 20. Register on the T&P portal, upload an updated CV and complete the pre-placement training modules to be eligible." },
];

function findFAQ(query: string): string | null {
  const q = query.toLowerCase();
  const hit = FAQS.find((f) => q.includes(f.q));
  return hit ? hit.a : null;
}

export const chatWithAI = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        messages: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
          .min(1)
          .max(20),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const last = data.messages[data.messages.length - 1];
    const faq = findFAQ(last.content);
    if (faq) return { reply: faq, source: "faq" as const };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        reply: "AI gateway is not configured yet. Try keywords like 'exam', 'hostel fee', 'admission', 'library', 'scholarship', 'wifi', 'transcript', or 'placement'.",
        source: "fallback" as const,
      };
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are CampusBot, the official AI helpdesk for a college. Answer student queries about admissions, exams, fees, hostel, library, scholarships, placements, and campus life. Be concise (3-5 sentences), warm, and factual. If the question is outside campus scope, politely redirect.",
          },
          ...data.messages,
        ],
        temperature: 0.3,
        max_tokens: 400,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("AI gateway error", res.status, text);
      if (res.status === 429) return { reply: "We're getting a lot of questions right now — please try again in a moment.", source: "error" as const };
      if (res.status === 402) return { reply: "AI credits exhausted. Please contact the admin.", source: "error" as const };
      return { reply: "Sorry, I couldn't reach the AI service. Please try again.", source: "error" as const };
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = json.choices?.[0]?.message?.content?.trim() || "I'm not sure about that — please contact the admin office.";
    return { reply, source: "ai" as const };
  });
