import { useEffect, useRef, useState, useCallback } from "react";
import { Shield, Wifi } from "lucide-react";

const NODES = [
  { id: "beijing", name: "Beijing", lat: 39.9, lon: 116.4, type: "attacker" },
  { id: "moscow", name: "Moscou", lat: 55.75, lon: 37.6, type: "attacker" },
  { id: "tehran", name: "Téhéran", lat: 35.7, lon: 51.4, type: "attacker" },
  { id: "pyongyang", name: "Pyongyang", lat: 39.0, lon: 125.8, type: "attacker" },
  { id: "lagos", name: "Lagos", lat: 6.5, lon: 3.4, type: "attacker" },
  { id: "brasilia", name: "Brasília", lat: -15.8, lon: -47.9, type: "attacker" },
  { id: "mumbai", name: "Mumbai", lat: 19.1, lon: 72.9, type: "attacker" },
  { id: "dakar", name: "Dakar — SOC", lat: 14.7, lon: -17.4, type: "home" },
  { id: "paris", name: "Paris", lat: 48.85, lon: 2.35, type: "defender" },
  { id: "berlin", name: "Berlin", lat: 52.5, lon: 13.4, type: "defender" },
  { id: "washington", name: "Washington", lat: 38.9, lon: -77, type: "defender" },
  { id: "tokyo", name: "Tokyo", lat: 35.7, lon: 139.7, type: "defender" },
  { id: "london", name: "Londres", lat: 51.5, lon: -0.1, type: "defender" },
  { id: "amsterdam", name: "Amsterdam", lat: 52.4, lon: 4.9, type: "defender" },
  { id: "abidjan", name: "Abidjan", lat: 5.3, lon: -4.0, type: "defender" },
  { id: "bamako", name: "Bamako", lat: 12.6, lon: -8.0, type: "defender" },
];

const ATTACK_TYPES = ["DDoS", "APT", "Ransomware", "Phishing", "Botnet", "0-Day"];
const ATTACK_COLORS: Record<string, string> = {
  DDoS: "#ef4444",
  APT: "#f59e0b",
  Ransomware: "#ec4899",
  Phishing: "#8b5cf6",
  Botnet: "#06b6d4",
  "0-Day": "#ff6b35",
};

function latLonToXY(lat: number, lon: number, w: number, h: number) {
  return { x: ((lon + 180) / 360) * w, y: ((90 - lat) / 180) * h };
}

interface Arc {
  id: number;
  fromNode: (typeof NODES)[0];
  toNode: (typeof NODES)[0];
  type: string;
  color: string;
  progress: number;
  speed: number;
  blocked: boolean;
}

