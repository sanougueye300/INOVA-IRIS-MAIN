import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useSocPreferences } from "@/lib/soc-preferences";
import { Globe, ShieldAlert, Zap, Radio, Database } from "lucide-react";

// Curated coordinates for countries on the SVG grid (x: 0-100, y: 0-100)
const COUNTRIES = [
  { id: "US", name: "United States", flag: "🇺🇸", x: 22, y: 28 },
  { id: "DE", name: "Germany", flag: "🇩🇪", x: 49, y: 23 },
  { id: "SG", name: "Singapore", flag: "🇸🇬", x: 78, y: 48 },
  { id: "GB", name: "United Kingdom", flag: "🇬🇧", x: 45, y: 20 },
  { id: "BG", name: "Bulgaria", flag: "🇧🇬", x: 53, y: 26 },
  { id: "IN", name: "India", flag: "🇮🇳", x: 69, y: 36 },
  { id: "AU", name: "Australia", flag: "🇦🇺", x: 86, y: 55 },
  { id: "JP", name: "Japan", flag: "🇯🇵", x: 85, y: 28 },
  { id: "SN", name: "Senegal", flag: "🇸🇳", x: 40, y: 40 },
  { id: "FR", name: "France", flag: "🇫🇷", x: 47, y: 24 },
  { id: "CN", name: "China", flag: "🇨🇳", x: 76, y: 30 },
  { id: "BR", name: "Brazil", flag: "🇧🇷", x: 34, y: 52 },
];

const ATTACK_TYPES = [
  { id: "web", name: "Web Attackers", nameFr: "Attaques Web", color: "#ef4444", bg: "bg-red-500/20", border: "border-red-500", text: "text-red-500" },
  { id: "ddos", name: "DDoS Attackers", nameFr: "Attaques DDoS", color: "#f59e0b", bg: "bg-amber-500/20", border: "border-amber-500", text: "text-amber-500" },
  { id: "intruder", name: "Intruders", nameFr: "Intrusions", color: "#3b82f6", bg: "bg-blue-500/20", border: "border-blue-500", text: "text-blue-500" },
  { id: "scanner", name: "Scanners", nameFr: "Scanners", color: "#8b5cf6", bg: "bg-violet-500/20", border: "border-violet-500", text: "text-violet-500" },
  { id: "anon", name: "Anonymizers", nameFr: "Anonymiseurs", color: "#ec4899", bg: "bg-pink-500/20", border: "border-pink-500", text: "text-pink-500" },
];

interface LiveArc {
  id: string;
  from: typeof COUNTRIES[number];
  to: typeof COUNTRIES[number];
  color: string;
  type: string;
  path: string;
}

interface StatItem {
  name: string;
  pct: number;
  flag?: string;
}

