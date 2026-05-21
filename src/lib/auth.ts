import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Role = "admin" | "student";

export interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  roles: Role[];
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ loading: true, session: null, user: null, roles: [] });

  useEffect(() => {
    let active = true;

    async function loadRoles(user: User | null) {
      if (!user) return [];
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return (data?.map((r: { role: Role }) => r.role) ?? []) as Role[];
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((s) => ({ ...s, session, user: session?.user ?? null }));
      // defer role fetch
      setTimeout(async () => {
        const roles = await loadRoles(session?.user ?? null);
        if (active) setState({ loading: false, session, user: session?.user ?? null, roles });
      }, 0);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const roles = await loadRoles(session?.user ?? null);
      if (active) setState({ loading: false, session, user: session?.user ?? null, roles });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/";
}