export function SocCyberGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arcsRef = useRef<Arc[]>([]);
  const frameRef = useRef<number>(0);
  const counterRef = useRef(0);
  const [stats, setStats] = useState({ total: 0, blocked: 0, active: 0 });
  const [log, setLog] = useState<{ id: number; type: string; from: string; to: string; color: string; blocked: boolean }[]>([]);

  const spawnArc = useCallback(() => {
    const attackers = NODES.filter((n) => n.type === "attacker");
    const targets = NODES.filter((n) => n.type !== "attacker");
    const from = attackers[Math.floor(Math.random() * attackers.length)];
    const to = targets[Math.floor(Math.random() * targets.length)];
    const type = ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)];
    const blocked = Math.random() > 0.35;
    counterRef.current++;
    const arc: Arc = {
      id: counterRef.current,
      fromNode: from,
      toNode: to,
      type,
      color: ATTACK_COLORS[type],
      progress: 0,
      speed: 0.003 + Math.random() * 0.004,
      blocked,
    };
    arcsRef.current.push(arc);
    setLog((prev) => [{ id: arc.id, type, from: from.name, to: to.name, color: arc.color, blocked }, ...prev.slice(0, 5)]);
    setStats((prev) => ({ total: prev.total + 1, blocked: blocked ? prev.blocked + 1 : prev.blocked, active: arcsRef.current.length }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    // Spawn arcs at intervals
    const spawnInterval = setInterval(spawnArc, 1800);

    const draw = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      // Background
      const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H));
      bgGrad.addColorStop(0, "#0d1117");
      bgGrad.addColorStop(1, "#050709");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Grid lines (latitude/longitude)

      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      for (let lon = -180; lon <= 180; lon += 30) {
        const x = ((lon + 180) / 360) * W;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let lat = -90; lat <= 90; lat += 30) {
        const y = ((90 - lat) / 180) * H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Draw continents approximation (dot cloud for land masses)
      const LAND_DOTS = [
        // Europe
        [51, 10], [48, 2], [52, -0.1], [54, -4], [60, 11], [57, 24], [45, 14], [38, 23], [40, 22], [43, 13], [46, 14],
        // N America
        [38, -77], [44, -79], [48, -123], [37, -122], [34, -118], [41, -87], [39, -76], [45, -93], [51, -104], [50, -114],
        // S America
        [-15, -47], [-23, -43], [-3, -60], [-16, -68], [-35, -58], [4, -74], [-10, -75], [-22, -50],
        // Africa
        [35, 10], [31, 31], [14, -17], [6, 3], [5, -4], [12, -8], [-26, 28], [-15, 32], [5, 38], [4, 9], [15, 38], [-18, 46], [16, 0],
        // Asia
        [39.9, 116.4], [55.75, 37.6], [35.7, 51.4], [25, 80], [35, 137], [37, 126], [39, 116], [31, 121], [13, 100], [1, 103], [23, 114],
        // Oceania
        [-33, 151], [-27, 153], [-35, 174], [-37, 144],
      ];
      ctx.fillStyle = "rgba(100,120,150,0.18)";
      for (const [lat, lon] of LAND_DOTS) {
        const { x, y } = latLonToXY(lat, lon, W, H);
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw arcs
      arcsRef.current = arcsRef.current.filter((arc) => arc.progress <= 1);
      for (const arc of arcsRef.current) {
        arc.progress += arc.speed;
        const { x: x1, y: y1 } = latLonToXY(arc.fromNode.lat, arc.fromNode.lon, W, H);
        const { x: x2, y: y2 } = latLonToXY(arc.toNode.lat, arc.toNode.lon, W, H);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * 0.45;

        // Full arc trail (faded)
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(mx, my, x2, y2);
        ctx.strokeStyle = arc.color + "22";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Animated arc segment
        const t = Math.min(arc.progress, 1);
        const steps = 60;
        ctx.beginPath();
        for (let i = 0; i <= steps * t; i++) {
          const s = i / steps;
          const px = (1 - s) * (1 - s) * x1 + 2 * (1 - s) * s * mx + s * s * x2;
          const py = (1 - s) * (1 - s) * y1 + 2 * (1 - s) * s * my + s * s * y2;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, arc.color + "00");
        grad.addColorStop(1, arc.color + "cc");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Particle dot at head
        if (t < 1) {
          const s = t;
          const px = (1 - s) * (1 - s) * x1 + 2 * (1 - s) * s * mx + s * s * x2;
          const py = (1 - s) * (1 - s) * y1 + 2 * (1 - s) * s * my + s * s * y2;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = arc.color;
          ctx.fill();
          // Glow
          const glow = ctx.createRadialGradient(px, py, 0, px, py, 10);
          glow.addColorStop(0, arc.color + "88");
          glow.addColorStop(1, arc.color + "00");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(px, py, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw nodes
      for (const node of NODES) {
        const { x, y } = latLonToXY(node.lat, node.lon, W, H);
        const isHome = node.type === "home";
        const isAttacker = node.type === "attacker";
        const color = isHome ? "#f97316" : isAttacker ? "#ef4444" : "#3b82f6";
        const pulse = (Math.sin(Date.now() / 600 + node.lat) * 0.5 + 0.5);

        // Outer pulse ring
        ctx.beginPath();
        ctx.arc(x, y, (isHome ? 16 : 10) + pulse * (isHome ? 8 : 5), 0, Math.PI * 2);
        ctx.strokeStyle = color + "33";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(x, y, isHome ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isHome ? 20 : 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label (home only always, others on hover - show all for now)
        if (isHome) {
          ctx.font = "bold 11px monospace";
          ctx.fillStyle = "#f97316";
          ctx.fillText(node.name, x + 10, y - 8);
        } else if (isAttacker) {
          ctx.font = "9px monospace";
          ctx.fillStyle = "rgba(239,68,68,0.7)";
          ctx.fillText(node.name, x + 6, y - 4);
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      clearInterval(spawnInterval);
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [spawnArc]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d1117] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
            <Wifi className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white">Cyber Threat Map — INOVA-IRIS</h2>
            <p className="text-[10px] text-zinc-500 font-mono">Simulation des attaques mondiales · SOC Sonatel Group</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            {stats.total} Attaques
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-400">
            <Shield className="h-3 w-3" />
            {stats.blocked} Bloquées
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative h-[420px] w-full">
        <canvas ref={canvasRef} className="h-full w-full" style={{ display: "block" }} />

        {/* Legend overlay */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Légende</p>
          {Object.entries(ATTACK_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              <span className="text-[9px] font-mono text-zinc-400">{type}</span>
            </div>
          ))}
        </div>

        {/* Node types */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Nœuds</p>
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-500" /><span className="text-[9px] font-mono text-orange-400">SOC Sonatel (vous)</span></div>
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" /><span className="text-[9px] font-mono text-zinc-400">Source d'attaque</span></div>
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-500" /><span className="text-[9px] font-mono text-zinc-400">Cible défendue</span></div>
        </div>
      </div>

      {/* Live attack log */}
      <div className="border-t border-white/10 px-6 py-3">
        <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-zinc-600">Journal des attaques</p>
        <div className="flex flex-col gap-1.5">
          {log.length === 0 && <p className="text-[10px] font-mono text-zinc-700 italic">En attente de flux…</p>}
          {log.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 text-[10px] font-mono">
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: entry.color }} />
              <span className="font-bold" style={{ color: entry.color }}>{entry.type}</span>
              <span className="text-zinc-500 truncate">{entry.from} → {entry.to}</span>
              <span className={`ml-auto shrink-0 font-bold ${entry.blocked ? "text-emerald-400" : "text-red-400"}`}>
                {entry.blocked ? "BLOQUÉ" : "ACTIF"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
