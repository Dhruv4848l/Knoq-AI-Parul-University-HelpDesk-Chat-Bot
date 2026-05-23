import { Link } from "react-router-dom";
import { ChatPanel } from "../components/ChatPanel";
import { Nav } from "../components/Nav";
import { MessageSquare, Database, Settings2, Users, ShieldCheck, LogIn, Sparkles, Zap } from "lucide-react";

function Home() {
  return (
    <div style={{ background: 'var(--ink)', color: 'var(--text)', minHeight: '100vh' }}>
      <Nav />

      {/* ═══ HERO — full viewport height ═══ */}
      <section style={{
        position: 'relative',
        minHeight: 'calc(100vh - 66px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        overflow: 'hidden',
      }}>
        {/* Background effects */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div className="orb" style={{ width: 500, height: 500, background: 'var(--orb1-color)', top: '-15%', left: '-10%' }} />
          <div className="orb" style={{ width: 350, height: 350, background: 'var(--orb2-color)', bottom: '-10%', right: '10%', animationDelay: '-3s' }} />
          <div className="orb" style={{ width: 200, height: 200, background: 'var(--orb3-color)', top: '20%', right: '5%', animationDelay: '-5s' }} />
          <div className="grid-lines" />
        </div>

        {/* Hero content wrapper */}
        <div style={{
          position: 'relative', zIndex: 2,
          display: 'flex', alignItems: 'center', gap: '5rem',
          maxWidth: 1300, width: '100%',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}>
          {/* Left — Text */}
          <div style={{ flex: '1.2 1 450px', minWidth: 320 }}>
            <div className="badge-pill" style={{ marginBottom: 24 }}>
              <span className="badge-dot" />
              Built for Parul University
            </div>

            <h1 style={{
              fontSize: 'clamp(2.8rem, 5.5vw, 4.2rem)',
              fontWeight: 700,
              lineHeight: 1.05,
              marginBottom: 20,
              letterSpacing: '-0.03em',
            }}>
              Your campus,<br />
              <span className="grad-text">always answering.</span>
            </h1>

            <p style={{
              fontSize: 17, color: 'var(--text2)',
              maxWidth: 520, marginBottom: 36, lineHeight: 1.75,
            }}>
              An AI helpdesk that handles the thousand questions students ask the admin office every week — instantly, 24/7, and in plain English.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <Link to="/login" className="btn-glow">
                <LogIn size={16} /> Sign in for full access
              </Link>
              <a href="#chat-section" className="btn-outline">
                <MessageSquare size={16} /> Try free chat
              </a>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text3)' }}>
              Sign-in restricted to <strong style={{ color: 'var(--v3)' }}>@paruluniversity.ac.in</strong> · Free mode open to everyone
            </p>
          </div>

          {/* Right — Chat */}
          <div id="chat-section" style={{
            flex: '1 1 420px', minWidth: 320, maxWidth: 480,
            animation: 'float 6s ease-in-out infinite',
          }}>
            <ChatPanel mode="free" height={580} />
          </div>
        </div>
      </section>

      <div className="sep" />

      {/* ═══ STATS SHOWCASE ═══ */}
      <section style={{ padding: '3rem 2rem 1rem', maxWidth: 1300, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 20,
        }}>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '1.75rem' }}>
            <div className="icon-box" style={{ background: 'rgba(0,212,170,0.1)', color: 'var(--teal)', width: 48, height: 48, borderRadius: 14 }}>
              <Zap size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>&lt; 50ms</h4>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Cached Response Latency</p>
            </div>
          </div>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '1.75rem' }}>
            <div className="icon-box" style={{ background: 'rgba(124,92,252,0.1)', color: 'var(--v2)', width: 48, height: 48, borderRadius: 14 }}>
              <MessageSquare size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>10,000+</h4>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Queries Answered Monthly</p>
            </div>
          </div>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '1.75rem' }}>
            <div className="icon-box" style={{ background: 'rgba(245,200,66,0.1)', color: 'var(--gold)', width: 48, height: 48, borderRadius: 14 }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>Gemini 1.5</h4>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Retrieval-Augmented AI</p>
            </div>
          </div>
        </div>
      </section>

      <div className="sep" />

      {/* ═══ ACCESS MODES ═══ */}
      <section style={{ padding: '4rem 2rem', maxWidth: 1300, margin: '0 auto' }}>
        <div className="sec-label">Access modes</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {/* Guest Card */}
          <div className="glass-card">
            <div className="icon-box" style={{
              marginBottom: 16,
              background: 'rgba(100,100,120,0.12)',
              color: 'var(--text3)',
              borderColor: 'rgba(100,100,120,0.2)',
            }}>
              <Users size={20} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Free mode · Guest</h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.65 }}>
              No sign-in required. Anyone can ask basic public questions and get short, curated answers.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { t: "Basic FAQs (exams, hostel, library)", on: true },
                { t: "No account needed", on: true },
                { t: "No chat history saved", on: false },
                { t: "No AI fallback for unknown questions", on: false },
              ].map(i => (
                <li key={i.t} style={{ fontSize: 13, color: i.on ? 'var(--text2)' : 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: i.on ? 'var(--teal)' : 'var(--text3)', fontWeight: 600 }}>{i.on ? '✓' : '—'}</span> {i.t}
                </li>
              ))}
            </ul>
          </div>

          {/* Full Card */}
          <div className="glass-card glass-card-star">
            <span className="univ-tag" style={{ marginBottom: 14, display: 'inline-flex' }}>
              <ShieldCheck size={11} /> @paruluniversity.ac.in
            </span>
            <div className="icon-box" style={{ marginBottom: 16 }}>
              <ShieldCheck size={20} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Full mode · Parul students & staff</h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.65 }}>
              Sign in with your university email to unlock the complete experience.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {["Full knowledge base + admin-curated FAQs", "Gemini AI for unknown questions", "Personal chat history", "Admin dashboard (role-restricted)"].map(t => (
                <li key={t} style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--teal)', fontWeight: 600 }}>✓</span> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="sep" />

      {/* ═══ HOW IT WORKS ═══ */}
      <section style={{ padding: '4rem 2rem', maxWidth: 1300, margin: '0 auto' }}>
        <div className="sec-label">How it works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <FeatureCard icon={MessageSquare} title="Natural conversation" desc="Students just type — no menus. The bot understands context across the full conversation." />
          <FeatureCard icon={Database} title="FAQ-first, AI-fallback" desc="Curated answers come first. Unknown questions get a Gemini-powered response." />
          <FeatureCard icon={Settings2} title="Admin-controlled" desc="The admin team adds, edits, or removes FAQs from a dedicated dashboard — zero code needed." />
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 2rem',
        borderTop: '0.5px solid var(--border)',
        background: 'var(--ink2)',
      }}>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>Knoq-AI · Parul University AI Helpdesk</div>
        <span className="ver-tag">v1.0 (MERN)</span>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="feat-card">
      <div className="icon-box" style={{ marginBottom: 16 }}>
        <Icon size={20} />
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{title}</h3>
      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>{desc}</p>
    </div>
  );
}

export default Home;
