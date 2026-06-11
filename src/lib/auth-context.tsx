import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "analyste" | "manager" | "client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  isStaff: boolean;
  organization: string | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [organization, setOrganization] = useState<string | null>(null);

  const loadProfile = async (uid: string) => {
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("organization").eq("id", uid).maybeSingle(),
    ]);
    setRoles((r ?? []).map((x: { role: AppRole }) => x.role));
    setOrganization(p?.organization ?? null);
  };

  useEffect(() => {
    const mockUserStr = localStorage.getItem("inova_mock_user");
    if (mockUserStr) {
      try {
        const mockUser = JSON.parse(mockUserStr);
        setUser(mockUser);
        setSession({ user: mockUser } as any);
        setRoles(["admin", "client"]);
        setOrganization(mockUser.organization || "Client Souscrit");
        setLoading(false);
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
          if (!s) {
            localStorage.removeItem("inova_mock_user");
            setUser(null);
            setSession(null);
            setRoles([]);
            setOrganization(null);
          }
        });
        return () => subscription.unsubscribe();
      } catch (e) {
        // ignore
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => { loadProfile(s.user.id); }, 0);
      } else {
        setRoles([]);
        setOrganization(null);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => { 
    localStorage.removeItem("inova_mock_user");
    await supabase.auth.signOut(); 
    setUser(null);
    setSession(null);
    setRoles([]);
    setOrganization(null);
  };
  const refresh = async () => { if (user && user.id !== "mock-uid-123") await loadProfile(user.id); };

  const value: AuthContextValue = {
    user, session, loading, roles, organization, signOut, refresh,
    isAdmin: roles.includes("admin"),
    isStaff: roles.some((r) => r === "admin" || r === "analyste" || r === "manager"),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}