import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getClientExtendedData, ClientExtendedData } from "@/routes/clients.index";
import { Network, Laptop, Cpu, HardDrive, Wifi, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const OFFER_BY_TIER: Record<string, { name: string; color: string; maxPcs: number }> = {
  Bronze:  { name: "Inova Secure",         color: "#f97316", maxPcs: 10  },
  Argent:  { name: "Terranga Secure",      color: "#3b82f6", maxPcs: 25  },
  Or:      { name: "Gainde Secure",        color: "#f59e0b", maxPcs: 50  },
  Platine: { name: "Gainde Secure Premium", color: "#8b5cf6", maxPcs: 100 },
};

type PcStatus = "active" | "disconnected" | "alert" | "isolated";
interface Telemetry {
  cpu: number; ram: number; rxSpeed: number; txSpeed: number;
  procCount: number; packetsTotal: number; wazuhStatus: PcStatus;
}

/**
 * Topologie de Protection Endpoint propre au client connecté.
 * Charge les machines depuis client_ext_${user.id} (même source que la vue admin).
 */
export function ClientEndpointTopology() {
  const { user, organization } = useAuth();
  const [extData, setExtData] = useState<ClientExtendedData | null>(null);
  const [selectedPcId, setSelectedPcId] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<Record<string, Telemetry>>({});

  useEffect(() => {
    if (!user) return;
    setExtData(getClientExtendedData(user.id, organization || "Client"));
  }, [user, organization]);

  // Initialise la télémétrie à partir des PC chargés
  useEffect(() => {
    if (!extData) return;
    setTelemetry(prev => {
      const next = { ...prev };
      extData.pcs.forEach(pc => {
        if (!next[pc.id]) {
          next[pc.id] = {
            cpu: pc.cpu, ram: pc.ram,
            rxSpeed: pc.status === "active" || pc.status === "alert" ? 8 + Math.floor(Math.random() * 30) : 0,
            txSpeed: pc.status === "active" || pc.status === "alert" ? 2 + Math.floor(Math.random() * 8) : 0,
            procCount: pc.status === "disconnected" ? 0 : 40 + Math.floor(Math.random() * 80),
            packetsTotal: 1000 + Math.floor(Math.random() * 6000),
            wazuhStatus: pc.status,
          };
        }
      });
      return next;
    });
  }, [extData]);

  // Flux réseau / CPU en temps réel pour les agents en ligne
  useEffect(() => {
    if (!extData) return;
    const id = setInterval(() => {
      setTelemetry(prev => {
        const next = { ...prev };
        extData.pcs.forEach(pc => {
          const t = next[pc.id];
          if (!t || (t.wazuhStatus !== "active" && t.wazuhStatus !== "alert")) return;
          const jitter = (base: number, amp: number, min: number, max: number) =>
            Math.max(min, Math.min(max, base + Math.round((Math.random() - 0.5) * amp)));
          next[pc.id] = {
            ...t,
            cpu: jitter(t.cpu, 14, 2, t.wazuhStatus === "alert" ? 99 : 70),
            ram: jitter(t.ram, 8, 10, 95),
            rxSpeed: jitter(t.rxSpeed, 12, 1, 220),
            txSpeed: jitter(t.txSpeed, 6, 1, 90),
            packetsTotal: t.packetsTotal + Math.floor(Math.random() * 60),
          };
        });
        return next;
      });
    }, 1500);
    return () => clearInterval(id);
  }, [extData]);

  // Action EDR : isoler / reconnecter une machine
  const setPcStatus = (pcId: string, newStatus: PcStatus) => {
    setTelemetry(prev => ({ ...prev, [pcId]: { ...prev[pcId], wazuhStatus: newStatus } }));
    setExtData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, pcs: prev.pcs.map(p => p.id === pcId ? { ...p, status: newStatus } : p) };
      if (user) localStorage.setItem(`client_ext_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const offerInfo = extData ? (OFFER_BY_TIER[extData.contractTier] ?? OFFER_BY_TIER.Bronze) : OFFER_BY_TIER.Bronze;
  const pcs = extData?.pcs ?? [];
  const usedPcs = pcs.length;
  const maxPcs = offerInfo.maxPcs;
  const connectedPcs = pcs.filter(p => p.status === "active" || p.status === "alert").length;
  const quotaReached = usedPcs >= maxPcs;

  const selectedPc = useMemo(() => pcs.find(p => p.id === selectedPcId) || null, [pcs, selectedPcId]);

  if (!extData) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center text-sm text-slate-400">
        Chargement de votre topologie…
      </div>
    );
  }

  if (pcs.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-orange-50/40 p-12 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center">
          <Network className="h-7 w-7 text-orange-500" />
        </div>
        <div>
          <p className="text-base font-black text-slate-800">Aucune machine supervisée</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Votre parc EDR est vide. Rendez-vous dans <strong className="text-orange-500">Parc &amp; Inventaire EDR</strong> pour suivre le guide de déploiement Wazuh et enregistrer vos premiers postes.
          </p>
        </div>
        <a href="/clients/inventory" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-orange-600 transition-all">
          <ShieldCheck className="h-4 w-4" />
          Déployer l'agent EDR →
        </a>
      </div>
    );
  }


  return (
    <div className="space-y-6">
    <div className="grid gap-6 lg:grid-cols-3">

      {/* ── Carte topologie (thème clair) ── */}
      <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-slate-200/90 shadow-[0_2px_24px_0_rgba(0,0,0,0.06)] flex flex-col relative"
        style={{ background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 55%, #f1f5f9 100%)" }}>

        {/* Barre dégradée top */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300 z-10" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 border border-orange-200/60 flex items-center justify-center shadow-sm">
              <Network className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 tracking-wide">Topologie de Protection Endpoint</p>
              <p className="text-[10px] text-slate-400">Cartographie de vos agents Wazuh en temps réel</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {organization || "Mon parc"}
          </span>
        </div>

        {/* SVG zone */}
        <div className="flex-1 relative px-4 pt-3 pb-3">
          <div className="w-full flex flex-col gap-3">

            {/* Quota bar */}
            <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 border border-slate-200/80 bg-white/70 shadow-sm">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: offerInfo.color }} />
                    {offerInfo.name}
                  </span>
                  <span className={`text-[11px] font-black ${quotaReached ? "text-rose-500" : "text-emerald-600"}`}>
                    {usedPcs} / {maxPcs} postes
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min((usedPcs / maxPcs) * 100, 100)}%`,
                      background: quotaReached ? "#ef4444" : usedPcs / maxPcs > 0.8 ? "#f59e0b" : offerInfo.color,
                    }} />
                </div>
              </div>
            </div>

            {/* SVG topology */}
            <svg className="w-full" viewBox="0 0 580 280" style={{ minHeight: 220 }}>
              <defs>
                <linearGradient id="ce-lineActive" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="ce-lineAlert" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
                </linearGradient>
                <filter id="ce-glowHub" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="ce-glowNode" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <radialGradient id="ce-hubBg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                </radialGradient>
                <pattern id="ce-bgGrid" width="28" height="28" patternUnits="userSpaceOnUse">
                  <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#475569" strokeWidth="0.4" opacity="0.06" />
                </pattern>
              </defs>

              <rect width="580" height="280" fill="url(#ce-bgGrid)" />

              {/* Rings */}
              {[52, 70, 90].map((r, i) => (
                <circle key={r} cx="290" cy="140" r={r} fill="none" stroke="#f97316"
                  strokeWidth={i === 0 ? 0.8 : 0.5} strokeDasharray={i === 2 ? "4,8" : ""} opacity={0.22 - i * 0.05} />
              ))}

              {/* Connection lines */}
              {pcs.map((pc, idx) => {
                const total = pcs.length;
                const angle = (idx * 2 * Math.PI) / total - Math.PI / 2;
                const rx = 200, ry = 95;
                const tx = 290 + rx * Math.cos(angle);
                const ty = 140 + ry * Math.sin(angle);
                const strokeColor = pc.status === "active" ? "#10b981" : pc.status === "alert" ? "#f59e0b" : pc.status === "isolated" ? "#ef4444" : "#cbd5e1";
                const dash = pc.status === "isolated" ? "6,4" : pc.status === "disconnected" ? "3,6" : "";
                const gradId = pc.status === "active" ? "url(#ce-lineActive)" : pc.status === "alert" ? "url(#ce-lineAlert)" : strokeColor;
                return (
                  <g key={`ln-${pc.id}`}>
                    <line x1="290" y1="140" x2={tx} y2={ty} stroke={strokeColor} strokeWidth="3" strokeDasharray={dash} opacity="0.08" />
                    <line x1="290" y1="140" x2={tx} y2={ty}
                      stroke={pc.status === "active" || pc.status === "alert" ? gradId : strokeColor}
                      strokeWidth="1.5" strokeDasharray={dash} opacity={pc.status === "disconnected" ? 0.25 : 0.7} />
                    {(pc.status === "active" || pc.status === "alert") && (
                      <circle r="2.5" fill={strokeColor} opacity="0.9">
                        <animateMotion dur={`${2 + idx * 0.4}s`} repeatCount="indefinite" path={`M290,140 L${tx},${ty}`} />
                      </circle>
                    )}
                  </g>
                );
              })}

              {/* SOC HUB */}
              <g className="cursor-pointer" onClick={() => setSelectedPcId(null)}>
                <circle cx="290" cy="140" r="44" fill="url(#ce-hubBg)" />
                <circle cx="290" cy="140" r="34" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.4">
                  <animateTransform attributeName="transform" type="rotate" from="0 290 140" to="360 290 140" dur="12s" repeatCount="indefinite" />
                  <animate attributeName="stroke-dasharray" values="8,4;4,8;8,4" dur="3s" repeatCount="indefinite" />
                </circle>
                <rect x="274" y="122" width="32" height="36" rx="5" fill="#ffffff" stroke="#f97316" strokeWidth="1.8" filter="url(#ce-glowHub)" />
                {[0, 1, 2].map(i => (
                  <g key={i}>
                    <rect x="278" y={126 + i * 10} width="24" height="7" rx="2" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="0.5" />
                    <circle cx="282" cy={129.5 + i * 10} r="2" fill={i < 2 ? "#10b981" : "#f59e0b"} filter="url(#ce-glowNode)" />
                    <rect x="286" y={128 + i * 10} width="12" height="2" rx="1" fill="#cbd5e1" />
                    <rect x="286" y={131 + i * 10} width="8" height="1.5" rx="1" fill="#e2e8f0" />
                  </g>
                ))}
                <circle cx="290" cy="163" r="5" fill="#f97316" opacity="0.15">
                  <animate attributeName="r" values="5;9;5" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.15;0;0.15" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="290" cy="163" r="2.5" fill="#f97316" />
                <text x="290" y="178" textAnchor="middle" fontSize="7" fontWeight="900" fill="#ea580c" letterSpacing="1.5">SOC MANAGER</text>
                <text x="290" y="187" textAnchor="middle" fontSize="6" fill="#94a3b8" letterSpacing="0.5">INOVA IRIS</text>
              </g>

              {/* Endpoint nodes */}
              {pcs.map((pc, idx) => {
                const isSelected = selectedPcId === pc.id;
                const total = pcs.length;
                const angle = (idx * 2 * Math.PI) / total - Math.PI / 2;
                const rx = 200, ry = 95;
                const cx = 290 + rx * Math.cos(angle);
                const cy = 140 + ry * Math.sin(angle);
                const borderColor = pc.status === "active" ? "#10b981" : pc.status === "alert" ? "#f59e0b" : pc.status === "isolated" ? "#ef4444" : "#94a3b8";
                const bgColor = pc.status === "active" ? "#ecfdf5" : pc.status === "alert" ? "#fffbeb" : pc.status === "isolated" ? "#fef2f2" : "#f8fafc";
                const dotColor = pc.status === "active" ? "#10b981" : pc.status === "alert" ? "#f59e0b" : pc.status === "isolated" ? "#ef4444" : "#94a3b8";
                const osChar = pc.os === "windows" ? "W" : pc.os === "linux" ? "L" : "M";
                const shortName = pc.name.length > 12 ? `${pc.name.slice(0, 9)}…` : pc.name;

                return (
                  <g key={`node-${pc.id}`} className="cursor-pointer" onClick={() => setSelectedPcId(pc.id)}>
                    {isSelected && (
                      <circle cx={cx} cy={cy} r="24" fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.8">
                        <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="4s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {pc.status !== "disconnected" && (
                      <circle cx={cx} cy={cy} r="18" fill={borderColor} opacity="0.08" filter="url(#ce-glowNode)" />
                    )}
                    <rect x={cx - 14} y={cy - 12} width="28" height="18" rx="3" fill={bgColor} stroke={borderColor} strokeWidth={isSelected ? 2 : 1.5} />
                    <rect x={cx - 12} y={cy - 10} width="24" height="13" rx="1.5" fill={bgColor} opacity="0.9" />
                    <text x={cx} y={cy - 2} textAnchor="middle" fontSize="7" fontWeight="900" fill={borderColor} fontFamily="monospace">{osChar}</text>
                    <rect x={cx - 16} y={cy + 6} width="32" height="4" rx="1.5" fill="#e2e8f0" stroke={borderColor} strokeWidth="1" />
                    <rect x={cx - 5} y={cy + 9} width="10" height="1.5" rx="1" fill="#cbd5e1" />
                    <circle cx={cx + 12} cy={cy - 11} r="3.5" fill={dotColor} filter={pc.status !== "disconnected" ? "url(#ce-glowNode)" : ""}>
                      {(pc.status === "active" || pc.status === "alert") && (
                        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
                      )}
                    </circle>
                    <text x={cx} y={cy + 20} textAnchor="middle" fontSize="7" fontWeight="700" fontFamily="monospace" fill={isSelected ? "#ea580c" : "#475569"}>{shortName}</text>
                    <text x={cx} y={cy + 28} textAnchor="middle" fontSize="6" fontFamily="monospace" fill="#94a3b8">{pc.ip}</text>
                  </g>
                );
              })}
            </svg>

            {/* Légende */}
            <div className="flex items-center justify-between px-1">
              <div className="flex gap-4">
                {[
                  { color: "#10b981", label: "En ligne" },
                  { color: "#f59e0b", label: "Alerte SOC", pulse: true },
                  { color: "#ef4444", label: "Quarantaine" },
                  { color: "#cbd5e1", label: "Hors ligne" },
                ].map(s => (
                  <span key={s.label} className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                    <span className={`h-2 w-2 rounded-full ${s.pulse ? "animate-pulse" : ""}`} style={{ background: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
              <span className="text-[9px] font-mono text-slate-400">TLS v1.3 · AES-256-GCM</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Panneau latéral : KPIs + détail machine ── */}
      <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Postes protégés", value: usedPcs, icon: Laptop, color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd" },
            { label: "Agents actifs", value: connectedPcs, icon: ShieldCheck, color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
            { label: "Score cyber", value: `${extData.cyberScore}%`, icon: ShieldCheck, color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe" },
            { label: "Quota max", value: maxPcs, icon: Network, color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
          ].map(k => (
            <div key={k.label} className="rounded-2xl border p-4" style={{ backgroundColor: k.bg, borderColor: k.border }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{k.label}</span>
                <k.icon className="h-3.5 w-3.5" style={{ color: k.color }} />
              </div>
              <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Détail machine sélectionnée */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Laptop className="h-3.5 w-3.5 text-orange-500" />
            {selectedPc ? "Machine sélectionnée" : "Sélectionnez une machine"}
          </h3>
          {selectedPc ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-black text-slate-800 truncate">{selectedPc.name}</p>
                <p className="text-[11px] text-slate-400 font-mono">{selectedPc.ip} · {selectedPc.os}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  selectedPc.status === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : selectedPc.status === "alert" ? "bg-amber-50 text-amber-600 border-amber-200"
                  : selectedPc.status === "isolated" ? "bg-rose-50 text-rose-600 border-rose-200"
                  : "bg-slate-50 text-slate-500 border-slate-200"
                }`}>{selectedPc.status}</span>
                <span className="text-[10px] text-slate-400">Vu : {selectedPc.lastSeen}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1"><Cpu className="h-3 w-3" /> CPU</div>
                  <p className="text-lg font-black text-slate-700">{selectedPc.cpu}%</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1"><HardDrive className="h-3 w-3" /> RAM</div>
                  <p className="text-lg font-black text-slate-700">{selectedPc.ram}%</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1">
                <Wifi className="h-3 w-3" /> Agent Wazuh WZ-{selectedPc.wazuhId}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">
              Cliquez sur un poste de la cartographie pour afficher sa télémétrie (CPU, RAM, statut de l'agent EDR).
            </p>
          )}
        </div>
      </div>
    </div>

      {/* ── Console de terminaux EDR connectés ── */}
      <div className="rounded-2xl overflow-hidden border border-slate-200/90 shadow-[0_2px_24px_0_rgba(0,0,0,0.06)] relative bg-white">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300 z-10" />

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap px-5 py-4 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 border border-orange-200/60 flex items-center justify-center shadow-sm">
              <Laptop className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-base font-black text-slate-900 tracking-wide">Console de terminaux EDR connectés ({pcs.length})</p>
              <p className="text-[11px] text-slate-400">Pilotez à distance la protection active de vos postes et exécutez des playbooks SOAR.</p>
            </div>
          </div>
          {selectedPcId && (
            <button onClick={() => setSelectedPcId(null)}
              className="rounded-lg text-xs font-semibold px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
              Désélectionner PC
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-200/60">
              <tr>
                <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider">Terminal</th>
                <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider">Système / OS</th>
                <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider">Adresse IP</th>
                <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider">Flux Réseau (Temps réel)</th>
                <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider">Télémétrie CPU/RAM</th>
                <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider">État Wazuh</th>
                <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-right">Action Directe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pcs.map(pc => {
                const isSelected = selectedPcId === pc.id;
                const t = telemetry[pc.id] || { cpu: pc.cpu, ram: pc.ram, rxSpeed: 0, txSpeed: 0, procCount: 0, packetsTotal: 0, wazuhStatus: pc.status };
                const status = t.wazuhStatus;
                return (
                  <tr key={pc.id}
                    className={`hover:bg-slate-50/70 transition-all cursor-pointer ${isSelected ? "bg-orange-50/60 border-l-4 border-l-orange-400" : ""} ${status === "isolated" ? "bg-rose-50/50" : ""}`}
                    onClick={() => setSelectedPcId(pc.id)}>

                    {/* Terminal */}
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      <span className="flex items-center gap-1.5 flex-wrap">
                        {pc.name}
                        {status === "isolated" && (
                          <span className="bg-rose-500 text-white font-extrabold text-[9px] rounded-md px-1.5 py-0.5 inline-flex items-center gap-0.5 animate-pulse">
                            <ShieldAlert className="h-3 w-3" /> ISOLÉ
                          </span>
                        )}
                        {status === "alert" && (
                          <span className="bg-amber-500 text-slate-950 font-extrabold text-[9px] rounded-md px-1.5 py-0.5 inline-flex items-center gap-0.5 animate-bounce">
                            <AlertTriangle className="h-3 w-3" /> ALERTE
                          </span>
                        )}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-mono mt-0.5">WZ-ID: {pc.wazuhId} · Processus: {t.procCount || "—"}</span>
                    </td>

                    {/* OS */}
                    <td className="px-5 py-4 capitalize font-medium text-slate-700">
                      <span className="flex items-center gap-1.5">
                        {pc.os === "windows" ? "🖥️ Windows" : pc.os === "linux" ? "🐧 Linux" : "🍎 macOS"}
                      </span>
                    </td>

                    {/* IP */}
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">{pc.ip}</td>

                    {/* Live bandwidth */}
                    <td className="px-5 py-4 font-mono text-xs">
                      {status === "active" || status === "alert" ? (
                        <div className="flex flex-col gap-0.5 text-emerald-600 font-semibold">
                          <span className="flex items-center gap-1">↓ {t.rxSpeed} KB/s</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">↑ {t.txSpeed} KB/s · PKTS: {t.packetsTotal}</span>
                        </div>
                      ) : status === "isolated" ? (
                        <span className="text-rose-500 font-bold flex items-center gap-1">🚫 LOCKDOWN</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Telemetry */}
                    <td className="px-5 py-4">
                      {status !== "disconnected" ? (
                        <div className="space-y-1.5 w-32">
                          <div className="flex items-center justify-between text-[10px] font-mono font-semibold">
                            <span className={t.cpu > 75 ? "text-rose-500 font-bold" : "text-slate-500"}>CPU: {t.cpu}%</span>
                            <span className={t.ram > 80 ? "text-rose-500 font-bold" : "text-slate-500"}>RAM: {t.ram}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${t.cpu > 75 ? "bg-rose-500 animate-pulse" : "bg-orange-500"}`}
                              style={{ width: `${Math.max(t.cpu, t.ram)}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {status === "active" ? (
                        <span className="bg-emerald-500/10 text-emerald-600 font-bold rounded-lg px-2 py-0.5 text-xs">En Ligne</span>
                      ) : status === "alert" ? (
                        <span className="bg-amber-500/10 text-amber-600 font-bold rounded-lg px-2 py-0.5 text-xs animate-pulse">Alerte SOC</span>
                      ) : status === "isolated" ? (
                        <span className="bg-rose-500/10 text-rose-600 font-bold rounded-lg px-2 py-0.5 text-xs">Quarantaine</span>
                      ) : (
                        <span className="bg-slate-200 text-slate-600 font-medium rounded-lg px-2 py-0.5 text-xs">Déconnecté</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                      {status === "disconnected" ? (
                        <span className="text-slate-300 text-xs">—</span>
                      ) : status === "isolated" ? (
                        <button
                          className="h-8 rounded-lg text-xs font-semibold px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
                          onClick={() => {
                            setPcStatus(pc.id, "active");
                            toast.success("Terminal reconnecté", { description: `L'accès réseau a été rétabli pour ${pc.name}.` });
                          }}>
                          Reconnecter
                        </button>
                      ) : (
                        <button
                          className="h-8 rounded-lg text-xs font-semibold px-2.5 bg-rose-600 hover:bg-rose-700 text-white transition-all"
                          onClick={() => {
                            setPcStatus(pc.id, "isolated");
                            toast.warning("Isolation EDR ordonnée", { description: `${pc.name} a été placé en quarantaine réseau (Wazuh Active Response).` });
                          }}>
                          Isoler EDR
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
