import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Shield, Cpu, Network, CheckCircle2, Terminal } from "lucide-react";
import orangeLogo from "@/assets/orange-logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Authentification — Sonatel SOC Platform" },
      { name: "description", content: "Plateforme d'accès sécurisé au SOC intelligent Sonatel." }
    ]
  }),
  component: AuthLayout,
});

const mockLogs = [
  "WAZUH: Initializing active agent scanner...",
  "SHUFFLE: Loading automated response playbooks...",
  "THEHIVE: Checking active case management channels...",
  "MISP: Querying indicator database for updates...",
  "VIRUSTOTAL: Indexing multi-engine scanner cache...",
  "IRIS: Mounting digital forensics response volumes...",
  "SOC: Establishing secure telemetry pipeline...",
  "WAZUH: Agent 002 (ad-domain-controller) is active.",
  "SHUFFLE: Workflow triggered [Auto-Containment-API]",
  "THEHIVE: Incident #892 escalated to Critical",
  "MISP: Synchronized 42 new Indicators of Compromise (IoC)",
  "VIRUSTOTAL: File hash analyzed - Clean (0/74)",
  "IRIS: Case #412 created - Analysis of suspected phishing",
  "SOC: All security nodes operational."
];

function AuthLayout() {
  const [logs, setLogs] = useState<string[]>([]);
  const consoleContainerRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [logoSrc, setLogoSrc] = useState(orangeLogo);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("soc-admin-settings");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.logoBase64) {
            setLogoSrc(parsed.logoBase64);
          }
        } catch (e) {}
      }
    }
  }, []);

  // Stream mock logs
  useEffect(() => {
    setLogs([mockLogs[0], mockLogs[1], mockLogs[2]]);
    let index = 3;
    const interval = setInterval(() => {
      setLogs((prev) => {
        const nextLogs = [...prev, mockLogs[index % mockLogs.length]];
        if (nextLogs.length > 15) {
          nextLogs.shift();
        }
        return nextLogs;
      });
      index++;
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto scroll logs internally without scrolling the parent window
  useEffect(() => {
    const container = consoleContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground lg:flex-row overflow-hidden">
      {/* LEFT PANEL: Next-Gen Cyber Operations Visuals */}
      <div className="relative hidden w-full overflow-hidden bg-zinc-950 px-8 py-12 lg:flex lg:w-1/2 flex-col justify-between border-r border-zinc-800">
        {/* Animated Cyber Grid Backdrop */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-zinc-500" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {/* Glowing moving nodes */}
            <circle cx="200" cy="150" r="3" className="fill-primary animate-pulse" />
            <circle cx="500" cy="350" r="3" className="fill-primary animate-pulse" style={{ animationDelay: "1s" }} />
            <circle cx="100" cy="500" r="3" className="fill-primary animate-pulse" style={{ animationDelay: "2.3s" }} />
          </svg>
        </div>

        {/* Diagonal Light Beam */}
        <div className="absolute -left-1/4 -top-1/4 h-[150%] w-[150%] rotate-12 bg-radial-gradient from-primary/5 via-transparent to-transparent pointer-events-none" />

        {/* Top Section: Branding & Operations Status */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-[var(--glow-primary)]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">INOVA-IRIS</h1>
              <p className="text-[10px] uppercase tracking-widest text-primary font-semibold mt-0.5">Sonatel SOC platform</p>
            </div>
          </div>

          {/* Operational Microservices */}
          <div className="mt-12 grid grid-cols-2 gap-3 max-w-md">
            {[
              { name: "Wazuh SIEM", status: "Operational" },
              { name: "Shuffle SOAR", status: "Operational" },
              { name: "TheHive Core", status: "Active" },
              { name: "MISP Threat Intel", status: "Synced" }
            ].map((srv) => (
              <div key={srv.name} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 backdrop-blur-sm">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-300">{srv.name}</div>
                  <div className="text-[9px] uppercase tracking-wider text-zinc-500">{srv.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Section: Cybersecurity Logs Console */}
        <div className="relative z-10 flex-1 my-10 flex flex-col justify-end max-w-xl">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 font-mono text-[11px] text-zinc-400 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 mb-3">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-300">Live Telemetry Pipeline Console</span>
            </div>
            <div ref={consoleContainerRef} className="h-44 overflow-y-auto space-y-1.5 scrollbar-none pr-1">
              {logs.map((log, idx) => {
                const parts = log.split(": ");
                const header = parts[0];
                const content = parts.slice(1).join(": ");
                return (
                  <div key={idx} className="flex gap-2">
                    <span className="text-primary font-semibold">[{new Date().toLocaleTimeString()}]</span>
                    <span>
                      <span className="text-zinc-300 font-medium">{header}:</span> {content}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Section: Footer Credits */}
        <div className="relative z-10 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-zinc-600 animate-spin" style={{ animationDuration: "12s" }} />
            <span>Node Core: Operational</span>
          </div>
          <div>© Sonatel · Inova-Iris SOC</div>
        </div>
      </div>

      {/* RIGHT PANEL: Auth Pages Outlet */}
      <div className="flex flex-1 flex-col justify-start lg:justify-center overflow-y-auto bg-background px-6 py-12 md:px-12 lg:w-1/2 lg:px-20 relative">
        {/* Soft Background Radial Glow for Modern Glassmorphic Look */}
        <div className="absolute right-10 top-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute left-10 bottom-1/4 h-72 w-72 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <div className="mx-auto w-full max-w-md relative z-10 flex flex-col my-auto">
          {/* Unified Orange brand logo header on all auth subpages */}
          <div className="flex justify-center mb-8 select-none shrink-0">
            <div className="inline-flex items-center justify-center gap-4 py-3.5 px-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300">
              <img
                src={logoSrc}
                alt="Sonatel Logo"
                className="h-10 sm:h-12 w-auto object-contain select-none"
              />
              <div className="h-8 w-px bg-zinc-300 dark:bg-zinc-800" />
              <div className="text-left font-mono">
                <div className="text-[10px] font-black tracking-widest text-primary uppercase">INOVA-IRIS</div>
                <div className="text-[9px] font-semibold text-muted-foreground tracking-tight">Sonatel SOC platform</div>
              </div>
            </div>
          </div>

          {/* Outlet for Nested Pages */}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
