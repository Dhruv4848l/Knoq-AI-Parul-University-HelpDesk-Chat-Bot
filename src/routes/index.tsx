import { createFileRoute } from "@tanstack/react-router";
import { ChatPanel } from "@/components/ChatPanel";
import { GraduationCap, Database, ShieldCheck, BarChart3, Workflow, MessageSquare, Users, Zap, Lock, Server, GitBranch, Bell } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusBot — College Helpdesk AI Chatbot" },
      { name: "description", content: "AI-powered college helpdesk that instantly answers student questions about exams, fees, hostel, admissions, and more." },
      { property: "og:title", content: "CampusBot — College Helpdesk AI Chatbot" },
      { property: "og:description", content: "Instant AI answers to student questions about campus life." },
    ],
  }),
  component: Home,
});

const FUTURE = [
  { icon: Lock, title: "JWT Auth (Students & Admin)", desc: "Secure login with bcrypt + JWT, role-based access for student and admin dashboards.", phase: "Phase 3 · Security" },
  { icon: Database, title: "MongoDB Knowledge Base", desc: "Cloud-hosted FAQ collection with full CRUD via an admin panel — currently uses an in-memory FAQ list.", phase: "Phase 1 · Data" },
  { icon: Users, title: "Admin Dashboard", desc: "Manage FAQs, view chat logs, moderate users and export analytics from a protected dashboard.", phase: "Phase 6 · Admin" },
  { icon: BarChart3, title: "Analytics & Logging", desc: "Track most-asked questions, AI fallback rate, response time and student satisfaction.", phase: "Phase 6 · Insights" },
  { icon: Zap, title: "Redis Cache Layer", desc: "Cache hot FAQ lookups and AI completions to drop latency below 100ms.", phase: "Phase 6 · Performance" },
  { icon: ShieldCheck, title: "Rate Limiting & Abuse Guard", desc: "Per-IP and per-user limits, prompt-injection filters, and audit logs.", phase: "Phase 7 · Security" },
  { icon: Bell, title: "Email & Push Notifications", desc: "Notify students about exam dates, fee deadlines, and admin announcements.", phase: "Phase 6 · Engagement" },
  { icon: Server, title: "Vector Search over College Docs", desc: "Embed handbooks, circulars and timetables so the bot can cite exact passages.", phase: "Phase 5 · AI" },
  { icon: GitBranch, title: "CI/CD with GitHub Actions", desc: "Automated tests, type checks, and zero-downtime deploys on every push to main.", phase: "Phase 10 · DevOps" },
];

function Home() {
  return (
    <div className="min-h-screen">
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <GraduationCap className="size-5" />
          </div>
          <span className="font-display text-xl">CampusBot</span>
        </div>
        <a href="#future" className="text-sm text-muted-foreground hover:text-foreground transition">Future scope →</a>
      </nav>

      <header className="max-w-6xl mx-auto px-6 pt-8 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-xs text-muted-foreground mb-6">
            <span className="size-1.5 rounded-full bg-gold" /> Full-Stack AI · Phases 1-4 live
          </div>
          <h1 className="text-5xl md:text-6xl leading-[1.05] mb-6">
            Your campus,<br />
            <span className="italic text-primary">always answering.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mb-8">
            An AI helpdesk that handles the thousand questions students ask the admin office every week — instantly, 24/7, and in plain English.
          </p>
          <div className="flex flex-wrap gap-6 text-sm">
            <Stat n="8" label="Curated FAQs" />
            <Stat n="<2s" label="Response time" />
            <Stat n="24/7" label="Availability" />
          </div>
        </div>
        <ChatPanel />
      </header>

      <section className="max-w-6xl mx-auto px-6 py-12 border-t">
        <div className="grid md:grid-cols-3 gap-6">
          <Feature icon={MessageSquare} title="Natural conversation" desc="Students just type — no menus, no forms. The bot understands context across the conversation." />
          <Feature icon={Database} title="FAQ-first, AI-fallback" desc="Curated answers come straight from the knowledge base. Unknown questions get a Gemini-powered response." />
          <Feature icon={Workflow} title="Built for scale" desc="Architected as a typed monorepo: serverless functions, RLS-ready DB, and edge-deployed UI." />
        </div>
      </section>

      <section id="future" className="max-w-6xl mx-auto px-6 py-20 border-t">
        <div className="max-w-2xl mb-12">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">Future Scope</p>
          <h2 className="text-4xl md:text-5xl mb-4">What's <span className="italic text-primary">coming next</span></h2>
          <p className="text-muted-foreground">
            This live demo ships Phases 1-4 of the 10-phase build (project planning, environment, backend skeleton, frontend & AI integration).
            The features below are documented in the full engineering guide and will roll out in subsequent phases.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FUTURE.map((f) => (
            <div key={f.title} className="group relative rounded-2xl border bg-card p-6 hover:border-primary/40 transition">
              <div className="size-10 rounded-lg bg-accent text-accent-foreground grid place-items-center mb-4">
                <f.icon className="size-5" />
              </div>
              <h3 className="text-xl mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{f.desc}</p>
              <span className="text-[10px] uppercase tracking-wider text-primary/70">{f.phase}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 border-t text-sm text-muted-foreground flex justify-between flex-wrap gap-4">
        <span>CampusBot · Built from the College Helpdesk AI Engineering Guide</span>
        <span>v1.0 · Phases 1-4 of 10</span>
      </footer>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-display text-primary">{n}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

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
