import { createFileRoute, Link } from "@tanstack/react-router";
import { ChatPanel } from "@/components/ChatPanel";
import { Nav } from "@/components/Nav";
import { Lock, Database, MessageSquare, Workflow, LogIn, Sparkles, ShieldCheck, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusBot — Parul University AI Helpdesk" },
      { name: "description", content: "AI-powered college helpdesk for Parul University. Instant answers about exams, fees, hostel, admissions, and more." },
      { property: "og:title", content: "CampusBot — Parul University AI Helpdesk" },
      { property: "og:description", content: "Sign in with your @paruluniversity.ac.in email for full access, or try the free guest chat." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen">
      <Nav />

      <header className="max-w-6xl mx-auto px-6 pt-8 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-xs text-muted-foreground mb-6">
            <span className="size-1.5 rounded-full bg-gold" /> Built for Parul University
          </div>
          <h1 className="text-5xl md:text-6xl leading-[1.05] mb-6">
            Your campus,<br />
            <span className="italic text-primary">always answering.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mb-8">
            An AI helpdesk that handles the thousand questions students ask the admin office every week — instantly, 24/7, and in plain English.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/login" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition">
              <LogIn className="size-4" /> Sign in for full access
            </Link>
            <a href="#chat" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border hover:bg-accent transition">
              <MessageSquare className="size-4" /> Try free chat
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            🔒 Sign-in restricted to <b>@paruluniversity.ac.in</b>. Free mode is open to everyone — no login needed.
          </p>
        </div>
        <div id="chat">
          <ChatPanel mode="free" />
        </div>
      </header>

      {/* Two-tier access explainer */}
      <section className="max-w-6xl mx-auto px-6 py-12 border-t">
        <div className="grid md:grid-cols-2 gap-5">
          <article className="rounded-2xl border bg-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="size-5 text-muted-foreground" />
              <h3 className="text-xl">Free Mode · Guest</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              No sign-in required. Anyone can ask basic public questions and get short, curated answers.
            </p>
            <ul className="text-sm space-y-1.5">
              <li>✓ Basic FAQs (exams, hostel, library)</li>
              <li>✓ No account needed</li>
              <li className="text-muted-foreground">— No chat history saved</li>
              <li className="text-muted-foreground">— No AI fallback for unknown questions</li>
            </ul>
          </article>
          <article className="rounded-2xl border bg-card p-6 ring-2 ring-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="size-5 text-primary" />
              <h3 className="text-xl">Full Mode · Parul Students & Staff</h3>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary text-primary-foreground">@paruluniversity.ac.in</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Sign in with your university email to unlock the complete experience.
            </p>
            <ul className="text-sm space-y-1.5">
              <li>✓ Full knowledge base + admin-curated FAQs</li>
              <li>✓ Gemini AI for unknown questions</li>
              <li>✓ Personal chat history</li>
              <li>✓ Admin dashboard (role-restricted)</li>
            </ul>
          </article>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-12 border-t">
        <div className="grid md:grid-cols-3 gap-6">
          <Feature icon={MessageSquare} title="Natural conversation" desc="Students just type — no menus. The bot understands context across the conversation." />
          <Feature icon={Database} title="FAQ-first, AI-fallback" desc="Curated answers come from the knowledge base. Unknown questions get a Gemini-powered response." />
          <Feature icon={Workflow} title="Admin-controlled" desc="The admin team adds, edits, or removes FAQs from a dedicated dashboard — no code changes needed." />
        </div>
      </section>

      {/* Shipped + Future */}
      <section id="future" className="max-w-6xl mx-auto px-6 py-20 border-t">
        <div className="max-w-2xl mb-10">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">Roadmap</p>
          <h2 className="text-4xl md:text-5xl mb-4">What's <span className="italic text-primary">shipped</span> and what's next</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-primary mb-4">✓ Live now</h3>
            <ul className="space-y-3">
              {SHIPPED.map((s) => {
                const Wrapper: any = s.to ? Link : "div";
                const wrapperProps = s.to ? { to: s.to } : {};
                return (
                  <li key={s.title}>
                    <Wrapper {...wrapperProps} className={`flex gap-3 p-4 rounded-xl border bg-card ${s.to ? "hover:bg-accent transition" : ""}`}>
                      <s.icon className="size-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{s.title}{s.to && <span className="text-muted-foreground"> →</span>}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                      </div>
                    </Wrapper>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">→ Future scope</h3>
            <ul className="space-y-3">
              {FUTURE.map((s) => (
                <li key={s.title} className="flex gap-3 p-4 rounded-xl border bg-card/60">
                  <s.icon className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 border-t text-sm text-muted-foreground flex justify-between flex-wrap gap-4">
        <span>CampusBot · Parul University AI Helpdesk</span>
        <span>v1.0</span>
      </footer>
    </div>
  );
}

const SHIPPED = [
  { icon: Lock, title: "Domain-restricted Auth", desc: "Email/password login limited to @paruluniversity.ac.in. Free guest mode for everyone else." },
  { icon: Database, title: "Cloud Knowledge Base", desc: "Admin-managed FAQ table with full CRUD; chatbot searches it before falling back to AI." },
  { icon: Users, title: "Admin Dashboard", desc: "Role-protected dashboard to manage FAQs and view recent conversations." },
  { icon: Sparkles, title: "AI Fallback (Gemini)", desc: "Unknown questions route to Lovable AI for a friendly, context-aware answer." },
];

const FUTURE = [
  { icon: Sparkles, title: "Vector Search over college docs", desc: "Embed handbooks, circulars, timetables so the bot cites exact passages." },
  { icon: Users, title: "Per-program personalization", desc: "Answers tailored to a student's branch, semester, and hostel block." },
  { icon: Database, title: "Redis cache layer", desc: "Cache hot FAQ lookups and AI completions to drop latency below 100ms." },
  { icon: Workflow, title: "Email & push notifications", desc: "Notify students about exam dates, fee deadlines, and admin announcements." },
];

function Feature({ icon: Icon, title, desc }: { icon: typeof MessageSquare; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-4">
        <Icon className="size-5" />
      </div>
      <h3 className="text-xl mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
