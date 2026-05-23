import { Nav } from "../components/Nav";
import { Link } from "react-router-dom";
import { FileText, ArrowRight, Book, ShieldAlert, Sparkles } from "lucide-react";

export default function Docs() {
  return (
    <div className="page" style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div className="orb" style={{ width: 350, height: 350, background: 'var(--orb1-color)', top: '10%', right: '-5%' }} />
        <div className="grid-lines" />
      </div>
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '3rem 2rem' }}>
        <div className="badge-pill" style={{ marginBottom: 16 }}>
          <FileText size={12} /> Architecture
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
          Vector Search over <span className="grad-text">college docs</span>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 40, maxWidth: 700 }}>
          Learn how Knoq-AI ingests handbooks, circulars, and timetables to provide exact, cited answers to student queries.
        </p>

        {/* ═══ INTERACTIVE DIAGRAM ═══ */}
        <div className="glass-card" style={{ marginBottom: 32, padding: '2.5rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} style={{ color: 'var(--teal)' }} /> How Knoq-AI Works: RAG Architecture Flow
          </h2>
          <div style={{
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            position: 'relative'
          }}>
            {[
              { step: "01", title: "Query Input", desc: "Student types a question in natural language." },
              { step: "02", title: "Vector Lookup", desc: "MongoDB searches indexed vector chunks." },
              { step: "03", title: "RAG Injection", desc: "Top matches are compiled as context." },
              { step: "04", title: "Gemini Synthesis", desc: "AI responds with precise sources." }
            ].map((item, idx) => (
              <div key={item.step} style={{
                flex: '1 1 220px',
                background: 'var(--surface2)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--r)',
                padding: '1.75rem 1.5rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start'
              }}>
                <span style={{
                  position: 'absolute', top: 12, right: 16,
                  fontSize: 28, fontWeight: 800,
                  background: 'linear-gradient(135deg, var(--v), var(--teal))',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  opacity: 0.15
                }}>{item.step}</span>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8, marginTop: 12 }}>{item.title}</h4>
                <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 32 }}>
          <div className="feat-card">
            <div className="icon-box" style={{ marginBottom: 16 }}><Book size={20} /></div>
            <h3 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>RAG Pipeline</h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
              We use <strong style={{ color: 'var(--v2)' }}>Retrieval-Augmented Generation (RAG)</strong>. When a student asks a question, we convert it to a vector, search MongoDB for similar chunks, and feed those to Gemini as context.
            </p>
          </div>
          <div className="feat-card">
            <div className="icon-box" style={{ marginBottom: 16 }}><ShieldAlert size={20} /></div>
            <h3 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>Citations</h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
              Because the AI only generates answers based on provided context chunks, it can cite its sources. E.g. <em style={{ color: 'var(--teal)' }}>"According to the 2026 Student Handbook [1]..."</em>
            </p>
          </div>
        </div>

        <div className="glass-card glass-card-star">
          <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 12 }}>How to manage documents</h2>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.7 }}>
            Admins can use the built-in web crawler to point the bot at Parul University subdomains. The crawler extracts the text, embeds it, and stores it in the vector database automatically.
          </p>
          <Link to="/admin" className="btn-glow" style={{ fontSize: 13 }}>
            Go to Site Crawler <ArrowRight size={14} />
          </Link>
        </div>
      </main>
    </div>
  );
}
