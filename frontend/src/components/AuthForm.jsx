import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { GraduationCap, AlertCircle, LogIn, UserPlus } from "lucide-react";

const DOMAIN = "@paruluniversity.ac.in";

export function AuthForm({ mode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!email.toLowerCase().endsWith(DOMAIN)) {
      setError(`Only ${DOMAIN} email addresses can sign in. Try free mode instead.`);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        await signup(email, password, fullName);
      } else {
        await login(email, password);
      }
      navigate("/app");
    } catch (err) {
      setError(err.response?.data?.error || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "login" ? "Welcome back" : "Create your account";
  const sub = mode === "login" ? "Sign in to access the full Knoq-AI." : "Open to all Parul University students & staff.";

  return (
    <div className="page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Background effects */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div className="orb" style={{ width: 400, height: 400, background: 'var(--orb1-color)', top: '10%', left: '-5%' }} />
        <div className="orb" style={{ width: 300, height: 300, background: 'var(--orb2-color)', bottom: '10%', right: '-5%', animationDelay: '-3s' }} />
        <div className="grid-lines" />
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'grid', placeItems: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 40 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              border: '1.5px solid var(--v)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--v2)', background: 'rgba(124,92,252,0.08)',
            }}>
              <GraduationCap size={20} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Knoq-AI</span>
          </Link>

          <div className="glass-card" style={{ padding: '2rem' }}>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>{title}</h1>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24 }}>{sub}</p>

            <div className="univ-tag" style={{ marginBottom: 20 }}>
              🔒 Restricted to <strong>{DOMAIN}</strong> accounts only.
            </div>

            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mode === "signup" && (
                <div>
                  <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', marginBottom: 6, display: 'block' }}>Full name</label>
                  <input required value={fullName} onChange={e => setFullName(e.target.value)} className="cb-input" placeholder="Riya Patel" />
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', marginBottom: 6, display: 'block' }}>University email</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="cb-input" placeholder={`yourname${DOMAIN}`} />
              </div>
              <div>
                <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', marginBottom: 6, display: 'block' }}>Password</label>
                <input required type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} className="cb-input" placeholder="At least 8 characters" />
              </div>

              {error && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  fontSize: 13, color: '#ff6b6b',
                  background: 'rgba(255,107,107,0.1)',
                  border: '0.5px solid rgba(255,107,107,0.2)',
                  borderRadius: 12, padding: '10px 14px',
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-glow" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                {loading ? "Please wait…" : mode === "login" ? <><LogIn size={16} /> Sign in</> : <><UserPlus size={16} /> Create account</>}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text3)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mode === "login" ? (
                <p>No account? <Link to="/signup" style={{ color: 'var(--v2)', textDecoration: 'underline' }}>Create one</Link></p>
              ) : (
                <p>Already have one? <Link to="/login" style={{ color: 'var(--v2)', textDecoration: 'underline' }}>Sign in</Link></p>
              )}
              <p>Not a Parul student? <Link to="/" style={{ color: 'var(--teal)', textDecoration: 'underline' }}>Use free chat</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