export function ThreatMap() {
  const { t } = useSocPreferences();
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(["web", "ddos", "intruder", "scanner", "anon"]));
  const [arcs, setArcs] = useState<LiveArc[]>([]);
  const [attackCounter, setAttackCounter] = useState(0);

  // Live stats states which slightly fluctuate for realism
  const [stats, setStats] = useState<{
    attackers: StatItem[];
    attacked: StatItem[];
    vectors: StatItem[];
  }>({
    attackers: [
      { name: "United States", flag: "🇺🇸", pct: 76 },
      { name: "Singapore", flag: "🇸🇬", pct: 8 },
      { name: "Germany", flag: "🇩🇪", pct: 6 },
      { name: "United Kingdom", flag: "🇬🇧", pct: 6 },
      { name: "Bulgaria", flag: "🇧🇬", pct: 4 },
    ],
    attacked: [
      { name: "United States", flag: "🇺🇸", pct: 30 },
      { name: "India", flag: "🇮🇳", pct: 24 },
      { name: "Australia", flag: "🇦🇺", pct: 18 },
      { name: "Germany", flag: "🇩🇪", pct: 14 },
      { name: "Japan", flag: "🇯🇵", pct: 14 },
    ],
    vectors: [
      { name: "TCP Flood", pct: 84 },
      { name: "DNS Flood", pct: 8 },
      { name: "Low and Slow", pct: 4 },
      { name: "IP Flood", pct: 2 },
      { name: "UDP Flood", pct: 2 },
    ]
  });

  // Toggle active attack types
  const toggleType = (id: string) => {
    const next = new Set(activeTypes);
    if (next.has(id)) {
      if (next.size > 1) next.delete(id); // Keep at least one type active
    } else {
      next.add(id);
    }
    setActiveTypes(next);
  };

  // Generate real-time live attacks
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTypes.size === 0) return;

      // Select random type from active types
      const activeArray = Array.from(activeTypes);
      const randomType = ATTACK_TYPES.find(t => t.id === activeArray[Math.floor(Math.random() * activeArray.length)])!;
      
      // Select source and target
      const source = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
      let target = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
      while (target.id === source.id) {
        target = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
      }

      // Generate curved SVG quadratic bezier path
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dr = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate perpendicular control point for curve
      const cx = (source.x + target.x) / 2 - (dy * 0.25);
      const cy = (source.y + target.y) / 2 + (dx * 0.25);
      const path = `M ${source.x} ${source.y} Q ${cx} ${cy} ${target.x} ${target.y}`;

      const newArc: LiveArc = {
        id: Math.random().toString(36).substring(2, 9),
        from: source,
        to: target,
        color: randomType.color,
        type: randomType.name,
        path,
      };

      setArcs(prev => [...prev.slice(-15), newArc]); // Keep last 15 arcs
      setAttackCounter(c => c + 1);

      // Fluctuate stats slightly
      setStats(prev => {
        const adjust = (list: { name: string; flag?: string; pct: number }[]) => {
          let sum = 0;
          const updated = list.map((item, idx) => {
            const shift = Math.random() > 0.6 ? (Math.random() > 0.5 ? 1 : -1) : 0;
            const val = Math.max(1, item.pct + shift);
            sum += val;
            return { ...item, pct: val };
          });
          // Normalize to 100%
          return updated.map(item => ({ ...item, pct: Math.round((item.pct / sum) * 100) })).sort((a,b) => b.pct - a.pct);
        };

        return {
          attackers: adjust(prev.attackers),
          attacked: adjust(prev.attacked),
          vectors: adjust(prev.vectors),
        };
      });

    }, 850); // Fast live attacks stream

    return () => clearInterval(interval);
  }, [activeTypes]);

  return (
    <Card id="threatmap" className="relative overflow-hidden border border-border bg-zinc-950 p-0 shadow-2xl text-white">
      {/* High-Tech Grid Overlay background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.02),transparent)] pointer-events-none" />

      {/* Map Header */}
      <div className="flex flex-col gap-2 border-b border-white/5 bg-white/[0.02] px-6 py-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-pulse">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400">
              {t("LIVE CYBER THREAT MAP") || "LIVE CYBER THREAT MAP"}
            </h3>
            <p className="text-xs text-zinc-400 font-mono">
              REAL-TIME ATTACK FLOW • {attackCounter} DETECTIONS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-red-400 uppercase font-semibold">LIVE STREAMING ACTIVE</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 relative z-10">
        
        {/* Left Panel: Attack Types Checklist */}
        <div className="border-b border-white/5 bg-white/[0.01] p-4 lg:border-b-0 lg:border-r lg:col-span-1">
          <h4 className="mb-4 font-mono text-[11px] font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-zinc-500" />
            {t("ATTACK TYPES") || "ATTACK TYPES"}
          </h4>
          <div className="space-y-2.5">
            {ATTACK_TYPES.map((type) => {
              const active = activeTypes.has(type.id);
              return (
                <button
                  key={type.id}
                  onClick={() => toggleType(type.id)}
                  className={`w-full flex items-center gap-3 rounded-lg border p-2.5 transition-all text-left font-mono text-xs ${
                    active 
                      ? `${type.bg} border-white/10 text-white shadow-sm` 
                      : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-400"
                  }`}
                >
                  <Checkbox 
                    checked={active} 
                    className={`rounded border-white/20 data-[state=checked]:bg-transparent data-[state=checked]:border-none`} 
                    style={{ color: active ? type.color : "transparent" }}
                  />
                  <span className="flex-1 font-semibold">{t(type.name) || type.nameFr}</span>
                  <span className={`h-2 w-2 rounded-full`} style={{ backgroundColor: type.color }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Panel: Dotted High-Tech World Map */}
        <div className="relative aspect-[16/10] w-full bg-zinc-950 p-4 lg:col-span-2 overflow-hidden flex flex-col justify-between min-h-[350px]">
          
          {/* Cyber Dotted Map */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <svg viewBox="0 0 100 60" className="h-full w-full" preserveAspectRatio="none">
              <defs>
                <pattern id="dot-matrix" width="2" height="2" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="0.25" fill="#3b82f6" />
                </pattern>
              </defs>
              <rect width="100" height="60" fill="url(#dot-matrix)" />
              {/* Futuristic stylized continent paths */}
              <path d="M12 18 Q 28 10 40 22 T 58 28 Q 50 38 35 34 Z" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.15)" strokeWidth="0.5" />
              <path d="M48 24 Q 60 18 72 26 T 92 34 Q 82 46 65 42 T 50 36 Z" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.15)" strokeWidth="0.5" />
              <path d="M34 40 Q 40 48 32 54 T 24 48 Z" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.15)" strokeWidth="0.5" />
              <path d="M55 46 Q 65 52 72 58 T 62 60 Z" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.15)" strokeWidth="0.5" />
            </svg>
          </div>

          {/* SVG Animated Attack Laser Arcs */}
          <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" viewBox="0 0 100 60">
            <defs>
              <linearGradient id="laser-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Glowing target nodes */}
            {COUNTRIES.map((c) => (
              <g key={c.id}>
                <circle cx={c.x} cy={c.y} r="1" className="fill-emerald-500/20 stroke-emerald-500/40" strokeWidth="0.3" />
                <circle cx={c.x} cy={c.y} r="0.3" className="fill-emerald-400 animate-ping" />
              </g>
            ))}

            {/* Attack Flow Lines */}
            {arcs.map((arc) => (
              <g key={arc.id}>
                {/* Curved line animation */}
                <path
                  d={arc.path}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth="0.6"
                  strokeDasharray="40 40"
                  strokeDashoffset="80"
                  className="opacity-75"
                >
                  <animate attributeName="stroke-dashoffset" values="80;0" dur="1.2s" repeatCount="indefinite" />
                </path>
                {/* Traveling glowing particle head */}
                <circle r="0.6" fill="#ffffff" style={{ color: arc.color }} className="shadow-[0_0_8px_currentColor]">
                  <animateMotion path={arc.path} dur="1.2s" repeatCount="indefinite" />
                </circle>
              </g>
            ))}
          </svg>

          {/* Map labels floating */}
          {COUNTRIES.map((c) => (
            <div 
              key={c.id} 
              className="absolute pointer-events-none flex flex-col items-center select-none"
              style={{ left: `${c.x}%`, top: `${c.y}%`, transform: "translate(-50%, -120%)" }}
            >
              <span className="font-mono text-[8px] font-bold text-zinc-400 bg-zinc-950/80 px-1 border border-white/5 rounded whitespace-nowrap">
                {c.flag} {c.id}
              </span>
            </div>
          ))}

          {/* Bottom Oscilloscope Scrolling Timeline Wave */}
          <div className="w-full bg-zinc-900/40 border border-white/5 rounded-lg p-2 relative overflow-hidden backdrop-blur-sm z-20 mt-auto">
            <div className="flex items-center justify-between font-mono text-[9px] text-zinc-500 mb-1">
              <span>13:50</span>
              <span>14:10</span>
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                NOW
              </span>
            </div>
            <div className="h-10 relative flex items-end">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
                {ATTACK_TYPES.map((type, idx) => {
                  if (!activeTypes.has(type.id)) return null;
                  const phase = idx * 1.5;
                  const amp = 4 + idx * 2;
                  // Dynamic waving line
                  const d = `M 0 ${10 + Math.sin(phase) * amp} 
                             Q 25 ${10 + Math.sin(phase + 1) * amp} 50 ${10 + Math.sin(phase + 2) * amp} 
                             T 100 ${10 + Math.sin(phase + 3) * amp}`;
                  return (
                    <path
                      key={type.id}
                      d={d}
                      fill="none"
                      stroke={type.color}
                      strokeWidth="0.8"
                      className="opacity-40"
                      style={{
                        animation: `wave-flow-${type.id} 4s linear infinite`
                      }}
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Right Panel: Top Lists (Attackers, Targets, Vectors) */}
        <div className="border-t border-white/5 bg-white/[0.01] p-4 lg:border-t-0 lg:border-l lg:col-span-1 space-y-4 max-h-[400px] overflow-y-auto pr-2">
          
          {/* Top Attackers */}
          <div>
            <h4 className="mb-2 font-mono text-[10px] font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-2">
              <Zap className="h-3 w-3 text-red-400" />
              {t("TOP ATTACKERS") || "TOP ATTACKERS"}
            </h4>
            <div className="space-y-1.5">
              {stats.attackers.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 flex items-center gap-1.5 truncate">
                    <span className="text-zinc-500 text-[10px]">{idx + 1}.</span>
                    <span>{item.flag}</span>
                    <span className="truncate">{item.name}</span>
                  </span>
                  <div className="flex items-center gap-2 w-20 shrink-0">
                    <div className="h-1.5 bg-zinc-800 rounded-full flex-1 overflow-hidden">
                      <div className="h-full bg-red-500/80 rounded-full transition-all duration-500" style={{ width: `${item.pct}%` }} />
                    </div>
                    <span className="text-zinc-400 text-[10px] font-bold text-right w-6">{item.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Attacked */}
          <div>
            <h4 className="mb-2 font-mono text-[10px] font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-2">
              <Radio className="h-3 w-3 text-emerald-400" />
              {t("TOP ATTACKED") || "TOP ATTACKED"}
            </h4>
            <div className="space-y-1.5">
              {stats.attacked.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 flex items-center gap-1.5 truncate">
                    <span className="text-zinc-500 text-[10px]">{idx + 1}.</span>
                    <span>{item.flag}</span>
                    <span className="truncate">{item.name}</span>
                  </span>
                  <div className="flex items-center gap-2 w-20 shrink-0">
                    <div className="h-1.5 bg-zinc-800 rounded-full flex-1 overflow-hidden">
                      <div className="h-full bg-emerald-500/80 rounded-full transition-all duration-500" style={{ width: `${item.pct}%` }} />
                    </div>
                    <span className="text-zinc-400 text-[10px] font-bold text-right w-6">{item.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Vectors */}
          <div>
            <h4 className="mb-2 font-mono text-[10px] font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-2">
              <Database className="h-3 w-3 text-blue-400" />
              {t("TOP NETWORK ATTACK VECTORS") || "TOP NETWORK ATTACK VECTORS"}
            </h4>
            <div className="space-y-1.5">
              {stats.vectors.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 truncate">
                    <span className="text-zinc-500 text-[10px] mr-1.5">{idx + 1}.</span>
                    <span>{item.name}</span>
                  </span>
                  <div className="flex items-center gap-2 w-16 shrink-0 justify-end">
                    <span className="text-zinc-400 text-[10px] font-bold">{item.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </Card>
  );
}
