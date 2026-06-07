import { useEffect, useRef, useState, useCallback } from "react";
import { Shield, Globe2, Activity, Radio, ArrowUpRight, ArrowDownLeft, AlertTriangle, CheckCircle2, XCircle, Wifi } from "lucide-react";
import { mockWazuhAgents, mockConnectors } from "@/lib/soc-mock";

/* ═══════════════════════════════════════════════════════
   MOCK CLIENT MACHINE DATA  (remplacer par API Wazuh/SIEM)
═══════════════════════════════════════════════════════ */
const CLIENT_MACHINES = [
  { id: "001", name: "dmz-01",        ip: "10.0.1.10",    org: "Sonatel",        lat: 14.72, lon: -17.47, status: "active",       severity: "high",     inMbps: 12.4, outMbps: 3.2,  threats: 4,  rule: "SSH Bruteforce" },
  { id: "002", name: "fin-12",        ip: "10.0.2.12",    org: "Sonatel",        lat: 14.68, lon: -17.43, status: "active",       severity: "critical", inMbps: 45.1, outMbps: 22.8, threats: 9,  rule: "PowerShell encodé" },
  { id: "003", name: "dns-02",        ip: "10.0.3.22",    org: "Expresso",       lat: 14.74, lon: -17.51, status: "disconnected", severity: "medium",   inMbps: 0,    outMbps: 0,    threats: 2,  rule: "DNS Tunneling" },
  { id: "004", name: "hr-03",         ip: "10.0.4.55",    org: "Orange Sénégal", lat: 14.66, lon: -17.40, status: "active",       severity: "low",      inMbps: 5.2,  outMbps: 1.4,  threats: 0,  rule: "—" },
  { id: "005", name: "web-prod-01",   ip: "196.207.45.2", org: "CBAO",           lat: 14.76, lon: -17.45, status: "active",       severity: "high",     inMbps: 89.3, outMbps: 62.7, threats: 6,  rule: "Web Shell Upload" },
  { id: "006", name: "mail-gateway",  ip: "41.82.120.15", org: "Sonatel",        lat: 14.70, lon: -17.49, status: "active",       severity: "medium",   inMbps: 22.7, outMbps: 18.1, threats: 3,  rule: "Phishing Relay" },
];

const EXTERNAL_THREATS = [
  { name: "Moscou",    lat: 55.75, lon: 37.62, color: "#ef4444" },
  { name: "Pékin",     lat: 39.90, lon: 116.4, color: "#f97316" },
  { name: "Téhéran",   lat: 35.70, lon: 51.40, color: "#8b5cf6" },
  { name: "Lagos",     lat:  6.50, lon:  3.40, color: "#f59e0b" },
  { name: "São Paulo", lat: -23.5, lon: -46.6, color: "#06b6d4" },
];

const ATTACK_TYPES = [
  { name: "Ransomware", color: "#ef4444" },
  { name: "DDoS",       color: "#f97316" },
  { name: "Phishing",   color: "#8b5cf6" },
  { name: "APT",        color: "#f59e0b" },
  { name: "0-Day",      color: "#06b6d4" },
];

const LAND: [number, number][] = [
  [51,10],[48,2],[52,-0.1],[54,-4],[60,11],[57,24],[45,14],[38,23],[40,22],[43,13],[46,14],[50,14],[47,8],[44,26],[42,12],
  [38,-77],[44,-79],[48,-123],[37,-122],[34,-118],[41,-87],[39,-76],[45,-93],[51,-104],[50,-114],[20,-100],[19,-99],
  [-15,-47],[-23,-43],[-3,-60],[-16,-68],[-35,-58],[4,-74],[-10,-75],[-22,-50],
  [35,10],[31,31],[14,-17],[6,3],[5,-4],[12,-8],[-26,28],[-15,32],[5,38],[4,9],[15,38],[16,0],[0,18],[-4,22],[10,13],[20,17],[33,36],
  [39.9,116.4],[55.75,37.6],[35.7,51.4],[25,80],[35,137],[37,126],[31,121],[13,100],[1,103],[23,114],[28,77],[60,90],[55,83],[50,73],
  [-33,151],[-27,153],[-35,174],[-37,144],
];

function project(lat: number, lon: number, W: number, H: number) {
  return { x: ((lon + 180) / 360) * W, y: ((90 - lat) / 180) * H };
}

interface Arc {
  id: number; fx: number; fy: number; tx: number; ty: number;
  mx: number; my: number; color: string; progress: number; speed: number;
  blocked: boolean; type: string; machineId: string;
}

