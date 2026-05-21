import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, AlertCircle } from "lucide-react";

const DOMAIN = "@paruluniversity.ac.in";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.toLowerCase().endsWith(DOMAIN)) {
      setError(`Only ${DOMAIN} email addresses can sign in. Try free mode instead.`);
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/app",
            data: { full_name: fullName || email.split("@")[0] },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/app" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "login" ? "Welcome back" : "Create your account";
  const sub = mode === "login" ? "Sign in to access the full CampusBot." : "Open to all Parul University students & staff.";

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 mb-10">
          <div className="size-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <GraduationCap className="size-5" />
          </div>
          <span className="font-display text-xl">CampusBot</span>
        </Link>

        <div className="rounded-2xl border bg-card p-8" style={{ boxShadow: "var(--shadow-elegant)" }}>
          <h1 className="text-3xl mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground mb-6">{sub}</p>

          <div className="rounded-lg bg-accent/50 border border-accent px-3 py-2 text-xs text-accent-foreground mb-6">
            🔒 Restricted to <b>{DOMAIN}</b> accounts only.
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <Field label="Full name">
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
                  placeholder="Riya Patel"
                />
              </Field>
            )}
            <Field label="University email">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
                placeholder={`yourname${DOMAIN}`}
              />
            </Field>
            <Field label="Password">
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
                placeholder="At least 8 characters"
              />
            </Field>

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 transition"
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
            {mode === "login" ? (
              <p>No account? <Link to="/signup" className="text-primary underline">Create one</Link></p>
            ) : (
              <p>Already have one? <Link to="/login" className="text-primary underline">Sign in</Link></p>
            )}
            <p>Not a Parul student? <Link to="/" className="text-primary underline">Use free chat</Link> (no login required).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
