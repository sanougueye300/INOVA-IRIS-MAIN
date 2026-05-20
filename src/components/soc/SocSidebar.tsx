import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import {
  LayoutDashboard,
  AlertTriangle,
  Database,
  Shield,
  Bug,
  Workflow,
  ScanSearch,
  Settings,
  ServerCog,
  Brain,
  Globe2,
  Layers,
  Fingerprint,
  Users,
  UserPlus,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Building2,
  Sliders,
  Plug,
  FileText,
  UserCog,
} from "lucide-react";
import { useSocPreferences } from "@/lib/soc-preferences";

type Item = { to: string; label: string; icon: LucideIcon; hash?: string };

const mainItems: Item[] = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/alertes", label: "Alertes", icon: AlertTriangle },
  { to: "/iocs", label: "IOC", icon: Database },
  { to: "/threat-map", label: "Threat Map", icon: Globe2 },
  { to: "/assistant", label: "Assistant IA", icon: Brain },
  { to: "/outils", label: "Outils SOC", icon: Layers, hash: "orchestrator" },
  { to: "/iris", label: "DFIR-IRIS", icon: Fingerprint },
];

const toolItems: Item[] = [
  { to: "/outils", label: "Wazuh", icon: Shield, hash: "wazuh" },
  { to: "/outils", label: "TheHive", icon: Bug, hash: "thehive" },
  { to: "/outils", label: "MISP", icon: ServerCog, hash: "misp" },
  { to: "/outils", label: "VirusTotal", icon: ScanSearch, hash: "virustotal" },
  { to: "/outils", label: "Shuffle", icon: Workflow, hash: "shuffle" },
];

