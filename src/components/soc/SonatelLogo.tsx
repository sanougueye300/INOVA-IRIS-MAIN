import { useSocPreferences } from "@/lib/soc-preferences";
import { cn } from "@/lib/utils";

export function SonatelLogo({ className = "h-9 w-9" }: { className?: string }) {
  const { themeColor, navbarAppearance } = useSocPreferences();

  // Map theme colors to premium gradients and shadows
  const gradientMap = {
    orange: "from-orange-500 to-amber-500 shadow-orange-500/20",
    blue: "from-blue-500 to-indigo-500 shadow-blue-500/20",
    green: "from-emerald-500 to-teal-500 shadow-emerald-500/20",
    violet: "from-violet-500 to-purple-500 shadow-violet-500/20",
    rose: "from-rose-500 to-pink-500 shadow-rose-500/20",
  };

  const selectedGradient = gradientMap[themeColor] || gradientMap.orange;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-xl bg-gradient-to-br font-black text-white shadow-lg transition-all duration-300 hover:scale-105 hover:rotate-2 select-none overflow-hidden",
        selectedGradient,
        navbarAppearance === "darker" ? "border border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.4)]" : "border border-black/5",
        className
      )}
      aria-label="Sonatel"
    >
      {/* Glossy overlay */}
      <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/25 rounded-xl" />
      
      {/* stylized logo monogram */}
      <span className="relative text-xs font-black tracking-widest pl-[1px] drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.3)]">
        SN
      </span>
      
      {/* Gloss reflection glow */}
      <span className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-tr from-transparent via-white/[0.05] to-transparent rotate-45 pointer-events-none" />
    </div>
  );
}