interface FlowEvent {
  id: number; machineId: string; machineName: string; machineIp: string;
  type: string; color: string; blocked: boolean; ts: Date; severity: string;
}

const SEV_COLOR: Record<string, { dot: string; badge: string; text: string }> = {
  critical: { dot: "bg-red-500",     badge: "bg-red-500/15 border-red-500/30 text-red-500",     text: "text-red-500" },
  high:     { dot: "bg-orange-500",  badge: "bg-orange-500/15 border-orange-500/30 text-orange-500",  text: "text-orange-500" },
  medium:   { dot: "bg-amber-500",   badge: "bg-amber-500/15 border-amber-500/30 text-amber-500",   text: "text-amber-500" },
  low:      { dot: "bg-emerald-500", badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-500", text: "text-emerald-500" },
  disconnected: { dot: "bg-zinc-500", badge: "bg-zinc-500/15 border-zinc-500/30 text-zinc-500", text: "text-zinc-500" },
};

let arcId = 0;

/* ═══════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════ */
export function SocThreatIntelBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arcsRef   = useRef<Arc[]>([]);
  const frameRef  = useRef<number>(0);
  const [stats, setStats] = useState({ total: 0, blocked: 0 });
  const [log, setLog]     = useState<FlowEvent[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Detect dark mode from html element
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const spawnArc = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    // Pick a random client machine as target
    const machine = CLIENT_MACHINES[Math.floor(Math.random() * CLIENT_MACHINES.length)];
    if (machine.status === "disconnected") return;

    const ext = EXTERNAL_THREATS[Math.floor(Math.random() * EXTERNAL_THREATS.length)];
    const atk = ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)];
    const blocked = machine.severity === "low" || Math.random() > 0.35;

    const { x: fx, y: fy } = project(ext.lat, ext.lon, W, H);
    const { x: tx, y: ty } = project(machine.lat, machine.lon, W, H);
    const mx = (fx + tx) / 2;
    const my = (fy + ty) / 2 - Math.hypot(tx - fx, ty - fy) * 0.38;

    arcId++;
    arcsRef.current.push({ id: arcId, fx, fy, tx, ty, mx, my, color: ext.color, progress: 0, speed: 0.004 + Math.random() * 0.005, blocked, type: atk.name, machineId: machine.id });
    setStats((p) => ({ total: p.total + 1, blocked: blocked ? p.blocked + 1 : p.blocked }));
    setLog((p) => [{ id: arcId, machineId: machine.id, machineName: machine.name, machineIp: machine.ip, type: atk.name, color: ext.color, blocked, ts: new Date(), severity: machine.severity }, ...p.slice(0, 9)]);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);
    const interval = setInterval(spawnArc, 1800);

    const draw = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      // Background adapts to dark/light
      const dark = document.documentElement.classList.contains("dark");
      ctx.fillStyle = dark ? "#0f1117" : "#f8fafc";
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = dark ? "rgba(255,255,255,0.05)" : "rgba(100,116,139,0.15)";
      ctx.lineWidth = 0.5;
      for (let lon = -180; lon <= 180; lon += 30) {
        const x = ((lon + 180) / 360) * W;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let lat = -90; lat <= 90; lat += 30) {
        const y = ((90 - lat) / 180) * H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Land dots
      ctx.fillStyle = dark ? "rgba(100,116,139,0.3)" : "rgba(100,116,139,0.22)";
      for (const [lat, lon] of LAND) {
        const { x, y } = project(lat, lon, W, H);
        ctx.beginPath(); ctx.arc(x, y, 2.8, 0, Math.PI * 2); ctx.fill();
      }

      // Arcs
      arcsRef.current = arcsRef.current.filter((a) => a.progress <= 1);
      for (const arc of arcsRef.current) {
        arc.progress += arc.speed;
        const t = Math.min(arc.progress, 1);

        // Trail
        ctx.beginPath();
        ctx.moveTo(arc.fx, arc.fy);
        ctx.quadraticCurveTo(arc.mx, arc.my, arc.tx, arc.ty);
        ctx.strokeStyle = arc.color + "18";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Animated segment
        const steps = 50;
        ctx.beginPath();
        for (let i = 0; i <= steps * t; i++) {
          const s = i / steps;
          const px = (1-s)**2 * arc.fx + 2*(1-s)*s * arc.mx + s**2 * arc.tx;
          const py = (1-s)**2 * arc.fy + 2*(1-s)*s * arc.my + s**2 * arc.ty;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        const g = ctx.createLinearGradient(arc.fx, arc.fy, arc.tx, arc.ty);
        g.addColorStop(0, arc.color + "00");
        g.addColorStop(1, arc.color + "ee");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Head particle
        if (t < 1) {
          const s = t;
          const px = (1-s)**2 * arc.fx + 2*(1-s)*s * arc.mx + s**2 * arc.tx;
          const py = (1-s)**2 * arc.fy + 2*(1-s)*s * arc.my + s**2 * arc.ty;
          const glow = ctx.createRadialGradient(px, py, 0, px, py, 9);
          glow.addColorStop(0, arc.color + "77");
          glow.addColorStop(1, arc.color + "00");
          ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2);
          ctx.fillStyle = glow; ctx.fill();
          ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = arc.color; ctx.fill();
        }
      }

      // External threat nodes
      for (const ext of EXTERNAL_THREATS) {
        const { x, y } = project(ext.lat, ext.lon, W, H);
        const pulse = Math.sin(Date.now() / 600 + ext.lat) * 0.5 + 0.5;
        ctx.beginPath(); ctx.arc(x, y, 7 + pulse * 4, 0, Math.PI * 2);
        ctx.strokeStyle = ext.color + "30"; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = ext.color; ctx.shadowColor = ext.color; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      }

      // Client machine nodes (in Dakar area)
      for (const m of CLIENT_MACHINES) {
        const { x, y } = project(m.lat, m.lon, W, H);
        const isSelected = m.id === selectedMachine;
        const sevMap: Record<string,string> = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#22c55e", disconnected: "#71717a" };
        const color = m.status === "disconnected" ? "#71717a" : sevMap[m.severity];
        const pulse = Math.sin(Date.now() / 500 + parseFloat(m.id)) * 0.5 + 0.5;
        const r = isSelected ? 9 : 6;

        if (m.status === "active" && m.severity !== "low") {
          ctx.beginPath(); ctx.arc(x, y, r + 8 + pulse * 6, 0, Math.PI * 2);
          ctx.strokeStyle = color + "25"; ctx.lineWidth = 1.5; ctx.stroke();
        }
        if (isSelected) {
          ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2);
          ctx.strokeStyle = "#2563eb77"; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = isSelected ? 20 : 12; ctx.fill(); ctx.shadowBlur = 0;

        // Label
        ctx.font = `bold ${isSelected ? "10px" : "9px"} 'Inter', monospace`;
        ctx.fillStyle = dark ? "#e2e8f0" : "#1e293b";
        ctx.fillText(m.name, x + r + 3, y + 3);
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      clearInterval(interval);
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [spawnArc, selectedMachine]);

  const blockRate = stats.total > 0 ? Math.round((stats.blocked / stats.total) * 100) : 0;
  const selMachine = CLIENT_MACHINES.find((m) => m.id === selectedMachine);
  const filteredLog = selectedMachine ? log.filter((l) => l.machineId === selectedMachine) : log;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Globe2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-black text-foreground">Threat Intelligence Live — Machines Clients</h2>
            <p className="text-[10px] text-muted-foreground">Flux temps réel · IPs · Criticité · SOC Sonatel Group</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="text-[10px] font-black text-red-500">{stats.total} attaques</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1">
            <Shield className="h-3 w-3 text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-500">{stats.blocked} bloquées ({blockRate}%)</span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col xl:flex-row">

        {/* Map */}
        <div className="relative min-h-[360px] flex-1">
          <canvas ref={canvasRef} className="h-full w-full" style={{ display: "block", minHeight: 360 }} />

          {/* Threat sources legend */}
          <div className="absolute bottom-4 left-4 rounded-xl border border-border bg-card/90 p-3 backdrop-blur-sm shadow-sm">
            <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Sources hostiles</p>
            {EXTERNAL_THREATS.map((e) => (
              <div key={e.name} className="flex items-center gap-1.5 mb-0.5">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: e.color }} />
                <span className="text-[9px] font-mono text-muted-foreground">{e.name}</span>
              </div>
            ))}
          </div>

          {/* Severity legend */}
          <div className="absolute bottom-4 right-4 rounded-xl border border-border bg-card/90 p-3 backdrop-blur-sm shadow-sm">
            <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Criticité machines</p>
            {[["critical","#ef4444","Critique"],["high","#f97316","Élevée"],["medium","#f59e0b","Moyenne"],["low","#22c55e","Faible"]].map(([,c,l]) => (
              <div key={l} className="flex items-center gap-1.5 mb-0.5">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: c }} />
                <span className="text-[9px] font-mono text-muted-foreground">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex w-full flex-col border-t border-border xl:w-72 xl:border-l xl:border-t-0">

          {/* Machine list */}
          <div className="border-b border-border px-4 py-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Machines surveillées ({CLIENT_MACHINES.length})
            </p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {CLIENT_MACHINES.map((m) => {
                const sev = m.status === "disconnected" ? "disconnected" : m.severity;
                const sc = SEV_COLOR[sev];
                const isActive = selectedMachine === m.id;
                return (
                  <button
                    key={m.id}
                    id={`machine-btn-${m.id}`}
                    onClick={() => setSelectedMachine(isActive ? null : m.id)}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all duration-200 hover:border-primary/30 hover:bg-accent ${
                      isActive ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`relative flex h-2.5 w-2.5 flex-shrink-0`}>
                          {m.status === "active" && m.severity !== "low" && (
                            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${sc.dot} opacity-50`} />
                          )}
                          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${sc.dot}`} />
                        </span>
                        <span className="text-[11px] font-bold text-foreground truncate">{m.name}</span>
                      </div>
                      <span className={`text-[9px] font-black uppercase ${sc.text} ml-1`}>
                        {sev === "disconnected" ? "OFF" : sev.slice(0,4).toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="font-mono text-[9px] text-muted-foreground">{m.ip}</span>
                      <span className="text-[9px] text-muted-foreground">{m.org}</span>
                    </div>
                    {m.status === "active" && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1">
                          <ArrowDownLeft className="h-2.5 w-2.5 text-blue-500 flex-shrink-0" />
                          <div className="flex-1 h-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, (m.inMbps / 100) * 100)}%` }} />
                          </div>
                          <span className="text-[8px] font-mono text-muted-foreground w-8 text-right">{m.inMbps}M</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ArrowUpRight className="h-2.5 w-2.5 text-violet-500 flex-shrink-0" />
                          <div className="flex-1 h-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, (m.outMbps / 100) * 100)}%` }} />
                          </div>
                          <span className="text-[8px] font-mono text-muted-foreground w-8 text-right">{m.outMbps}M</span>
                        </div>
                      </div>
                    )}
                    {m.threats > 0 && (
                      <div className={`mt-1.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[8px] font-black ${sc.badge}`}>
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {m.threats} menace{m.threats > 1 ? "s" : ""} · {m.rule}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected machine detail */}
          {selMachine && (
            <div className="border-b border-border bg-primary/5 px-4 py-3">
              <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Détail machine sélectionnée</p>
              <div className="space-y-1.5 text-[11px]">
                {[
                  ["Machine", selMachine.name],
                  ["IP", selMachine.ip],
                  ["Organisation", selMachine.org],
                  ["Statut", selMachine.status === "active" ? "✓ Actif" : "✗ Hors ligne"],
                  ["Menaces détectées", selMachine.threats.toString()],
                  ["Dernière règle", selMachine.rule],
                  ["Flux entrant", `${selMachine.inMbps} Mbps`],
                  ["Flux sortant", `${selMachine.outMbps} Mbps`],
                ].map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono font-bold text-foreground">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Live flow log ── */}
      <div className="border-t border-border px-6 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-3.5 w-3.5 animate-pulse text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Flux d'attaques {selectedMachine ? `→ ${selMachine?.name}` : "(toutes machines)"}
            </p>
          </div>
          {selectedMachine && (
            <button onClick={() => setSelectedMachine(null)} className="text-[9px] font-bold text-primary hover:underline">
              Voir tout
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {filteredLog.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic">En attente des premiers événements…</p>
          )}
          {filteredLog.slice(0, 6).map((e) => {
            const sc = SEV_COLOR[e.severity] ?? SEV_COLOR.low;
            return (
              <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-1.5">
                <span className="shrink-0 font-mono text-[9px] font-black" style={{ color: e.color }}>{e.type}</span>
                <span className="flex-1 truncate font-mono text-[10px] text-muted-foreground">
                  → {e.machineName} <span className="text-foreground">({e.machineIp})</span>
                </span>
                <span className={`shrink-0 text-[9px] font-black ${sc.text}`}>{e.severity.toUpperCase()}</span>
                <span className="shrink-0 text-[9px] text-muted-foreground">
                  {e.ts.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                {e.blocked
                  ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  : <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                }
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