export function SocSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => (s.location.hash ?? "").replace(/^#/, "") });
  const { sidebarAppearance, t } = useSocPreferences();
  const [clientsOpen, setClientsOpen] = useState(
    pathname.startsWith("/clients") || pathname === "/facturation"
  );
  const [authOpen, setAuthOpen] = useState(pathname.startsWith("/auth"));
  const [splitOpen, setSplitOpen] = useState(pathname.startsWith("/auth"));
  const [navOpen, setNavOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(
    pathname === "/admin" || pathname === "/settings" || pathname === "/integrations" || pathname === "/audit"
  );

  const isDarker = sidebarAppearance === "darker";

  const isActive = (it: Item) => {
    if (pathname !== it.to) return false;
    if (!it.hash) return true;
    if (it.hash === "orchestrator") return !hash || hash === "orchestrator";
    return hash === it.hash;
  };

  const renderItem = (it: Item) => {
    const active = isActive(it);
    return (
      <Link
        key={`${it.to}-${it.label}-${it.hash ?? ""}`}
        to={it.to}
        hash={it.hash}
        onClick={onNavigate}
        className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${active
          ? "border-l-4 border-primary bg-accent font-semibold text-accent-foreground"
          : "border-l-4 border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
      >
        <it.icon className="h-4 w-4 shrink-0" />
        <span>{t(it.label)}</span>
      </Link>
    );
  };

  const isClientSubActive = pathname.startsWith("/clients") || pathname === "/facturation";

  return (
    <aside className={`flex h-full w-64 flex-col border-r ${isDarker
      ? "bg-zinc-950 text-zinc-300 border-zinc-800"
      : "bg-background border-border"
      }`}>
      <div className="flex-1 overflow-y-auto py-4 space-y-6">

        {/* ── Module Sécurité Section ── */}
        <div className="px-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t(" Sécurité")}</p>
          <nav className="space-y-1">
            {/* ── Authentification dropdown ── */}
            <button
              onClick={() => setAuthOpen(o => !o)}
              className={`group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${pathname.startsWith("/auth")
                ? "border-l-4 border-primary bg-accent font-semibold text-accent-foreground"
                : "border-l-4 border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
            >
              <Fingerprint className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{t("Authentification")}</span>
              {authOpen
                ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
            </button>

            {authOpen && (
              <div className="ml-4 space-y-0.5 border-l pl-2" style={{ borderColor: isDarker ? "#3f3f46" : "hsl(var(--border))" }}>
                <div className="space-y-0.5">
                  <button
                    onClick={() => setSplitOpen(o => !o)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <span className="flex-1 text-left">{t("Split")}</span>
                    {splitOpen
                      ? <ChevronDown className="h-3 opacity-60" />
                      : <ChevronRight className="h-3 opacity-60" />}
                  </button>
                  {splitOpen && (
                    <div className="ml-3 space-y-0.5 border-l pl-2 border-dashed" style={{ borderColor: isDarker ? "#27272a" : "hsl(var(--border))" }}>
                      {[
                        { to: "/auth/login", label: "Sign in" },
                        { to: "/auth/signup", label: "Sign up" },
                        { to: "/auth/forgot-password", label: "Forgot password" },
                        { to: "/auth/reset-password", label: "Reset password" },
                        { to: "/auth/lock", label: "Lock screen" },
                        { to: "/auth/2fa", label: "2FA" },
                        { to: "/auth/logout", label: "Sign out" },
                      ].map((sub) => (
                        <Link
                          key={sub.to}
                          to={sub.to}
                          onClick={onNavigate}
                          className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs transition-colors ${pathname === sub.to
                            ? "bg-accent font-semibold text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            }`}
                        >
                          {t(sub.label)}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </nav>
        </div>

        {/* ── Module Administration Section ── */}
        <div className="px-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t(" Administration")}</p>
          <nav className="space-y-1">
            {/* ── Administration dropdown ── */}
            <button
              onClick={() => setAdminOpen(o => !o)}
              className={`group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${pathname === "/admin" || pathname === "/settings" || pathname === "/integrations" || pathname === "/audit"
                ? "border-l-4 border-primary bg-accent font-semibold text-accent-foreground"
                : "border-l-4 border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
            >
              <ServerCog className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{t("Administration")}</span>
              {adminOpen
                ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
            </button>

            {adminOpen && (
              <div className="ml-4 space-y-0.5 border-l pl-2" style={{ borderColor: isDarker ? "#3f3f46" : "hsl(var(--border))" }}>
                {renderItem({ to: "/admin", label: "Gestion des agents", icon: UserCog })}
                {renderItem({ to: "/admin/profiles", label: "Gestion des profils", icon: Shield })}
                {renderItem({ to: "/settings", label: "Paramètres Globaux", icon: Sliders })}
                {renderItem({ to: "/integrations", label: "Connecteurs & API", icon: Plug })}
                {renderItem({ to: "/audit", label: "Journaux d'Audit", icon: FileText })}
              </div>
            )}
          </nav>
        </div>

        {/* ── Outils Section ── */}
        <div className="px-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("Outils (détail)")}</p>
          <nav className="space-y-1">{toolItems.map(renderItem)}</nav>
        </div>

        {/* ── Module Clients Section ── */}
        <div className="px-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("Module Clients")}</p>
          <nav className="space-y-1">
            {/* ── Clients dropdown ── */}
            <button
              onClick={() => setClientsOpen(o => !o)}
              className={`group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${isClientSubActive
                ? "border-l-4 border-primary bg-accent font-semibold text-accent-foreground"
                : "border-l-4 border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{t("Clients")}</span>
              {clientsOpen
                ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
            </button>

            {clientsOpen && (
              <div className="ml-4 space-y-0.5 border-l pl-2" style={{ borderColor: isDarker ? "#3f3f46" : "hsl(var(--border))" }}>
                <Link
                  to="/clients"
                  onClick={onNavigate}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/clients"
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  {t("Liste des clients")}
                </Link>
                <Link
                  to="/clients/new"
                  onClick={onNavigate}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/clients/new"
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {t("Nouveau client")}
                </Link>
                <Link
                  to="/facturation"
                  onClick={onNavigate}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/facturation"
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  {t("Facturation")}
                </Link>
              </div>
            )}
          </nav>
        </div>

        {/* ── Navigation Section ── */}
        <div className="px-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("Général")}</p>
          <button
            onClick={() => setNavOpen(o => !o)}
            className={`group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${mainItems.some(it => isActive(it))
              ? "border-l-4 border-primary bg-accent font-semibold text-accent-foreground"
              : "border-l-4 border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
          >
            <Globe2 className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{t("Navigation")}</span>
            {navOpen
              ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
          </button>

          {navOpen && (
            <div className="ml-4 mt-1 space-y-0.5 border-l pl-2" style={{ borderColor: isDarker ? "#3f3f46" : "hsl(var(--border))" }}>
              {mainItems.map(renderItem)}
            </div>
          )}
        </div>


      </div>
      <div className={`border-t p-3 text-[10px] uppercase tracking-wider ${sidebarAppearance === "darker" ? "border-zinc-800 text-zinc-500" : "border-border text-muted-foreground"
        }`}>
        © Sonatel · Inova-Iris
      </div>
    </aside>
  );
}
