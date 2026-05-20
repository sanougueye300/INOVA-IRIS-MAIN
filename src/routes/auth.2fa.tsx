import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ShieldCheck, QrCode, Copy, Check, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/2fa")({
  component: TwoFactorPage,
});

function TwoFactorPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [copied, setCopied] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleInputChange = (value: string, idx: number) => {
    // Only accept numbers
    if (/[^0-9]/.test(value)) return;

    const nextCode = [...code];
    nextCode[idx] = value.slice(-1); // Only take last character
    setCode(nextCode);

    // Auto-advance focus
    if (value && idx < 5) {
      inputsRef.current[idx + 1]?.focus();
    }

    // Auto-submit if complete
    if (nextCode.every(c => c !== "") && nextCode.length === 6) {
      handleVerify(nextCode.join(""));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      // Focus previous and clear
      inputsRef.current[idx - 1]?.focus();
      const nextCode = [...code];
      nextCode[idx - 1] = "";
      setCode(nextCode);
    }
  };

  const handleVerify = (enteredCode: string) => {
    setIsLoading(true);
    toast.info("Vérification du code de sécurité...");
    
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Authentification double facteur validée !");
      navigate({ to: "/dashboard", replace: true });
    }, 1500);
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText("IN-9821-0982\nIN-3941-8910\nIN-4012-7634\nIN-5109-2941");
    setCopied(true);
    toast.success("Codes de secours copiés dans le presse-papiers !");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-6 flex flex-col items-center animate-fade-in text-center">
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight">Double Facteur</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Saisissez le code temporaire généré par votre application Google Authenticator ou utilisez vos codes de secours.
        </p>
      </div>

      {showBackup ? (
        <div className="w-full space-y-4 text-left border border-dashed border-border/80 rounded-xl p-4 bg-card">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs font-semibold uppercase text-primary tracking-wider">Codes de secours (2FA)</span>
            <Button variant="ghost" size="icon" onClick={handleCopyCodes} className="h-7 w-7 text-zinc-500 hover:text-foreground">
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm font-mono text-center text-zinc-300 py-2">
            <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">IN-9821-0982</div>
            <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">IN-3941-8910</div>
            <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">IN-4012-7634</div>
            <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">IN-5109-2941</div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Chaque code est à usage unique. Conservez-les dans un gestionnaire de mots de passe.
          </p>
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => setShowBackup(false)} 
            className="w-full text-xs text-zinc-500 hover:text-foreground pt-2"
          >
            Saisir le code à 6 chiffres
          </Button>
        </div>
      ) : (
        <div className="space-y-6 w-full flex flex-col items-center">
          {/* Simulated QR Code Scanning Layout */}
          <div className="relative p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl flex items-center justify-center">
            <div className="absolute inset-0 border border-primary/20 rounded-xl pointer-events-none animate-pulse"></div>
            {/* Visual Scan guides */}
            <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-primary rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-primary rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-primary rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-primary rounded-br-lg"></div>
            <QrCode className="h-24 w-24 text-zinc-500" />
          </div>

          {/* 6 Digit Cells Input */}
          <div className="flex gap-2 justify-center w-full max-w-sm">
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputsRef.current[idx] = el; }}
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(e.target.value, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className="w-12 h-14 text-center text-xl font-bold rounded-lg border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
              />
            ))}
          </div>

          <Button
            type="button"
            onClick={() => handleVerify(code.join(""))}
            className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold shadow-[var(--glow-primary)] py-2.5 max-w-sm"
            disabled={isLoading || code.some(c => c === "")}
          >
            {isLoading ? "Vérification..." : "Vérifier le code"}
          </Button>

          <Button
            type="button"
            variant="link"
            onClick={() => setShowBackup(true)}
            className="text-xs text-zinc-500 hover:text-foreground"
          >
            Utiliser un code de secours
          </Button>
        </div>
      )}
    </div>
  );
}
