import { useAuth } from "@/lib/auth-context";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { ShieldOff } from "lucide-react";
import { InovaLoader } from "@/components/InovaLoader";
import { isPending2FA, is2FAVerified } from "@/lib/auth-security";

/** Pages that a 'client' role is allowed to access inside the admin area */
const CLIENT_ALLOWED_PATHS = [
  "/admin/new",
  "/admin",
  "/settings",
  "/audit",
  "/alertes",
  "/clients/inventory",
];

export function RequireAuth({ children, requireAdmin }: { children: ReactNode; requireAdmin?: boolean }) {
  const { user, loading, isAdmin, roles } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Ref pour éviter les redirections multiples dans le même render cycle
  const redirectingRef = useRef(false);

  const isClientOnly =
    roles.includes("client") &&
    !roles.includes("admin") &&
    !roles.includes("analyste") &&
    !roles.includes("manager");

  // Client is allowed on a specific subset of admin pages
  const clientAllowed = isClientOnly && CLIENT_ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => {
    if (redirectingRef.current) return;
    if (!loading && !user) {
      redirectingRef.current = true;
      navigate({ to: "/auth/login", replace: true });
    } else if (user && pathname !== "/auth/2fa") {
      if (isPending2FA()) {
        redirectingRef.current = true;
        navigate({ to: "/auth/2fa", replace: true });
      } else if (!is2FAVerified()) {
        redirectingRef.current = true;
        navigate({ to: "/auth/login", replace: true });
      }
    }
    // Reset le flag de redirection quand l'état change
    return () => { redirectingRef.current = false; };
  }, [user, loading, navigate, pathname]);

  if (loading) {
    return <InovaLoader message="Chargement de l'environnement SOC..." />;
  }

  if (!user) return null;

  if (requireAdmin && !isAdmin && !clientAllowed) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-white p-6 text-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
          <ShieldOff className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-red-500">Accès Refusé</h1>
        <p className="text-sm text-zinc-400 font-medium max-w-xs">
          {isClientOnly
            ? "Cette section n'est pas disponible dans votre espace client. Vous avez accès à : Nouveau RH, Paramètres, Journaux d'audit."
            : "Vous devez disposer d'un privilège d'administrateur pour accéder à cette console de cyberdéfense."}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
