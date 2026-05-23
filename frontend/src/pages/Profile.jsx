import { Nav } from "../components/Nav";
import { GraduationCap, Building2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../contexts/AuthContext";

const BRANCHES = ["B.Tech CSE", "B.Tech IT", "B.Tech ECE", "B.Tech Mech", "B.Tech Civil", "BBA", "BCA", "MBA", "Other"];
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export default function ProfilePage() {
  const { user } = useAuth();
  const signedIn = !!user;
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [hostel, setHostel] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (signedIn) {
      api.get('/profile').then(res => {
        if (res.data.profile) { setBranch(res.data.profile.branch ?? ""); setSemester(res.data.profile.semester ?? ""); setHostel(res.data.profile.hostel ?? ""); }
      });
    }
  }, [signedIn]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await api.post('/profile', { branch, semester, hostel }); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch { alert("Failed to save preferences"); } finally { setLoading(false); }
  };

  return (
    <div className="page" style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div className="orb" style={{ width: 300, height: 300, background: 'var(--orb1-color)', top: '15%', left: '-5%' }} />
        <div className="orb" style={{ width: 250, height: 250, background: 'var(--orb3-color)', bottom: '10%', right: '-3%', animationDelay: '-4s' }} />
        <div className="grid-lines" />
      </div>
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '3rem 2rem' }}>
        <div className="badge-pill" style={{ marginBottom: 16 }}>
          <span className="badge-dot" /> Personalization
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
          Tell us <span className="grad-text">about you</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 32 }}>
          Knoq-AI will tailor exam dates, fees, hostel rules, and notices to your branch and year.
        </p>

        {!signedIn && (
          <div className="glass-card">
            <p style={{ fontSize: 14, color: 'var(--text2)' }}>
              Sign in with your <span style={{ color: 'var(--text)' }}>@paruluniversity.ac.in</span> account to save personalization preferences.
            </p>
          </div>
        )}

        {signedIn && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28, alignItems: 'start' }}>
            {/* Form Column */}
            <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>
                  <GraduationCap size={16} style={{ color: 'var(--text3)' }} /> Branch / Program
                </label>
                <select value={branch} onChange={e => setBranch(e.target.value)} className="cb-input" style={{ cursor: 'pointer' }}>
                  <option value="">Select your program</option>
                  {BRANCHES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>
                  <GraduationCap size={16} style={{ color: 'var(--text3)' }} /> Current semester
                </label>
                <select value={semester} onChange={e => setSemester(e.target.value)} className="cb-input" style={{ cursor: 'pointer' }}>
                  <option value="">Select semester</option>
                  {SEMESTERS.map(s => <option key={s} value={`Semester ${s}`}>Semester {s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>
                  <Building2 size={16} style={{ color: 'var(--text3)' }} /> Hostel block (optional)
                </label>
                <input value={hostel} onChange={e => setHostel(e.target.value)} className="cb-input" placeholder="e.g. Boys Hostel C, Girls Hostel A" />
              </div>
              <button disabled={loading} className="btn-glow" style={{ width: '100%', justifyContent: 'center' }}>
                <Save size={16} /> {saved ? "Saved!" : loading ? "Saving…" : "Save preferences"}
              </button>
              <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>Knoq-AI will use these to tailor its replies to you.</p>
            </form>

            {/* Academic ID Card Mockup Column */}
            <div className="glass-card glass-card-star" style={{
              padding: '2.5rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              minHeight: 360,
              position: 'relative'
            }}>
              <div className="orb" style={{ width: 180, height: 180, background: 'var(--orb2-color)', top: '10%', right: '10%' }} />
              
              {/* Card Header */}
              <div style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '0.5px solid var(--border)',
                paddingBottom: 16,
                marginBottom: 20
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--text3)' }}>PARUL UNIVERSITY</span>
                <span className="univ-tag" style={{ fontSize: 9, padding: '2px 8px' }}>ACADEMIC PASS</span>
              </div>

              {/* Card Avatar / Icon */}
              <div style={{
                width: 72, height: 72,
                borderRadius: 22,
                background: 'linear-gradient(135deg, var(--v), var(--teal))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 8px 24px var(--v-glow)',
                marginBottom: 16
              }}>
                <GraduationCap size={36} />
              </div>

              {/* Card User Details */}
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                {user?.fullName || "Student Member"}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
                {user?.email || "student@paruluniversity.ac.in"}
              </p>

              {/* Tailored Badges */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
                <span className="chip" style={{ cursor: 'default', fontSize: 11, background: 'rgba(124,92,252,0.1)', color: 'var(--v2)', borderColor: 'var(--border)' }}>
                  🎓 {branch || "Select Program"}
                </span>
                <span className="chip" style={{ cursor: 'default', fontSize: 11, background: 'rgba(0,212,170,0.1)', color: 'var(--teal)', borderColor: 'var(--border)' }}>
                  ⚡ {semester || "Select Semester"}
                </span>
                {hostel && (
                  <span className="chip" style={{ cursor: 'default', fontSize: 11, background: 'rgba(245,200,66,0.1)', color: 'var(--gold)', borderColor: 'var(--border)' }}>
                    🏠 {hostel}
                  </span>
                )}
              </div>

              {/* Digital Signature / Barcode Mock */}
              <div style={{
                width: '100%',
                height: 32,
                background: 'var(--ink3)',
                border: '0.5px solid var(--border)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontFamily: 'monospace',
                color: 'var(--text3)',
                letterSpacing: '0.28em'
              }}>
                ||||||||||| LIVE PASS |||||||||||
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
