import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChatPanel } from "../components/ChatPanel";
import { Nav } from "../components/Nav";
import { useAuth } from "../contexts/AuthContext";
import { Sparkles, BookOpen, Award, Library, Wifi } from "lucide-react";

export default function AppChat() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (!loading && user) {
      import("../api/client").then(module => {
        const api = module.default;
        api.get('/chat/history')
          .then(res => setHistory(res.data.logs || []))
          .catch(err => console.error("History fetch error", err))
          .finally(() => setHistoryLoading(false));
      });
    }
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
            {/* Left panel - Helper options & History */}
            <div className="glass-card" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', padding: '1.5rem', maxHeight: 600, overflowY: 'auto' }}>
              
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={16} style={{ color: 'var(--v2)' }} /> Chat History
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
                  View your previous searches (Read-Only).
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {historyLoading ? (
                    <p style={{ fontSize: 12, color: 'var(--text3)' }}>Loading history...</p>
                  ) : history.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--text3)' }}>No previous chats.</p>
                  ) : (
                    history.map(log => (
                      <div key={log._id} className="history-item" style={{ 
                        padding: '10px 12px', 
                        background: selectedHistory === log._id ? 'rgba(124,92,252,0.1)' : 'var(--surface)', 
                        border: `0.5px solid ${selectedHistory === log._id ? 'var(--v2)' : 'var(--border)'}`, 
                        borderRadius: 8, 
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }} onClick={() => setSelectedHistory(selectedHistory === log._id ? null : log._id)}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Q: {log.question}
                        </div>
                        {selectedHistory === log._id && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid var(--border)', fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>
                            <strong>A:</strong> {log.answer}
                            <div style={{ marginTop: 6, fontSize: 9, color: 'var(--text3)' }}>
                              {new Date(log.createdAt).toLocaleString()} • {log.source}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={14} style={{ color: 'var(--teal)' }} /> Quick Assist
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { q: "What is the policy for exam re-evaluation?", icon: BookOpen },
                    { q: "How can I apply for merit scholarships?", icon: Award }
                  ].map(item => (
                    <button
                      key={item.q}
                      className="btn-outline"
                      style={{ padding: '8px 12px', borderRadius: 8, fontSize: 11, textAlign: 'left', justifyContent: 'flex-start', width: '100%', lineHeight: 1.3 }}
                      onClick={() => window.dispatchEvent(new CustomEvent("trigger-chat-query", { detail: item.q }))}
                    >
                      <item.icon size={12} style={{ flexShrink: 0, color: 'var(--v2)' }} />
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.q}</span>
                    </button>
                  ))}
                </div>
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
