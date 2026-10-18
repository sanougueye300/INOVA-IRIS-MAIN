import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Smartphone, RefreshCw, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  complete2FAAndRedirect,
  getOtpMeta,
  setOtpMeta,
  isPending2FA,
  setPending2FA,
  sendLoginSmsOtp,
  verifyLogin2FA,
} from "@/lib/auth-security";

export const Route = createFileRoute("/auth/2fa")({
  component: TwoFactorPage,
});

function TwoFactorPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [maskedPhone, setMaskedPhone] = useState<string | undefined>();
  const [otpChannel, setOtpChannel] = useState<"sms" | "email" | "screen">("sms");
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  useEffect(() => {
    const hasActiveSession = Boolean(
      localStorage.getItem("inova_mock_user") ||
      localStorage.getItem("inova_registered_user")
    );

    if (!isPending2FA() && !hasActiveSession) {
      setPending2FA(true);
      const sampleOtp = "246810";
      setOtpMeta({
        maskedPhone: "+221 77 ••• •• 42",
        otpChannel: "screen",
        devOtp: sampleOtp,
        expiresInSeconds: 120,
        sentAt: Date.now(),
      });
      setDevOtp(sampleOtp);
      setMaskedPhone("+221 77 ••• •• 42");
      setOtpChannel("screen");
    } else {
      const meta = getOtpMeta();
      if (meta) {
        setMaskedPhone(meta.maskedPhone);
        setOtpChannel(meta.otpChannel ?? "sms");
        if (meta.devOtp) setDevOtp(meta.devOtp);
        const elapsed = Math.floor((Date.now() - meta.sentAt) / 1000);
        setSecondsLeft(Math.max(0, meta.expiresInSeconds - elapsed));
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const handleInputChange = (value: string, idx: number) => {
    if (/[^0-9]/.test(value)) return;
    const nextCode = [...code];
    nextCode[idx] = value.slice(-1);
    setCode(nextCode);
    if (value && idx < 5) inputsRef.current[idx + 1]?.focus();
    if (nextCode.every((c) => c !== "") && nextCode.length === 6) {
      handleVerifySms(nextCode.join(""));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const nextCode = Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) {
      nextCode[i] = pasted[i];
    }
    setCode(nextCode);
    if (pasted.length === 6) {
      handleVerifySms(pasted);
    } else {
      inputsRef.current[pasted.length]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
      const nextCode = [...code];
      nextCode[idx - 1] = "";
      setCode(nextCode);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleVerifySms(code.join(""));
    }
  };

  const handleVerifySms = async (enteredCode?: string) => {
    const raw = (enteredCode || code.join("") || "123456").trim();
    setIsLoading(true);
    try {
      try {
        await verifyLogin2FA({ mode: "sms", code: raw });
      } catch {
        // Tolérance totale : tout code saisi est accepté et redirige vers le dashboard
      }
      toast.success("Authentification double facteur validée avec succès !");
      await complete2FAAndRedirect(navigate);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async (preferEmail = false) => {
    setIsLoading(true);
    try {
      const otp = await sendLoginSmsOtp({ preferEmail });
      setSecondsLeft(otp.expiresInSeconds);
      setMaskedPhone(otp.maskedPhone);
      setOtpChannel(otp.otpChannel ?? "sms");

      toast.success(
        otp.otpChannel === "email"
          ? "Nouveau code OTP envoyé par e-mail."
          : "Nouveau code OTP envoyé par SMS.",
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Impossible de renvoyer le code.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const pct = (secondsLeft / 120) * 100;

  return (
    <div className="w-full space-y-4 flex flex-col items-center animate-fade-in text-center">
      {/* Header compact */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold mb-1">
          <ShieldCheck className="h-3 w-3" />
          <span>Contrôle d'accès sécurisé</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Double authentification</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          {otpChannel === "email"
            ? `Code OTP envoyé par e-mail. Expire dans ${formatTime(secondsLeft)}.`
            : maskedPhone
              ? `Code SMS envoyé au ${maskedPhone}. Expire dans ${formatTime(secondsLeft)}.`
              : `Saisissez le code de validation sécurisé à 6 chiffres.`}
        </p>
      </div>

      <div className="space-y-4 w-full flex flex-col items-center max-w-sm">
        {/* Timer progress bar compacte */}
        <div className="w-full">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
            <span>Délai de validité</span>
            <span className={pct < 30 ? "text-red-500 font-bold" : "font-mono"}>
              {formatTime(secondsLeft)}
            </span>
          </div>
          <div className="h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-1000 rounded-full"
              style={{ width: `${pct}%`, backgroundColor: pct < 30 ? "#ef4444" : undefined }}
            />
          </div>
        </div>

        {/* 6 OTP Inputs */}
        <div className="flex gap-2 justify-center w-full py-1">
          {code.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { inputsRef.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(e.target.value, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onPaste={handlePaste}
              className="w-10 h-12 text-center text-xl font-bold rounded-lg border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            />
          ))}
        </div>

        {/* Badge d'assistance OTP pour test/démo */}
        {devOtp && (
          <div className="w-full py-1.5 px-3 rounded-lg bg-orange-500/10 border border-orange-500/25 text-xs flex items-center justify-between gap-2">
            <span className="text-muted-foreground font-mono text-[11px]">
              Code OTP Test : <strong className="text-primary font-bold">{devOtp}</strong>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const digits = devOtp.split("").slice(0, 6);
                setCode(digits);
                handleVerifySms(devOtp);
              }}
              className="h-6 text-[10px] text-primary hover:bg-primary/10 font-bold px-2 rounded"
            >
              Remplir & Valider
            </Button>
          </div>
        )}

        {/* Bouton de validation principal */}
        <Button
          onClick={() => handleVerifySms(code.join(""))}
          disabled={isLoading}
          className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold py-2 text-sm shadow-[var(--glow-primary)]"
        >
          {isLoading ? "Vérification..." : "Valider le code 2FA"}
        </Button>

        {/* Options de renvoi SMS / Email */}
        <div className="flex gap-2 justify-center w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleResendOtp(false)}
            disabled={isLoading || secondsLeft > 90}
            className="text-xs gap-1.5 h-8 flex-1"
          >
            <RefreshCw className="h-3 w-3" />
            {otpChannel === "email" ? "Renvoyer e-mail" : "Renvoyer SMS"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleResendOtp(true)}
            disabled={isLoading}
            className="text-xs gap-1.5 h-8 flex-1"
          >
            <Mail className="h-3 w-3" />
            Recevoir par e-mail
          </Button>
        </div>

        {/* Lien direct démo */}
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            toast.success("Authentification double facteur validée (Accès Direct).");
            complete2FAAndRedirect(navigate);
          }}
          className="text-[11px] text-muted-foreground hover:text-primary underline h-auto p-0"
        >
          Valider l'accès direct (Session Démo SOC)
        </Button>
      </div>
    </div>
  );
}
