import { Link } from "@tanstack/react-router";
import { GraduationCap, LogIn, LayoutDashboard, LogOut, MessageSquare } from "lucide-react";
import { useAuth, signOut } from "@/lib/auth";

export function Nav() {
  const { user, roles, loading } = useAuth();
  const isAdmin = roles.includes("admin");

  return (
    <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <div className="size-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
          <GraduationCap className="size-5" />
        </div>
        <span className="font-display text-xl">CampusBot</span>
      </Link>
      <div className="flex items-center gap-2 text-sm">
        {!loading && user ? (
          <>
            <Link to="/app" className="px-3 py-2 rounded-md hover:bg-accent inline-flex items-center gap-1.5">
              <MessageSquare className="size-4" /> Chat
            </Link>
            {isAdmin && (
              <Link to="/admin" className="px-3 py-2 rounded-md hover:bg-accent inline-flex items-center gap-1.5">
                <LayoutDashboard className="size-4" /> Admin
              </Link>
            )}
            <button onClick={signOut} className="px-3 py-2 rounded-md hover:bg-accent inline-flex items-center gap-1.5 text-muted-foreground">
              <LogOut className="size-4" /> Sign out
            </button>
          </>
        ) : (
          <Link to="/login" className="px-4 py-2 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5 hover:opacity-90">
            <LogIn className="size-4" /> Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
