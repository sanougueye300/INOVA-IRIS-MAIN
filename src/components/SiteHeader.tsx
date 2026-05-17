import { Link, useNavigate } from "@tanstack/react-router";
import { Shield, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

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
  const links = user ? appLinks : publicLinks;
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-hero)] shadow-[var(--glow-primary)]">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
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