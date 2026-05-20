import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import orangeLogo from "@/assets/orange-logo.png";

const publicLinks = [
  { to: "/", label: "Accueil" },
  { to: "/architecture", label: "Architecture" },
  { to: "/outils", label: "Outils" },
  { to: "/workflow", label: "Workflow" },
  { to: "/deploiement", label: "Déploiement" },
] as const;

const appLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/alertes", label: "Alertes" },
  { to: "/iocs", label: "IOC" },
] as const;

export function SiteHeader() {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuth = pathname === "/login" || pathname === "/auth" || pathname.startsWith("/auth/");
  
  if (isAuth) {
    return (
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <Link to={user ? "/dashboard" : "/"} className="flex items-center shrink-0">
              <img
                src={orangeLogo}
                alt="Orange Logo"
                className="h-9 w-auto object-contain select-none"
              />
            </Link>
            <div className="hidden md:flex h-5 w-px bg-border" />
            <div className="hidden md:flex flex-col">
              <span className="text-xs font-bold tracking-tight text-foreground uppercase">INOVA-IRIS</span>
              <span className="text-[10px] text-muted-foreground leading-none">Sonatel SOC platform</span>
            </div>
          </div>

          {/* Center: System Status */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[11px] font-medium text-emerald-500 font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>SYSTEM STATUS: OPERATIONAL</span>
          </div>

          {/* Right: Quick actions / Navigation */}
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 border border-border/40 hover:border-primary/20 bg-secondary/30 hover:bg-primary/5 px-3 py-1.5 rounded-lg"
            >
              <span>← Retour à l'accueil</span>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  const links = user ? appLinks : publicLinks;
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <img
            src={orangeLogo}
            alt="Orange Logo"
            className="h-9 w-auto object-contain select-none"
          />
          <span className="font-semibold tracking-tight">SOC Platform</span>
        </Link>
        <nav className="hidden gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "rounded-md px-3 py-2 text-sm bg-secondary text-foreground" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
          {user && isAdmin && (
            <Link to="/admin" className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" activeProps={{ className: "rounded-md px-3 py-2 text-sm bg-secondary text-foreground" }}>
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/login" }); }}>
              <LogOut className="mr-2 h-4 w-4" /> Déconnexion
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/login">Connexion</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}