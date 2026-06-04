import { useAuth } from "@/lib/auth-context";
import { isPending2FA } from "@/lib/auth-security";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function RequireAuth({ children, requireAdmin }: { children: ReactNode; requireAdmin?: boolean }) {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth/login", replace: true });
      return;
    }
    if (!loading && user && isPending2FA() && !pathname.startsWith("/auth/2fa")) {
      navigate({ to: "/auth/2fa", replace: true });
    }
  }, [user, loading, navigate, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user) return null;

  if (isPending2FA() && !pathname.startsWith("/auth/2fa")) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
        <h1 className="text-2xl font-black text-red-500 mb-2">Accès Refusé</h1>
        <p className="text-sm text-zinc-400 font-medium">
          Vous devez disposer d'un privilège d'administrateur pour accéder à cette console de cyberdéfense.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
