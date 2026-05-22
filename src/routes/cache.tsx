import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Database, Zap, Activity, Timer } from "lucide-react";

export const Route = createFileRoute("/cache")({
  head: () => ({
    meta: [
      { title: "Cache Layer — CampusBot" },
      { name: "description", content: "Status of the Redis-style cache that keeps hot FAQs and AI completions fast." },
    ],
  }),
  component: CachePage,
});

function CachePage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-xs text-muted-foreground mb-4">
          <Zap className="size-3" /> Cache layer · v0
        </div>
        <h1 className="text-4xl md:text-5xl mb-3">
          Hot answers, <span className="italic text-primary">served in milliseconds</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mb-8">
          Frequent FAQ lookups and recent AI completions are cached so the most common questions return instantly.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Stat icon={Timer} label="Avg latency" value="—" hint="cached responses" />
          <Stat icon={Activity} label="Hit rate" value="—" hint="last 24h" />
          <Stat icon={Database} label="Entries" value="0" hint="in-memory tier" />
        </div>

        <div className="rounded-2xl border bg-card p-6" style={{ boxShadow: "var(--shadow-elegant)" }}>
          <h2 className="text-xl mb-4">How it works</h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li><b className="text-foreground">1.</b> Every chat question is hashed and checked against the cache.</li>
            <li><b className="text-foreground">2.</b> Cache hit → reply is returned in &lt;100ms with no DB or AI call.</li>
            <li><b className="text-foreground">3.</b> Cache miss → answer is computed, then stored with a 1-hour TTL.</li>
            <li><b className="text-foreground">4.</b> Admins can purge the cache when FAQs change.</li>
          </ol>
          <div className="mt-6 flex gap-3">
            <button disabled className="px-4 py-2 rounded-lg border text-sm text-muted-foreground cursor-not-allowed">Purge cache (admin)</button>
            <span className="text-xs text-muted-foreground self-center">Backend wiring coming next.</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Zap; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <Icon className="size-5 text-primary mb-3" />
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl mt-1">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}
