import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChatPanel } from "../components/ChatPanel";
import { Nav } from "../components/Nav";
import { useAuth } from "../contexts/AuthContext";
import { Sparkles, BookOpen, Award, Library, Wifi } from "lucide-react";

export default function AppChat() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  return (
    <div className="page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div className="orb" style={{ width: 350, height: 350, background: 'var(--orb1-color)', top: '20%', right: '-5%' }} />
        <div className="orb" style={{ width: 250, height: 250, background: 'var(--orb2-color)', bottom: '10%', left: '-3%', animationDelay: '-4s' }} />
        <div className="grid-lines" />
      </div>
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1100, width: '100%', margin: '0 auto', padding: '2rem', flex: 1 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            Ask <span className="grad-text">Knoq-AI</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text2)' }}>Search the knowledge base, then AI fills the gaps. Every chat is saved to your history.</p>
        </div>

        {user && (
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
            {/* Left panel - Helper options */}
            <div className="glass-card" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2rem' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} style={{ color: 'var(--teal)' }} /> Quick Assist
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>
                  Click any of the frequent inquiries below to automatically load the question or read about standard campus procedures.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { q: "What is the policy for exam re-evaluation?", icon: BookOpen },
                    { q: "How can I apply for merit scholarships?", icon: Award },
                    { q: "What are the timings and rules of the central library?", icon: Library },
                    { q: "How to register for campus hostel Wi-Fi?", icon: Wifi }
                  ].map(item => (
                    <button
                      key={item.q}
                      className="btn-outline"
                      style={{
                        padding: '10px 16px',
                        borderRadius: 12,
                        fontSize: 12,
                        textAlign: 'left',
                        justifyContent: 'flex-start',
                        width: '100%',
                        lineHeight: 1.4
                      }}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("trigger-chat-query", { detail: item.q }));
                      }}
                    >
                      <item.icon size={13} style={{ flexShrink: 0, color: 'var(--v2)' }} />
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.q}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 24, borderTop: '0.5px solid var(--border)', paddingTop: 16, fontSize: 12, color: 'var(--text3)' }}>
                💡 Type natural questions like "where is admin block?" or "fee due date B.Tech IT".
              </div>
            </div>

            {/* Right panel - Main chat */}
            <div style={{ flex: '1.4 1 450px' }}>
              <ChatPanel mode="authed" height={600} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
