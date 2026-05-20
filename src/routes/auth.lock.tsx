import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Lock, Delete, Shield, KeyRound, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/lock")({
  component: LockPage,
});

function LockPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState<string[]>([]);
  const [sessionTime, setSessionTime] = useState(0);

  // Keep track of active session duration before lock
  useEffect(() => {
    const randomInitialTime = Math.floor(Math.random() * 4000) + 3600; // ~1 hour
    setSessionTime(randomInitialTime);
    const interval = setInterval(() => {
      setSessionTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = [...pin, num];
      setPin(nextPin);
      
      // Auto submit on 4th digit
      if (nextPin.length === 4) {
        handleUnlock(nextPin.join(""));
      }
    }
  };

  const handleClear = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  const handleUnlock = (enteredPin: string) => {
    toast.info("Validation du code PIN...");
    setTimeout(() => {
      // For demo, any PIN is valid, but let's encourage 1234
      toast.success("Session déverrouillée ! Restauration de l'environnement SOC...");
      navigate({ to: "/dashboard", replace: true });
    }, 1000);
  };

  return (
    <div className="w-full space-y-6 flex flex-col items-center animate-fade-in text-center">
      {/* Locked User Profile */}
      <div className="space-y-3">
        <div className="relative mx-auto h-20 w-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 border-2 border-primary/40 text-primary shadow-[var(--glow-primary)]">
            <span className="text-2xl font-bold text-white">SG</span>
          </div>
          <span className="absolute bottom-0 right-0 flex h-4 w-4 rounded-full border-2 border-background bg-amber-500"></span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Sanou Gueye</h2>
          <p className="text-xs text-muted-foreground">sanou.gueye@sonatel.sn</p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-zinc-900/50 border border-zinc-800 px-2.5 py-0.5 text-[10px] text-zinc-400 font-mono">
            <Lock className="h-3 w-3 text-amber-500 animate-pulse" />
            Session active : {formatTime(sessionTime)}
          </div>
        </div>
      </div>

      {/* PIN Dot Indicators */}
      <div className="flex justify-center gap-3 py-2">
        {[0, 1, 2, 3].map((idx) => (
          <div 
            key={idx} 
            className={`h-3 w-3 rounded-full border transition-all duration-200 ${
              pin.length > idx 
                ? "bg-primary border-primary scale-110 shadow-[var(--glow-primary)]" 
                : "border-zinc-700 bg-transparent"
            }`}
          />
        ))}
      </div>

      {/* PIN Pad */}
      <div className="w-64 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="flex h-12 w-full items-center justify-center rounded-lg border border-border/60 bg-card text-sm font-semibold hover:bg-accent/40 active:scale-95 transition-all"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin([])}
            className="flex h-12 w-full items-center justify-center rounded-lg text-xs font-semibold text-zinc-500 hover:text-foreground active:scale-95 transition-all"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress("0")}
            className="flex h-12 w-full items-center justify-center rounded-lg border border-border/60 bg-card text-sm font-semibold hover:bg-accent/40 active:scale-95 transition-all"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex h-12 w-full items-center justify-center rounded-lg text-xs font-semibold text-zinc-500 hover:text-foreground active:scale-95 transition-all"
          >
            <Delete className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Alternate Options */}
      <div className="pt-4 border-t border-border/40 w-full flex items-center justify-center gap-2 text-xs">
        <Link to="/auth/login" className="text-zinc-500 hover:text-primary flex items-center gap-1.5">
          <UserMinus className="h-3.5 w-3.5" /> Changer d'utilisateur
        </Link>
      </div>
    </div>
  );
}
