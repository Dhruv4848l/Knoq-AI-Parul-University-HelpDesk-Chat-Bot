import { Link } from "react-router-dom";
import { GraduationCap, LogIn, LayoutDashboard, LogOut, MessageSquare, Sun, Moon, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

export function Nav() {
  const { user, roles, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = roles.includes("admin");

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '1rem 2rem',
      background: 'var(--nav-bg)',
      borderBottom: '0.5px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 100,
      backdropFilter: 'blur(20px)',
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          border: '1.5px solid var(--v)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--v2)', fontSize: 18,
          background: 'rgba(124,92,252,0.08)',
          transition: 'all 0.4s cubic-bezier(.34,1.56,.64,1)',
        }}>
          <GraduationCap size={20} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em' }}>Knoq-AI</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={toggleTheme}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '0.5px solid var(--border2)',
            background: 'rgba(124,92,252,0.08)',
            color: 'var(--v2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(.34,1.56,.64,1)',
          }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {!loading && user ? (
          <>
            <Link to="/app" className="btn-outline" style={{ padding: '9px 18px', fontSize: 13 }}>
              <MessageSquare size={14} /> Chat
            </Link>
            {isAdmin && (
              <Link to="/admin" className="btn-outline" style={{ padding: '9px 18px', fontSize: 13 }}>
                <LayoutDashboard size={14} /> Admin
              </Link>
            )}
            <Link to="/profile" className="btn-outline" style={{ padding: '9px 18px', fontSize: 13 }}>
              <User size={14} /> Profile
            </Link>
            <button onClick={logout} className="btn-outline" style={{ padding: '9px 18px', fontSize: 13 }}>
              <LogOut size={14} /> Sign out
            </button>
          </>
        ) : (
          <Link to="/login" className="btn-glow" style={{ padding: '9px 18px', fontSize: 13 }}>
            <LogIn size={14} /> Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
