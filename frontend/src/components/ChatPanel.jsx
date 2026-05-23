import { useState, useRef, useEffect } from "react";
import api from "../api/client";
import { Send, Sparkles, BookMarked, Bot, User, Lock, MapPin } from "lucide-react";

/**
 * Lightweight markdown-to-JSX renderer for chat messages.
 * Supports: **bold**, [link text](url), * bullet points, and line breaks.
 */
function renderMarkdown(text) {
  if (!text) return null;
  if (typeof text !== 'string') return text;
  
  const lines = text.split('\n');
  
  return lines.map((line, lineIdx) => {
    // Process inline markdown within each line
    const parts = [];
    let remaining = line;
    let partIdx = 0;
    
    while (remaining.length > 0) {
      // Check for markdown link: [text](url)
      const linkMatch = remaining.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
      // Check for bold: **text**
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      
      // Find which comes first
      const linkPos = linkMatch ? remaining.indexOf(linkMatch[0]) : Infinity;
      const boldPos = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity;
      
      if (linkPos === Infinity && boldPos === Infinity) {
        // No more markdown, push remaining text
        if (remaining) parts.push(<span key={partIdx++}>{remaining}</span>);
        break;
      }
      
      if (linkPos <= boldPos) {
        // Link comes first
        if (linkPos > 0) {
          parts.push(<span key={partIdx++}>{remaining.substring(0, linkPos)}</span>);
        }
        parts.push(
          <a
            key={partIdx++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--teal)',
              textDecoration: 'underline',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.target.style.opacity = '0.8'}
            onMouseLeave={e => e.target.style.opacity = '1'}
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.substring(linkPos + linkMatch[0].length);
      } else {
        // Bold comes first
        if (boldPos > 0) {
          parts.push(<span key={partIdx++}>{remaining.substring(0, boldPos)}</span>);
        }
        parts.push(<strong key={partIdx++} style={{ color: 'var(--text)', fontWeight: 600 }}>{boldMatch[1]}</strong>);
        remaining = remaining.substring(boldPos + boldMatch[0].length);
      }
    }
    
    return (
      <span key={lineIdx}>
        {lineIdx > 0 && <br />}
        {parts}
      </span>
    );
  });
}

const FREE_SUGGESTIONS = ["When do exams start?", "Hostel fee?", "Library hours?", "Placement season?"];
const AUTHED_SUGGESTIONS = ["Tell me about scholarships", "How do I get a transcript?", "Wi-Fi setup help", "Exam re-evaluation process"];

