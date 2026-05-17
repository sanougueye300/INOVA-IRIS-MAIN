import { useEffect, useRef, useState } from "react";
import { Bell, Search, Menu, Sun, Moon, LayoutGrid, Brain, Globe2, Command, Printer, FlaskConical, User, LayoutDashboard, Activity, Settings, HelpCircle, UserPlus, LogOut, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { SonatelLogo } from "./SonatelLogo";
import { SocSidebar } from "./SocSidebar";
import { Link } from "@tanstack/react-router";
import { useSocPreferences } from "@/lib/soc-preferences";
import { useSocSimulation } from "@/lib/soc-simulation";
import { SocTimeRangeTabs } from "./SocTimeRangeTabs";
import { toast } from "sonner";
import sanouGueyeAvatar from "@/assets/sanou-gueye.png";

export function SocTopbar() {
  const [openMobile, setOpenMobile] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [recent, setRecent] = useState<{ id: string; title: string; severity: number }[]>([]);
  const prevCriticalSigRef = useRef<string | null>(null);
  const { theme, toggleTheme, navbarAppearance, language, setLanguage, t } = useSocPreferences();
  const { injectRedTeam } = useSocSimulation();

  useEffect(() => {
    const load = async () => {
      const { count } = await supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("status", "new");
      setNewCount(count ?? 0);
      const { data } = await supabase
        .from("alerts")
        .select("id,title,severity")
        .order("created_at", { ascending: false })
        .limit(8);
      setRecent(data ?? []);

      const criticalSig = (data ?? [])
        .filter((a) => a.severity >= 12)
        .map((a) => a.id)
        .sort()
        .join(",");
      if (prevCriticalSigRef.current !== null && criticalSig && criticalSig !== prevCriticalSigRef.current) {
        toast.error("Nouvelle alerte critique — vérifier le filtre sévérité", { duration: 10_000 });
      }
      prevCriticalSigRef.current = criticalSig;
    };
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const onRedTeam = () => {
    injectRedTeam();
    toast.warning("Simulation RedTeam", { description: "Événements fictifs injectés pour la démo (session courante)." });
  };

  return (
    <header className={`no-print sticky top-0 z-40 flex h-16 flex-wrap items-center gap-2 border-b px-3 py-1 sm:h-16 sm:flex-nowrap sm:gap-3 sm:px-4 ${
      navbarAppearance === "solid" ? "bg-background border-border" : 
      navbarAppearance === "darker" ? "bg-zinc-950 border-zinc-800 text-zinc-50" : 
      "bg-background/80 backdrop-blur-md border-border"
    }`}>
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SocSidebar onNavigate={() => setOpenMobile(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        <SonatelLogo />
        <div className="hidden sm:block">
          <div className="text-sm font-bold leading-tight">Sonatel SOC</div>
          <div className={`text-[10px] uppercase tracking-wider ${
            navbarAppearance === "darker" ? "text-zinc-400/80" : "text-muted-foreground"
          }`}>
            Inova-Iris
          </div>
        </div>
      </div>

      <div className="order-last flex w-full justify-center sm:order-none sm:mx-auto sm:max-w-xl sm:flex-1 md:block md:w-auto">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("soc:open-command"))}
          className="group flex w-full max-w-md items-center gap-3 rounded-full border border-border bg-background px-4 py-2 text-left text-sm text-muted-foreground shadow-sm transition-all hover:shadow-md sm:px-5 sm:py-2.5"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{t("Recherche globale (alertes, IOC, pages)…")}</span>
          <kbd className="hidden shrink-0 items-center gap-1 rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
            <Command className="h-3 w-3" /> K
          </kbd>
        </button>
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-1 sm:gap-2">
        <div className="hidden lg:block">
          <SocTimeRangeTabs />
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Basculer thème clair / sombre"
          onClick={toggleTheme}
          className="rounded-full bg-primary/10 text-primary hover:bg-primary/20"
        >
          {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`hidden sm:inline-flex relative rounded-full transition-all ${
                navbarAppearance === "darker" 
                  ? "text-white hover:bg-white/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
              }`} 
              title="Choisir la langue"
            >
              <Languages className="h-5 w-5" />
              <span className={`absolute -bottom-1 -right-1 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-95 border ${
                navbarAppearance === "darker"
                  ? "bg-white/15 text-white border-white/20 shadow-sm"
                  : "bg-primary/10 text-primary border-background shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
              }`}>
                {language}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-1.5 rounded-2xl shadow-[0_15px_50px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_50px_-15px_rgba(0,0,0,0.5)] border border-border/80 bg-popover/95 backdrop-blur-md">
            <div className="px-2.5 py-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/30 mb-1">
              Langue / Language
            </div>
            <div className="flex flex-col gap-0.5">
              {[
                { code: "fr", label: "Français", flag: "🇫🇷" },
                { code: "en", label: "English", flag: "🇬🇧" },
                { code: "wo", label: "Wolof", flag: "🇸🇳" },
                { code: "ar", label: "العربية", flag: "🇸🇦" },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code as any)}
                  className={`flex items-center justify-between w-full rounded-xl px-2.5 py-2 text-xs font-semibold transition-all text-left cursor-pointer ${
                    language === lang.code 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-accent hover:text-accent-foreground text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">{lang.flag}</span>
                    <span>{lang.label}</span>
                  </span>
                  {language === lang.code && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" className="hidden sm:inline-flex" title="Injecter une simulation d'attaque" onClick={onRedTeam}>
          <FlaskConical className="h-5 w-5 text-destructive" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {newCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {newCount > 99 ? "99+" : newCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b border-border p-3 text-sm font-semibold">Notifications récentes</div>
            <div className="max-h-80 overflow-y-auto">
              {recent.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">Aucune alerte récente</p>
              )}
              {recent.map((a) => (
                <div key={a.id} className="flex items-start gap-2 border-b border-border/60 p-3 last:border-b-0">
                  <span
                    className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${a.severity >= 12 ? "bg-destructive" : "bg-primary"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground">Sévérité {a.severity}</p>
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Modules">
              <LayoutGrid className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <div className="grid grid-cols-3 gap-1">
              {[
                { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
                { to: "/alertes", label: "Alertes", icon: Bell },
                { to: "/iocs", label: "IOC", icon: Globe2 },
                { to: "/assistant", label: "IA", icon: Brain },
                { to: "/threat-map", label: "Map", icon: Globe2 },
                { to: "/iris", label: "IRIS", icon: LayoutGrid },
                { to: "/outils", hash: "orchestrator", label: "SOC", icon: LayoutGrid },
                { to: "/admin", label: "Admin", icon: LayoutGrid },
              ].map((m) => (
                <Link key={m.label} to={m.to} hash={m.hash} className="flex flex-col items-center gap-1 rounded-lg p-3 text-center text-xs hover:bg-secondary">
                  <m.icon className="h-5 w-5 text-primary" />
                  <span>{m.label}</span>
                </Link>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 ring-2 ring-primary/20 hover:ring-primary/40 hover:scale-105 transition-all">
              <Avatar className="h-full w-full">
                <AvatarImage src={sanouGueyeAvatar} className="object-cover" />
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">SG</AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 rounded-2xl shadow-[0_15px_50px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_50px_-15px_rgba(0,0,0,0.5)] border border-border/80 bg-popover/95 backdrop-blur-md text-popover-foreground overflow-hidden">
            {/* Header / Profile info */}
            <div className="flex flex-col items-center p-6 text-center border-b border-border/40 bg-gradient-to-b from-primary/5 via-primary/[0.01] to-transparent">
              <div className="relative mb-3">
                <Avatar className="h-16 w-16 ring-4 ring-primary/10 shadow-md">
                  <AvatarImage src={sanouGueyeAvatar} className="object-cover" />
                  <AvatarFallback className="bg-primary text-xl font-semibold text-primary-foreground">SG</AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0.5 right-0.5 block h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
              <h3 className="font-bold text-base tracking-tight text-foreground">Sanou Gueye</h3>
              <p className="text-xs font-medium text-muted-foreground/80 mb-4">{t("Administrateur SOC")}</p>
              
              <div className="w-full relative">
                <input 
                  type="text" 
                  placeholder={t("Mettez à jour votre statut")} 
                  className="w-full text-xs rounded-xl border border-border/80 bg-muted/30 hover:bg-muted/50 focus:bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60 shadow-inner"
                />
              </div>
            </div>
            
            {/* Menu Items (Group 1 - Personal) */}
            <div className="p-1.5 flex flex-col gap-0.5">
              <Link to="/admin" className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-all hover:translate-x-0.5">
                <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <User className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <span>{t("Profil")}</span>
              </Link>
              <Link to="/dashboard" className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-all hover:translate-x-0.5">
                <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <LayoutDashboard className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <span>{t("Tableau de bord")}</span>
              </Link>
              <button className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-all hover:translate-x-0.5 text-left w-full cursor-pointer">
                <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <Activity className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <span>{t("Posts & Activité")}</span>
              </button>
            </div>

            <div className="h-px bg-border/40 mx-3" />
            
            {/* Menu Items (Group 2 - Settings/Help) */}
            <div className="p-1.5 flex flex-col gap-0.5">
              <button className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-all hover:translate-x-0.5 text-left w-full cursor-pointer">
                <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <Settings className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <span>{t("Paramètres et confidentialité")}</span>
              </button>
              <button className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-all hover:translate-x-0.5 text-left w-full cursor-pointer">
                <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <HelpCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <span>{t("Centre d'aide")}</span>
              </button>
            </div>

            <div className="h-px bg-border/40 mx-3" />
            
            {/* Action Items (Group 3 - Extra Actions) */}
            <div className="p-1.5 flex flex-col gap-0.5">
              <button className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-all hover:translate-x-0.5 text-left cursor-pointer">
                <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <UserPlus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <span>{t("Ajouter un autre compte")}</span>
              </button>
            </div>
            
            {/* Logout/Signout Button */}
            <div className="p-3 bg-muted/30 border-t border-border/40">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-background border border-border px-3 py-2.5 text-sm font-semibold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-muted-foreground transition-all shadow-sm cursor-pointer">
                <LogOut className="h-4 w-4" />
                <span>{t("Se déconnecter")}</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
