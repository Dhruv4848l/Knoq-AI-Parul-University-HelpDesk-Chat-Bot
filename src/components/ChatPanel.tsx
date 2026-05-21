import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { chatFree, chatAuthed } from "@/lib/chat.functions";
import { Send, Sparkles, BookMarked, Bot, User, Lock } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string; source?: string };

const FREE_SUGGESTIONS = ["When do exams start?", "Hostel fee?", "Library hours?", "Placement season?"];
const AUTHED_SUGGESTIONS = ["Tell me about scholarships", "How do I get a transcript?", "Wi-Fi setup help", "Exam re-evaluation process"];

export function ChatPanel({ mode = "free" }: { mode?: "free" | "authed" }) {
  const initial = mode === "authed"
    ? "Welcome back! Ask me anything about campus — I'll search the knowledge base and use AI when needed."
    : "Hi! I'm CampusBot — free mode shares basic public info. Sign in with @paruluniversity.ac.in for the full experience.";

  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: initial }]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const freeFn = useServerFn(chatFree);
  const authedFn = useServerFn(chatAuthed);

  const mutation = useMutation({
    mutationFn: async (next: Msg[]) => {
      if (mode === "authed") {
        return authedFn({ data: { messages: next.map((m) => ({ role: m.role, content: m.content })) } });
      }
      const last = next[next.length - 1].content;
      return freeFn({ data: { question: last } });
    },
    onSuccess: (res) => {
      setMessages((m) => [...m, { role: "assistant", content: res.reply, source: res.source }]);
    },
    onError: () => {
      setMessages((m) => [...m, { role: "assistant", content: "Something went wrong. Please try again.", source: "error" }]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mutation.isPending]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    mutation.mutate(next);
  }

  const suggestions = mode === "authed" ? AUTHED_SUGGESTIONS : FREE_SUGGESTIONS;

  return (
    <div className="flex flex-col h-[640px] rounded-2xl border bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-elegant)" }}>
      <header className="flex items-center gap-3 px-5 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="size-10 rounded-full bg-primary text-primary-foreground grid place-items-center">
          <Sparkles className="size-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg leading-none">CampusBot</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === "authed" ? "Full access · AI + Knowledge Base · logged" : "Free mode · basic FAQ only"}
          </p>
        </div>
        {mode === "free" && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-accent text-accent-foreground inline-flex items-center gap-1">
            <Lock className="size-3" /> guest
          </span>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`shrink-0 size-8 rounded-full grid place-items-center ${m.role === "user" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}>
              {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
            </div>
            <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-secondary text-secondary-foreground rounded-tl-sm"}`}>
              {m.content}
              {m.source === "faq" && (
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider opacity-70">
                  <BookMarked className="size-3" /> from FAQ
                </div>
              )}
              {m.source === "ai" && (
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider opacity-70">
                  <Sparkles className="size-3" /> AI generated
                </div>
              )}
            </div>
          </div>
        ))}
        {mutation.isPending && (
          <div className="flex gap-3">
            <div className="shrink-0 size-8 rounded-full bg-primary text-primary-foreground grid place-items-center">
              <Bot className="size-4" />
            </div>
            <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
              <span className="size-2 rounded-full bg-muted-foreground/60 animate-bounce" />
              <span className="size-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:120ms]" />
              <span className="size-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:240ms]" />
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-accent transition">
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-center gap-2 p-4 border-t bg-background/50"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === "authed" ? "Ask anything about campus…" : "Ask a basic question…"}
          className="flex-1 px-4 py-3 rounded-xl border bg-background outline-none focus:ring-2 focus:ring-ring text-sm"
        />
        <button type="submit" disabled={mutation.isPending || !input.trim()} className="size-11 rounded-xl bg-primary text-primary-foreground grid place-items-center disabled:opacity-40 hover:opacity-90 transition">
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