export function ChatPanel({ mode = "free", height = 520 }) {
  const initial = mode === "authed"
    ? "Welcome back! Ask me anything about campus — I'll search the knowledge base and use AI when needed."
    : "Hi! I'm Knoq-AI — free mode shares basic public info. Sign in with @paruluniversity.ac.in for the full experience.";

  const [messages, setMessages] = useState([{ role: "assistant", content: initial }]);
  const [input, setInput] = useState("");
  const [isPending, setIsPending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isPending]);

  // Hook into quick-trigger query clicks from main pages
  useEffect(() => {
    const handleTrigger = (e) => {
      if (e.detail) {
        send(e.detail);
      }
    };
    window.addEventListener("trigger-chat-query", handleTrigger);
    return () => window.removeEventListener("trigger-chat-query", handleTrigger);
  }, [messages, isPending]);

  async function send(text) {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;
    const next = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setIsPending(true);
    try {
      let res;
      if (mode === "authed") {
        res = await api.post('/chat/authed', { messages: next.map(m => ({ role: m.role, content: m.content })) });
      } else {
        res = await api.post('/chat/free', { question: trimmed });
      }
      setMessages(m => [...m, { role: "assistant", content: res.data.reply, source: res.data.source }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Something went wrong. Please try again.", source: "error" }]);
    } finally {
      setIsPending(false);
    }
  }

  const suggestions = mode === "authed" ? AUTHED_SUGGESTIONS : FREE_SUGGESTIONS;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '0.5px solid var(--border2)',
      borderRadius: 'var(--r2)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: height,
      transition: 'all 0.4s cubic-bezier(.34,1.56,.64,1)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '0.5px solid var(--border)',
        background: 'rgba(124,92,252,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, var(--v), var(--teal))',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16, position: 'relative',
          }}>
            <Bot size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Knoq-AI</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              {mode === "authed" ? "Full access · AI + Knowledge Base" : "Free mode · basic FAQ only"}
            </div>
          </div>
        </div>
        {mode === "free" && (
          <span className="guest-chip"><Lock size={11} /> GUEST</span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10, animation: 'slide-in 0.4s ease',
            flexDirection: m.role === "user" ? "row-reverse" : "row",
          }}>
            <div style={{
              width: 28, height: 28,
              background: m.role === "user" ? 'rgba(0,212,170,0.15)' : 'rgba(124,92,252,0.15)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: m.role === "user" ? 'var(--teal)' : 'var(--v2)',
              fontSize: 12, flexShrink: 0,
              border: '0.5px solid var(--border)',
            }}>
              {m.role === "user" ? <User size={13} /> : <Bot size={13} />}
            </div>
            <div style={{
              background: m.role === "user" ? 'rgba(0,212,170,0.12)' : 'rgba(124,92,252,0.1)',
              border: '0.5px solid var(--border)',
              borderRadius: m.role === "user" ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
              padding: '10px 14px',
              fontSize: 13, color: 'var(--text2)',
              maxWidth: '78%', lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
            }}>
              {renderMarkdown(m.content)}
              {m.source === "faq" && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, opacity: 0.7, color: 'var(--teal)' }}>
                  <BookMarked size={10} /> from FAQ
                </div>
              )}
              {m.source === "ai" && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, opacity: 0.7, color: 'var(--v2)' }}>
                  <Sparkles size={10} /> AI generated
                </div>
              )}
              {m.source === "cache" && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, opacity: 0.7, color: 'var(--gold)' }}>
                  <Sparkles size={10} /> cached answer
                </div>
              )}
              {m.source === "map" && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, opacity: 0.7, color: 'var(--teal)' }}>
                  <BookMarked size={10} /> campus navigation
                </div>
              )}
            </div>
          </div>
        ))}
        {isPending && (
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{
              width: 28, height: 28, background: 'rgba(124,92,252,0.15)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--v2)',
              border: '0.5px solid var(--border)',
            }}><Bot size={13} /></div>
            <div style={{
              background: 'rgba(124,92,252,0.1)', border: '0.5px solid var(--border)',
              borderRadius: '4px 14px 14px 14px', padding: '10px 14px',
              display: 'flex', gap: 5, alignItems: 'center',
            }}>
              <span style={{ width: 5, height: 5, background: 'var(--v2)', borderRadius: '50%', animation: 'dot-bounce 1.4s infinite' }} />
              <span style={{ width: 5, height: 5, background: 'var(--v2)', borderRadius: '50%', animation: 'dot-bounce 1.4s infinite 0.15s' }} />
              <span style={{ width: 5, height: 5, background: 'var(--v2)', borderRadius: '50%', animation: 'dot-bounce 1.4s infinite 0.3s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px', flexWrap: 'wrap' }}>
          {suggestions.map(s => (
            <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); send(input); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px',
          borderTop: '0.5px solid var(--border)',
          background: 'rgba(124,92,252,0.02)',
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={mode === "authed" ? "Ask anything about campus…" : "Ask a basic question…"}
          style={{
            flex: 1, border: 'none', background: 'transparent',
            fontSize: 13, color: 'var(--text2)', outline: 'none',
          }}
        />
        <button type="submit" disabled={isPending || !input.trim()} style={{
          width: 32, height: 32,
          background: isPending || !input.trim() ? 'rgba(124,92,252,0.08)' : 'rgba(124,92,252,0.15)',
          border: '0.5px solid var(--border2)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--v2)', cursor: isPending || !input.trim() ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s cubic-bezier(.34,1.56,.64,1)',
          opacity: isPending || !input.trim() ? 0.4 : 1,
        }}>
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
