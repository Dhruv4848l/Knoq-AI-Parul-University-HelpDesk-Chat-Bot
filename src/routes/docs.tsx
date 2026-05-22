import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Sparkles, FileText, Upload, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Doc Search — CampusBot" },
      { name: "description", content: "Semantic search across Parul University handbooks, circulars, and timetables." },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  const [query, setQuery] = useState("");

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-xs text-muted-foreground mb-4">
          <Sparkles className="size-3" /> Vector search · v0
        </div>
        <h1 className="text-4xl md:text-5xl mb-3">
          Search across <span className="italic text-primary">college documents</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mb-8">
          Upload handbooks, circulars, and timetables. CampusBot embeds them and cites the exact passage when students ask.
        </p>

        <div className="rounded-2xl border bg-card p-5 mb-6" style={{ boxShadow: "var(--shadow-elegant)" }}>
          <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-4 rounded-xl border bg-background">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. attendance shortage policy"
                className="flex-1 py-3 bg-transparent outline-none text-sm"
              />
            </div>
            <button className="px-5 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90">Search</button>
          </form>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <div className="rounded-xl border bg-card p-5">
            <Upload className="size-5 text-primary mb-3" />
            <h3 className="text-lg mb-1">Upload sources</h3>
            <p className="text-sm text-muted-foreground">PDF handbooks, circular notices, and timetable images. (Admin only — coming next.)</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <FileText className="size-5 text-primary mb-3" />
            <h3 className="text-lg mb-1">Cited answers</h3>
            <p className="text-sm text-muted-foreground">Every chat reply will link back to the exact paragraph it came from.</p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">No documents indexed yet.</p>
          <Link to="/admin" className="text-sm text-primary underline underline-offset-4">Go to admin to upload →</Link>
        </div>
      </main>
    </div>
  );
}
