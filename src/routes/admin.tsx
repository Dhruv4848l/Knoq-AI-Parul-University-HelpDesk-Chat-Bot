import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/lib/auth";
import { upsertFaq, deleteFaq, listChatLogs } from "@/lib/chat.functions";
import { SiteCrawler } from "@/components/SiteCrawler";
import { Plus, Pencil, Trash2, BookMarked, MessagesSquare, X } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — CampusBot" }] }),
  component: Admin,
});

type FAQ = {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
  updated_at: string;
};

function Admin() {
  const { loading, user, roles } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;

  if (user && !isAdmin) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h1 className="text-3xl mb-3">Admin access required</h1>
          <p className="text-muted-foreground mb-6">Your account doesn't have admin privileges yet.</p>
          <div className="rounded-xl border bg-card p-6 text-left text-sm">
            <p className="mb-3 font-medium">To grant yourself admin access (one-time setup):</p>
            <p className="text-muted-foreground mb-2">Open the backend dashboard, go to the <code className="bg-muted px-1 rounded">user_roles</code> table, and add a row:</p>
            <pre className="bg-muted rounded p-3 text-xs overflow-x-auto">user_id: {user.id}
role: admin</pre>
          </div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-6xl mx-auto px-6 pb-20">
        <header className="mb-10">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-2">Admin Dashboard</p>
          <h1 className="text-4xl">Manage CampusBot</h1>
        </header>
        <div className="grid lg:grid-cols-2 gap-8">
          <FAQManager />
          <ChatLogs />
        </div>
      </main>
    </div>
  );
}

function FAQManager() {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertFaq);
  const del = useServerFn(deleteFaq);
  const [editing, setEditing] = useState<FAQ | "new" | null>(null);

  const { data: faqs = [] } = useQuery({
    queryKey: ["faqs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faqs").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as FAQ[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (payload: { id?: string; faq: Omit<FAQ, "id" | "updated_at"> }) =>
      upsert({ data: payload }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["faqs"] }); setEditing(null); },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faqs"] }),
  });

  return (
    <section className="rounded-2xl border bg-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BookMarked className="size-5 text-primary" />
          <h2 className="text-2xl">Knowledge Base</h2>
          <span className="text-xs text-muted-foreground">({faqs.length})</span>
        </div>
        <button onClick={() => setEditing("new")} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90">
          <Plus className="size-4" /> Add
        </button>
      </div>

      <div className="space-y-3 max-h-[520px] overflow-y-auto">
        {faqs.map((f) => (
          <article key={f.id} className="border rounded-lg p-4 hover:border-primary/40 transition">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm mb-1">{f.question}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{f.answer}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {f.keywords.slice(0, 4).map((k) => (
                    <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground">{k}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(f)} className="p-1.5 rounded hover:bg-accent"><Pencil className="size-3.5" /></button>
                <button onClick={() => { if (confirm("Delete this FAQ?")) delMut.mutate(f.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <FAQEditor
          faq={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(f) => saveMut.mutate({ id: editing === "new" ? undefined : editing.id, faq: f })}
          saving={saveMut.isPending}
        />
      )}
    </section>
  );
}

function FAQEditor({ faq, onClose, onSave, saving }: {
  faq: FAQ | null;
  onClose: () => void;
  onSave: (f: { question: string; answer: string; keywords: string[]; category: string }) => void;
  saving: boolean;
}) {
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [keywordsRaw, setKeywordsRaw] = useState(faq?.keywords.join(", ") ?? "");
  const [category, setCategory] = useState(faq?.category ?? "general");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()} style={{ boxShadow: "var(--shadow-elegant)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl">{faq ? "Edit FAQ" : "New FAQ"}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X className="size-4" /></button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); onSave({ question, answer, keywords: keywordsRaw.split(",").map((s) => s.trim()).filter(Boolean), category }); }}
          className="space-y-3"
        >
          <Input label="Question" value={question} onChange={setQuestion} required />
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Answer</span>
            <textarea required value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} className="mt-1.5 w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <Input label="Keywords (comma-separated)" value={keywordsRaw} onChange={setKeywordsRaw} placeholder="exam, datesheet" />
          <Input label="Category" value={category} onChange={setCategory} />
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );
}

function ChatLogs() {
  const fn = useServerFn(listChatLogs);
  const { data, isLoading } = useQuery({
    queryKey: ["chat-logs"],
    queryFn: () => fn(),
  });

  return (
    <section className="rounded-2xl border bg-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <MessagesSquare className="size-5 text-primary" />
        <h2 className="text-2xl">Recent Conversations</h2>
        <span className="text-xs text-muted-foreground">({data?.logs.length ?? 0})</span>
      </div>
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {data?.logs.length === 0 && <p className="text-sm text-muted-foreground">No conversations yet.</p>}
        {data?.logs.map((l) => (
          <article key={l.id} className="border rounded-lg p-3 text-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent text-accent-foreground">{l.source}</span>
              <time className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleString()}</time>
            </div>
            <p className="font-medium text-xs mb-1">Q: {l.question}</p>
            <p className="text-xs text-muted-foreground line-clamp-3">A: {l.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
