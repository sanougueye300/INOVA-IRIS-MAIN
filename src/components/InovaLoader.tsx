import React from "react";
import orangeLogo from "@/assets/orange-logo.png";
import { Shield } from "lucide-react";

interface InovaLoaderProps {
  message?: string;
}

export function InovaLoader({ message = "Initialisation sécurisée..." }: InovaLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#06080e] via-[#090b14] to-[#0d0f1a] text-white select-none overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-orange-600/10 blur-[80px] pointer-events-none" />

      {/* Subtle cyber grid mesh */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(245,158,11,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Animated Central Logo Badge */}
        <div className="relative mb-6">
          {/* Outer glowing pulsing ring */}
          <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-amber-500/30 via-orange-500/30 to-amber-500/30 blur-md animate-pulse" />

          {/* Spinner ring around the logo */}
          <div className="absolute -inset-1.5 rounded-2xl border-2 border-transparent border-t-amber-500 border-r-orange-500 animate-spin" />

          {/* Center icon container */}
          <div className="relative w-20 h-20 rounded-2xl bg-zinc-900/90 border border-amber-500/40 flex items-center justify-center shadow-2xl overflow-hidden p-2.5">
            <img src={orangeLogo} alt="Sonatel Orange" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Application Brand Name */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl sm:text-4xl font-black tracking-wider bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent drop-shadow-sm">
              INOVA
            </span>
            <span className="text-3xl sm:text-4xl font-black text-amber-500">
              -IRIS
            </span>
          </div>

          <p className="text-[11px] sm:text-xs font-black tracking-[0.25em] uppercase text-zinc-400">
            Plate-forme Cybersécurité · Sonatel SOC
          </p>
        </div>

        {/* Animated Loading Bar & Status */}
        <div className="mt-8 flex flex-col items-center gap-3 w-64">
          <div className="w-full h-1 bg-zinc-800/80 rounded-full overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 rounded-full w-1/2 animate-[shimmer_1.5s_infinite] bg-[length:200%_100%]"
              style={{
                animation: "loaderSlide 1.8s ease-in-out infinite"
              }}
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>{message}</span>
          </div>
        </div>

        {/* Subtle bottom tag */}
        <div className="mt-12 flex items-center gap-2 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          <Shield className="h-3 w-3 text-amber-500/60" />
          <span>Accréditation Sonatel RH · Détection & Réponse</span>
        </div>
      </div>

      <style>{`
        @keyframes loaderSlide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
