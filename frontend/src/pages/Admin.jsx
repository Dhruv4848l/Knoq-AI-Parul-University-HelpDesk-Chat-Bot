import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { Nav } from "../components/Nav";
import { useAuth } from "../contexts/AuthContext";
import { SiteCrawler } from "../components/SiteCrawler";
import { Plus, Pencil, Trash2, BookMarked, MessagesSquare, X } from "lucide-react";

export default function Admin() {
  const { loading, user, roles } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/login");
  }, [loading, user, navigate]);

  if (loading) return <div className="page" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text3)' }}>Loading…</div>;

  if (user && !isAdmin) {
    return (
      <div className="page" style={{ minHeight: '100vh' }}>
        <Nav />
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}><div className="grid-lines" /></div>
        <main style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto', padding: '5rem 2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Admin access required</h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24 }}>Your account doesn't have admin privileges yet.</p>
          <div className="glass-card" style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 12 }}>To grant yourself admin access:</p>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>Open MongoDB Atlas or Compass and run:</p>
            <pre style={{ background: 'var(--ink)', borderRadius: 12, padding: 16, fontSize: 12, color: 'var(--teal)', overflowX: 'auto', border: '0.5px solid var(--border)' }}>
{`db.users.updateOne(
  { email: "${user.email}" },
  { $set: { role: "admin" } }
)`}
            </pre>
          </div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="page" style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div className="orb" style={{ width: 400, height: 400, background: 'var(--orb1-color)', top: '5%', right: '-8%' }} />
        <div className="grid-lines" />
      </div>
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1300, margin: '0 auto', padding: '2rem' }}>
        <header style={{ marginBottom: 32 }}>
          <div className="sec-label">Admin Dashboard</div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 600, color: 'var(--text)' }}>
            Manage <span className="grad-text">Knoq-AI</span>
          </h1>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
          <div style={{ gridColumn: '1 / -1' }}><SiteCrawler /></div>
          <FAQManager />
          <ChatLogs />
        </div>
      </main>
    </div>
  );
}

function FAQManager() {
  const [faqs, setFaqs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchFaqs = async () => { try { const res = await api.get('/faqs'); setFaqs(res.data); } catch (e) { console.error(e); } };
  useEffect(() => { fetchFaqs(); }, []);

  const handleSave = async (faqData, id) => {
    setSaving(true);
    try {
      if (id) await api.put(`/faqs/${id}`, faqData);
      else await api.post('/faqs', faqData);
      setEditing(null); fetchFaqs();
    } catch (e) { alert("Failed to save FAQ"); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this FAQ?")) return;
    try { await api.delete(`/faqs/${id}`); fetchFaqs(); } catch (e) { console.error(e); }
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookMarked size={18} style={{ color: 'var(--v2)' }} />
          <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>Knowledge Base</h2>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>({faqs.length})</span>
        </div>
        <button onClick={() => setEditing("new")} className="btn-glow" style={{ padding: '8px 16px', fontSize: 12 }}>
          <Plus size={14} /> Add
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
        {faqs.map(f => (
          <article key={f.id} style={{
            border: '0.5px solid var(--border)', borderRadius: 'var(--r)',
            padding: 16, background: 'var(--surface2)', transition: 'all 0.3s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>{f.question}</h3>
                <p style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{f.answer}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {f.keywords.slice(0, 4).map(k => <span key={k} className="chip" style={{ cursor: 'default', padding: '2px 8px', fontSize: 10 }}>{k}</span>)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setEditing(f)} style={{ width: 30, height: 30, borderRadius: 8, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Pencil size={13} /></button>
                <button onClick={() => handleDelete(f.id)} style={{ width: 30, height: 30, borderRadius: 8, border: '0.5px solid rgba(255,107,107,0.2)', background: 'transparent', color: '#ff6b6b', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Trash2 size={13} /></button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {editing && <FAQEditor faq={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={f => handleSave(f, editing === "new" ? null : editing.id)} saving={saving} />}
    </div>
  );
}

function FAQEditor({ faq, onClose, onSave, saving }) {
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [keywordsRaw, setKeywordsRaw] = useState(faq?.keywords?.join(", ") ?? "");
  const [category, setCategory] = useState(faq?.category ?? "general");

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: 16 }} onClick={onClose}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 500, padding: '2rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>{faq ? "Edit FAQ" : "New FAQ"}</h3>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={14} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave({ question, answer, keywords: keywordsRaw.split(",").map(s => s.trim()).filter(Boolean), category }); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Question</label><input required value={question} onChange={e => setQuestion(e.target.value)} className="cb-input" /></div>
          <div><label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Answer</label><textarea required value={answer} onChange={e => setAnswer(e.target.value)} rows={4} className="cb-input" style={{ resize: 'vertical' }} /></div>
          <div><label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Keywords (comma-separated)</label><input value={keywordsRaw} onChange={e => setKeywordsRaw(e.target.value)} className="cb-input" placeholder="exam, datesheet" /></div>
          <div><label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Category</label><input value={category} onChange={e => setCategory(e.target.value)} className="cb-input" /></div>
          <button type="submit" disabled={saving} className="btn-glow" style={{ width: '100%', justifyContent: 'center' }}>{saving ? "Saving…" : "Save"}</button>
        </form>
      </div>
    </div>
  );
}

function ChatLogs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/chat-logs').then(res => setLogs(res.data.logs)).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <MessagesSquare size={18} style={{ color: 'var(--v2)' }} />
        <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>Recent Conversations</h2>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>({logs.length})</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 600, overflowY: 'auto' }}>
        {isLoading && <p style={{ fontSize: 13, color: 'var(--text3)' }}>Loading…</p>}
        {logs.length === 0 && !isLoading && <p style={{ fontSize: 13, color: 'var(--text3)' }}>No conversations yet.</p>}
        {logs.map(l => (
          <article key={l.id} style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--r)', padding: 12, background: 'var(--surface2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="univ-tag">{l.source}</span>
              <time style={{ fontSize: 10, color: 'var(--text3)' }}>{new Date(l.created_at).toLocaleString()}</time>
            </div>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Q: {l.question}</p>
            <p style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>A: {l.answer}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
