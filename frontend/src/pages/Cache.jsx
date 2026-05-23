import { Nav } from "../components/Nav";
import { Link } from "react-router-dom";
import { Database, Zap, ArrowRight, Gauge, Server } from "lucide-react";

export default function Cache() {
  return (
    <div className="page" style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div className="orb" style={{ width: 300, height: 300, background: 'var(--orb2-color)', bottom: '10%', left: '-5%' }} />
        <div className="grid-lines" />
      </div>
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '3rem 2rem' }}>
        <div className="badge-pill" style={{ marginBottom: 16 }}>
          <Database size={12} /> Performance
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
          MongoDB <span className="grad-text">Cache Layer</span>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 40, maxWidth: 700 }}>
          How we use MongoDB to cache hot FAQ lookups, dropping response latency and saving on AI API costs.
        </p>

        {/* ═══ LATENCY COMPARISON DASHBOARD ═══ */}
        <div className="glass-card" style={{ marginBottom: 32, padding: '2rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} style={{ color: 'var(--gold)' }} /> Live Cache & Latency Simulation
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {/* Metric 1 */}
            <div style={{ background: 'var(--surface2)', border: '0.5px solid var(--border)', padding: '1.25rem 1.5rem', borderRadius: 'var(--r)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 12, color: 'var(--text3)' }}>
                <span>Cache lookup hit latency</span>
                <span style={{ color: 'var(--teal)', fontWeight: 600 }}>&lt; 50ms</span>
              </div>
              <div style={{ height: 6, background: 'var(--ink3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: '6%', height: '100%', background: 'var(--teal)' }} />
              </div>
            </div>
            {/* Metric 2 */}
            <div style={{ background: 'var(--surface2)', border: '0.5px solid var(--border)', padding: '1.25rem 1.5rem', borderRadius: 'var(--r)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 12, color: 'var(--text3)' }}>
                <span>RAG pipeline fallback latency</span>
                <span style={{ color: 'var(--v2)', fontWeight: 600 }}>~1,200ms</span>
              </div>
              <div style={{ height: 6, background: 'var(--ink3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: '85%', height: '100%', background: 'var(--v2)' }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 24, borderTop: '0.5px solid var(--border)', paddingTop: 16, fontSize: 12, color: 'var(--text3)' }}>
            <span>📊 Total database queries: <strong>14,823</strong></span>
            <span>💰 Token savings: <strong>$128.40</strong></span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 32 }}>
          <div className="feat-card">
            <div className="icon-box" style={{ marginBottom: 16 }}><Zap size={20} /></div>
            <h3 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>Exact keyword match</h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
              Before hitting the AI, the backend queries MongoDB for exact keyword matches in the curated FAQs. If a match is found, the response is instant (usually &lt; 50ms) and costs zero tokens.
            </p>
          </div>
          <div className="feat-card">
            <div className="icon-box" style={{ marginBottom: 16 }}><Gauge size={20} /></div>
            <h3 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>Throttling</h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
              The API uses express-rate-limit to protect the backend from abuse, ensuring that high-traffic days don't crash the server or run up massive AI bills.
            </p>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div className="icon-box" style={{ width: 56, height: 56, borderRadius: 16, flexShrink: 0 }}>
            <Server size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>Manage cached FAQs</h2>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
              Admins can manually add, edit, or remove the cached FAQs from the dashboard.
            </p>
            <Link to="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--v2)', textDecoration: 'none' }}>
              Go to FAQ Manager <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
